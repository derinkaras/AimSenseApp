// ============================================================
// step4.tsx - Set Reference (Level & Hold Steady)
// ============================================================
// Captures the baseline IMU reference for live cant/pitch tracking.
// Responsive layout adapts to portrait/landscape and all device sizes.

import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useIsFocused, useNavigation } from "@react-navigation/native";

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

// ==================== MAIN COMPONENT ====================
export default function Step4() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const wasLevel = useRef(false);
  const timeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Store selectors
  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const captureBaseline = useCalibrationStore((s) => s.captureBaseline);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);
  const safeEdges = getSafeAreaEdges(isLandscapeMode);
  const compact = isLandscapeMode;

  // Tilt level hook - only active when focused
  const { levelDeg, isLevel, rollNow, pitchNow } = useTiltLevel(
    mountOrientation,
    DEFAULT_TILT_CONFIG,
    { enabled: isFocused, updateIntervalMs: 60 }
  );

  const safe = Number.isFinite(levelDeg) ? levelDeg : 0;

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
      wasLevel.current = false;
      return () => {
        wasLevel.current = false;
        clearHapticsTimers();
      };
    }, [clearHapticsTimers])
  );

  // Haptic feedback when level is achieved
  useEffect(() => {
    if (!isFocused) return;
    clearHapticsTimers();

    if (isLevel && !wasLevel.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      timeouts.current.push(
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100)
      );
      timeouts.current.push(
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
      );
    }
    wasLevel.current = isLevel;
  }, [isLevel, isFocused, clearHapticsTimers]);

  // ==================== HANDLERS ====================
  const handleCapture = () => {
    captureBaseline(rollNow, pitchNow);
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
              title="Set Reference"
              compact={compact}
            >
              <View className={compact ? "gap-1.5" : "gap-2"}>
                <View
                  className={cn(
                    "rounded-xl bg-brand-black/40 border border-brand-green/30",
                    compact ? "p-2" : "p-3"
                  )}
                >
                  <Text
                    className={cn(
                      "text-white/90",
                      compact ? "text-[10px] leading-3.5" : "text-sm leading-5"
                    )}
                  >
                    Hold the rifle in a normal shooting position and point it forward while leveling the reference.
                  </Text>
                </View>

                <View
                  className={cn(
                    "rounded-xl bg-brand-greenDark/40 border border-brand-green/25",
                    compact ? "p-2" : "p-3"
                  )}
                >
                  <Text
                    className={cn(
                      "text-white/70",
                      compact ? "text-[10px] leading-3.5" : "text-sm leading-5"
                    )}
                  >
                    It's okay if the phone is slightly tilted in the scope adapter — this step records your setup's alignment.
                  </Text>
                </View>
              </View>
            </HeaderCard>

            {/* Level Card */}
            <View
              className={cn(
                "rounded-3xl border bg-brand-greenDark/65",
                isLevel ? "border-brand-greenLight" : "border-brand-green/45",
                compact ? "p-4" : "p-5"
              )}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white/70 text-sm">Level Offset</Text>
                  <Text
                    className={cn(
                      "text-white font-bold mt-2",
                      compact ? "text-5xl" : "text-6xl"
                    )}
                  >
                    {safe.toFixed(1)}°
                  </Text>
                </View>

                <View
                  className={cn(
                    "w-16 h-16 rounded-3xl items-center justify-center border",
                    isLevel
                      ? "bg-brand-greenLight/15 border-brand-greenLight"
                      : "bg-brand-black/40 border-brand-green/35"
                  )}
                >
                  <Image
                    source={isLevel ? icons.level : icons.tilt}
                    className="w-8 h-8"
                    resizeMode="contain"
                    style={{ tintColor: isLevel ? "#0b7f4f" : "#9ca3af" }}
                  />
                </View>
              </View>

              {/* Status Message */}
              <View
                className={cn(
                  "mt-4 px-4 py-3 rounded-2xl border",
                  isLevel
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
                  {isLevel
                    ? "Reference locked — tap Continue"
                    : "Level the rifle to set your baseline"}
                </Text>

                <Text className="text-white/70 mt-1 text-sm">
                  {isLevel
                    ? "Baseline captured. You don't need to hold this exact angle afterward."
                    : "Make small adjustments and hold steady once it reads level."}
                </Text>
              </View>

              {/* Almost there hint */}
              {!isLevel && Math.abs(safe) <= 5 && (
                <View className="mt-4 flex-row items-start">
                  <View className="w-10 h-10 rounded-2xl bg-brand-black/40 border border-brand-green/35 items-center justify-center mr-3">
                    <Image
                      source={icons.info}
                      className="w-5 h-5"
                      resizeMode="contain"
                      style={{ tintColor: "#9ca3af" }}
                    />
                  </View>
                  <Text className="flex-1 text-white/65 text-sm">
                    Almost there — keep the rifle upright, adjust slowly, then pause once it reads level.
                  </Text>
                </View>
              )}
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
                disabled={!isLevel}
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

            {!isLevel && (
              <Text className="text-white/50 text-center text-sm mt-3">
                Level the rifle to continue
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
