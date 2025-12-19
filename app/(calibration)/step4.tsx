// ============================================================
// step4.tsx - Set Reference (Level & Hold Steady)
// ============================================================
// Captures the baseline IMU reference for live cant/pitch tracking.

import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import {
  useCalibrationStore,
  selectMountOrientation,
  isLandscape,
  DEFAULT_TILT_CONFIG,
} from "@/app/calibration/exports";
import { useTiltLevel } from "@/app/hooks/useTiltLevel";
import icons from "@/app/constants/icons";
import { CommonActions, useIsFocused, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step4";

export default function Step4() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const isFocused = useIsFocused();

  useFocusEffect(
      useCallback(() => {
        console.log(SCREEN_ID);
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  const insets = useSafeAreaInsets();
  const wasLevel = useRef(false);

  const timeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const clearHapticsTimers = useCallback(() => {
    timeouts.current.forEach((id) => clearTimeout(id));
    timeouts.current = [];
  }, []);

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const captureBaseline = useCalibrationStore((s) => s.captureBaseline);
  const reset = useCalibrationStore((s) => s.resetCalibration);
  const navigation = useNavigation();

  // Sensor subscription stops when Step4 is not focused
  const { levelDeg, isLevel, rollNow, pitchNow } = useTiltLevel(
      mountOrientation,
      DEFAULT_TILT_CONFIG,
      { enabled: isFocused, updateIntervalMs: 60 }
  );

  const isLandscapeMode = isLandscape(mountOrientation);
  const safe = Number.isFinite(levelDeg) ? levelDeg : 0;

  // Ensure haptics never fire after leaving Step4
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

  const handleCapture = () => {
    captureBaseline(rollNow, pitchNow);
    router.push("/(calibration)/step5");
  };

  const handleBack = () => {
    router.back();
  };

  const handleCancel = async () => {
    await reset();
    navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        })
    );
  };

  // Layout tuning
  const angleFontSize = isLandscapeMode ? "text-5xl" : "text-6xl";
  const containerPadding = isLandscapeMode ? "p-4" : "p-6";
  const headerPadding = isLandscapeMode ? "p-3" : "p-5";
  const headerMargin = isLandscapeMode ? "mt-3" : "mt-6";
  const scrollPadding = isLandscapeMode ? 120 : 240;

  const titleSize = isLandscapeMode ? "text-xl" : "text-2xl";
  const subtitleSize = isLandscapeMode ? "text-xs" : "text-base";

  // Chip sizing (landscape = compact)
  const chipPad = isLandscapeMode ? "px-3 py-2" : "px-4 py-3";
  const chipGapTop = isLandscapeMode ? "mt-3" : "mt-4";
  const chipGapBetween = isLandscapeMode ? "mb-1.5" : "mb-2";
  const chipLeading = isLandscapeMode ? "leading-4" : "leading-5";
  const chipRadius = isLandscapeMode ? "rounded-xl" : "rounded-2xl";

  // Icon button sizes
  const buttonSize = isLandscapeMode ? "size-11" : "size-14";
  const iconSize = isLandscapeMode ? "w-5 h-5" : "w-6 h-6";

  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscapeMode) safeAreaEdges.push("left", "right");

  return (
      <View className="flex-1 bg-brand-black">
        {shouldRenderCamera && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

        <SafeAreaView className="flex-1" edges={safeAreaEdges}>
          <View className={`flex-1 ${isLandscapeMode ? "px-4" : "px-6"} pt-4`}>
            <ScrollView
                className={headerMargin}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: scrollPadding }}
            >
              {/* Header */}
              <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60 my-2`}>
                {/* Title row: icon + title (ONLY this row is horizontal) */}
                <View className="flex-row items-center">
                  <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center">
                    <Image
                        source={icons.compass}
                        className="w-6 h-6"
                        resizeMode="contain"
                        tintColor="#0b7f4f"
                    />
                  </View>

                  <Text className={`text-white ${titleSize} font-semibold ml-3`}>
                    Set Reference
                  </Text>
                </View>

                {/* Everything below is full-width (no indent, no columns) */}
                <View className={chipGapTop}>
                  <View className={`${chipRadius} bg-brand-black/40 border border-brand-green/30 ${chipPad} ${chipGapBetween}`}>
                    <Text className={`text-white/90 ${subtitleSize} ${chipLeading}`}>
                      Hold the rifle in a normal shooting position and point it forward while leveling the reference.
                    </Text>
                  </View>

                  <View className={`${chipRadius} bg-brand-greenDark/40 border border-brand-green/25 ${chipPad}`}>
                    <Text className={`text-white/70 ${subtitleSize} ${chipLeading}`}>
                      It’s okay if the phone is slightly tilted in the scope adapter — this step records your setup’s alignment.
                      After this, AimSense tracks changes relative to this baseline, so movement and tilt are expected.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Level Card */}
              <View
                  className={[
                    "rounded-3xl border bg-brand-greenDark/65",
                    isLevel ? "border-brand-greenLight" : "border-brand-green/45",
                    containerPadding,
                  ].join(" ")}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white/70 text-sm">Level Offset</Text>
                    <Text className={`text-white font-bold ${angleFontSize} mt-2`}>
                      {safe.toFixed(1)}°
                    </Text>
                  </View>

                  <View
                      className={[
                        "size-16 rounded-3xl items-center justify-center border",
                        isLevel
                            ? "bg-brand-greenLight/15 border-brand-greenLight"
                            : "bg-brand-black/40 border-brand-green/35",
                      ].join(" ")}
                  >
                    <Image
                        source={isLevel ? icons.level : icons.tilt}
                        className="w-8 h-8"
                        resizeMode="contain"
                        tintColor={isLevel ? "#0b7f4f" : "#9ca3af"}
                    />
                  </View>
                </View>

                <View
                    className={[
                      "mt-5 px-4 py-3 rounded-2xl border",
                      isLevel
                          ? "bg-brand-greenLight/10 border-brand-greenLight/70"
                          : "bg-brand-black/30 border-brand-green/30",
                    ].join(" ")}
                >
                  <Text className={`text-white font-semibold ${isLandscapeMode ? "text-base" : "text-lg"}`}>
                    {isLevel ? "Reference locked — tap Continue" : "Level the rifle to set your baseline"}
                  </Text>

                  <Text className="text-white/70 mt-1 text-sm">
                    {isLevel
                        ? "Baseline captured. You don’t need to hold this exact angle afterward."
                        : "Make small adjustments and hold steady once it reads level."}
                  </Text>
                </View>

                {!isLevel && Math.abs(safe) <= 5 && (
                    <View className="mt-4 flex-row items-start">
                      <View className="size-10 rounded-2xl bg-brand-black/40 border border-brand-green/35 items-center justify-center mr-3">
                        <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
                      </View>
                      <Text className="flex-1 text-white/65 text-sm">
                        Almost there — keep the rifle upright, adjust slowly, then pause once it reads level.
                      </Text>
                    </View>
                )}
              </View>
            </ScrollView>

            {/* CTAs - Icon Buttons */}
            <View className="py-2">
              <View className="flex-row items-center justify-center gap-4">
                <Pressable
                    onPress={handleBack}
                    className={`${buttonSize} rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35`}
                >
                  <Image source={icons.chevronLeft} className={iconSize} resizeMode="contain" tintColor="#e5e5e5" />
                </Pressable>

                <Pressable
                    onPress={handleCapture}
                    disabled={!isLevel}
                    className={`${buttonSize} rounded-xl items-center justify-center border ${
                        isLevel ? "bg-brand-greenLight border-brand-green/60" : "bg-brand-black/30 border-brand-green/30"
                    }`}
                >
                  <Image
                      source={icons.chevronRight}
                      className={iconSize}
                      resizeMode="contain"
                      tintColor={isLevel ? "#ffffff" : "#666666"}
                  />
                </Pressable>

                <Pressable
                    onPress={handleCancel}
                    className={`${buttonSize} rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35`}
                >
                  <Image source={icons.cancel} className={iconSize} resizeMode="contain" tintColor="#e5e5e5" />
                </Pressable>
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
