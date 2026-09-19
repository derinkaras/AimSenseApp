// ============================================================
// step4.tsx - Capture Baseline Reference
// ============================================================
// Captures the baseline IMU reference when the RIFLE is level.
//
// IMPORTANT: We capture whatever angles the PHONE reads when the
// RIFLE is held in a level shooting position. The phone may not
// read 0° due to mount adapter alignment - that's expected and fine.
// This step records the relationship between phone angles and rifle angles.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useIsFocused, useNavigation } from "expo-router/react-navigation";

import {
  useCalibrationStore,
  selectMountOrientation,
  isLandscape,
  DEFAULT_TILT_CONFIG,
} from "@/app/calibration/exports";
import { useTiltLevel } from "@/app/hooks/useTiltLevel";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, getSafeAreaEdges } from "../calibration/exports/styles";
import { HeaderCard, IconButton } from "../calibration/exports/components";

const SCREEN_ID = "step4";

// Stability config for baseline capture
const BASELINE_CONFIG = {
  ...DEFAULT_TILT_CONFIG,
  stabilityThresholdDeg: 0.3,  // Very still
  stabilityMs: 1000,           // Hold for 1 second
};

// ==================== MAIN COMPONENT ====================
export default function Step4() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const wasStable = useRef(false);
  const timeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Store selectors
  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const captureBaseline = useCalibrationStore((s) => s.captureBaseline);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);
  const safeEdges = getSafeAreaEdges(isLandscapeMode);
  const compact = isLandscapeMode;

  // Tilt level hook - use isStable for baseline capture (not isLevel)
  const { levelDeg, isStable, rollNow, pitchNow } = useTiltLevel(
      mountOrientation,
      BASELINE_CONFIG,
      { enabled: isFocused, updateIntervalMs: 50 }
  );

  // Focus effect
  useFocusEffect(
      useCallback(() => {
        console.log(SCREEN_ID);
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  // Clear haptic timers
  const clearHapticsTimers = useCallback(() => {
    timeouts.current.forEach((id) => clearTimeout(id));
    timeouts.current = [];
  }, []);

  // Reset refs on focus change
  useFocusEffect(
      useCallback(() => {
        wasStable.current = false;
        return () => {
          wasStable.current = false;
          clearHapticsTimers();
        };
      }, [clearHapticsTimers])
  );

  // Haptic feedback when stability is achieved
  useEffect(() => {
    if (!isFocused) return;
    clearHapticsTimers();

    if (isStable && !wasStable.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      timeouts.current.push(
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100)
      );
      timeouts.current.push(
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
      );
    }
    wasStable.current = isStable;
  }, [isStable, isFocused, clearHapticsTimers]);

  // ==================== HANDLERS ====================
  const handleCapture = () => {
    // Ensure we have valid IMU values before capturing
    const safeRoll = typeof rollNow === 'number' && Number.isFinite(rollNow) ? rollNow : 0;
    const safePitch = typeof pitchNow === 'number' && Number.isFinite(pitchNow) ? pitchNow : 0;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    captureBaseline(safeRoll, safePitch);
    router.push("/(calibration)/step5");
  };

  const handleBack = () => router.back();

  const handleCancel = async () => {
    await reset();
    navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        })
    );
  };

  // ==================== RENDER ====================
  return (
      <View className="flex-1 bg-brand-black">
        {/* Camera Background */}
        {shouldRenderCamera && (
            <CameraView style={StyleSheet.absoluteFill} facing="back" />
        )}

        <SafeAreaView className="flex-1" edges={safeEdges}>
          <View className={cn("flex-1 pt-3", compact ? "px-4" : "px-5")}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  gap: compact ? 12 : 16,
                  paddingBottom: compact ? 80 : 120,
                }}
            >
              {/* Header */}
              <HeaderCard
                  icon={icons.compass}
                  title="Capture Baseline"
                  compact={compact}
              >
                <View className={compact ? "gap-1.5" : "gap-2"}>
                  {/* Main instruction - what to do */}
                  <View
                      className={cn(
                          "rounded-xl bg-brand-greenLight/15 border border-brand-greenLight/40",
                          compact ? "p-2.5" : "p-3"
                      )}
                  >
                    <Text
                        className={cn(
                            "text-white font-semibold",
                            compact ? "text-xs" : "text-sm"
                        )}
                    >
                      Hold your rifle perfectly level and steady
                    </Text>
                    <Text
                        className={cn(
                            "text-white/70 mt-1",
                            compact ? "text-[10px] leading-3.5" : "text-xs leading-4"
                        )}
                    >
                      Point at a distant target on the horizon. Use a bubble level on your rifle if you have one.
                    </Text>
                  </View>

                  {/* Why this matters */}
                  <View
                      className={cn(
                          "rounded-xl bg-brand-black/40 border border-brand-green/30",
                          compact ? "p-2" : "p-3"
                      )}
                  >
                    <Text
                        className={cn(
                            "text-white/80",
                            compact ? "text-[10px] leading-3.5" : "text-xs leading-4"
                        )}
                    >
                      This captures your mount's alignment. The phone angle doesn't need to be zero — we're recording what "level rifle" looks like to your specific setup.
                    </Text>
                  </View>
                </View>
              </HeaderCard>

              {/* Stability Card */}
              <View
                  className={cn(
                      "rounded-3xl border bg-brand-greenDark/65",
                      isStable ? "border-brand-greenLight" : "border-brand-green/45",
                      compact ? "p-4" : "p-5"
                  )}
              >
                {/* Status Icon and Indicator */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white/70 text-sm">
                      {isStable ? "Ready to Capture" : "Waiting for Steady Hold"}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <View
                          className={cn(
                              "w-4 h-4 rounded-full mr-3",
                              isStable ? "bg-brand-greenLight" : "bg-yellow-500"
                          )}
                      />
                      <Text
                          className={cn(
                              "text-white font-bold",
                              compact ? "text-2xl" : "text-3xl"
                          )}
                      >
                        {isStable ? "STEADY" : "HOLD STILL..."}
                      </Text>
                    </View>
                  </View>

                  <View
                      className={cn(
                          "w-16 h-16 rounded-3xl items-center justify-center border",
                          isStable
                              ? "bg-brand-greenLight/15 border-brand-greenLight"
                              : "bg-brand-black/40 border-brand-green/35"
                      )}
                  >
                    <Image
                        source={isStable ? icons.check : icons.target}
                        className="w-8 h-8"
                        resizeMode="contain"
                        style={{ tintColor: isStable ? "#22c55e" : "#9ca3af" }}
                    />
                  </View>
                </View>

                {/* Status Message */}
                <View
                    className={cn(
                        "mt-4 px-4 py-3 rounded-2xl border",
                        isStable
                            ? "bg-brand-greenLight/10 border-brand-greenLight/70"
                            : "bg-brand-black/30 border-brand-green/30"
                    )}
                >
                  <Text
                      className={cn(
                          "text-white font-semibold",
                          compact ? "text-sm" : "text-base"
                      )}
                  >
                    {isStable
                        ? "✓ Baseline ready — tap Continue"
                        : "Keep the rifle still for 1 second"}
                  </Text>

                  <Text className="text-white/70 mt-1 text-sm">
                    {isStable
                        ? "Your mount's reference angles have been captured."
                        : "Make sure the rifle is level and pointed at the horizon."}
                  </Text>
                </View>

                {/* Checklist */}
                <View className={cn("mt-4", compact ? "gap-2" : "gap-3")}>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-brand-black/40 border border-brand-green/40 items-center justify-center mr-3">
                      <Text className="text-brand-greenLight text-xs">1</Text>
                    </View>
                    <Text className={cn("text-white/80 flex-1", compact ? "text-xs" : "text-sm")}>
                      Rifle is level (not tilted left or right)
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-brand-black/40 border border-brand-green/40 items-center justify-center mr-3">
                      <Text className="text-brand-greenLight text-xs">2</Text>
                    </View>
                    <Text className={cn("text-white/80 flex-1", compact ? "text-xs" : "text-sm")}>
                      Barrel pointed at horizon (not up or down)
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 rounded-full bg-brand-black/40 border border-brand-green/40 items-center justify-center mr-3">
                      <Text className="text-brand-greenLight text-xs">3</Text>
                    </View>
                    <Text className={cn("text-white/80 flex-1", compact ? "text-xs" : "text-sm")}>
                      Holding steady (not moving)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Info tip */}
              <View
                  className={cn(
                      "rounded-xl bg-brand-black/40 border border-brand-green/25",
                      compact ? "p-2.5" : "p-3"
                  )}
              >
                <View className="flex-row items-start">
                  <View className="w-8 h-8 rounded-lg bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mr-2.5">
                    <Image
                        source={icons.info}
                        className="w-4 h-4"
                        resizeMode="contain"
                        style={{ tintColor: "#9ca3af" }}
                    />
                  </View>
                  <Text className={cn("flex-1 text-white/60", compact ? "text-[10px] leading-3.5" : "text-xs leading-4")}>
                    Don't worry if the phone isn't perfectly flat in the mount. This step learns your specific setup so the app can correctly detect when your rifle is canted or angled during hunting.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Navigation CTAs */}
            <View className={compact ? "py-2" : "py-3"}>
              <View className="flex-row items-center justify-center gap-4">
                <IconButton
                    icon={icons.chevronLeft}
                    onPress={handleBack}
                    size={compact ? "sm" : "md"}
                    variant="secondary"
                />

                <IconButton
                    icon={icons.chevronRight}
                    onPress={handleCapture}
                    disabled={!isStable || typeof rollNow !== 'number' || typeof pitchNow !== 'number'}
                    size={compact ? "sm" : "md"}
                    variant="primary"
                    tintColor="#ffffff"
                />

                <IconButton
                    icon={icons.cancel}
                    onPress={handleCancel}
                    size={compact ? "sm" : "md"}
                    variant="secondary"
                />
              </View>

              {!isStable && (
                  <Text className="text-white/50 text-center text-sm mt-3">
                    Hold rifle level and steady to continue
                  </Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
  );
}