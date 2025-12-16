import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
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
import { CommonActions, useNavigation } from "@react-navigation/native";

export default function Step2() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const wasLevel = useRef(false);

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const captureBaseline = useCalibrationStore((s) => s.captureBaseline);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  // Hook returns raw roll/pitch for baseline capture
  const { levelDeg, isLevel, rollNow, pitchNow } = useTiltLevel(
      mountOrientation,
      DEFAULT_TILT_CONFIG
  );

  const isLandscapeMode = isLandscape(mountOrientation);
  const safe = Number.isFinite(levelDeg) ? levelDeg : 0;
  const navigation = useNavigation();

  // Haptic feedback when level is achieved (≤ 3° and stable)
  useEffect(() => {
    if (isLevel && !wasLevel.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    }
    wasLevel.current = isLevel;
  }, [isLevel]);

  const handleCapture = () => {
    // Store raw IMU roll and pitch as baseline reference
    captureBaseline(rollNow, pitchNow);
    router.push("/(calibration)/step3");
  };

  const handleBack = async () => {
    await reset();
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
  const scrollPadding = isLandscapeMode ? 140 : 240;
  const titleSize = isLandscapeMode ? "text-xl" : "text-2xl";
  const subtitleSize = isLandscapeMode ? "text-sm" : "text-base";
  const subtitleMargin = isLandscapeMode ? "mt-1" : "mt-2";

  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscapeMode) safeAreaEdges.push("left", "right");

  return (
      <View className="flex-1 bg-brand-black">
        {cameraEnabled && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

        <SafeAreaView className="flex-1" edges={safeAreaEdges}>
          <View className={`flex-1 ${isLandscapeMode ? "px-4" : "px-6"} pt-4`}>

            {/* Header */}
            <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
              <View className="flex-row items-center">
                <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                  <Image
                      source={icons.compass}
                      className="w-6 h-6"
                      resizeMode="contain"
                      tintColor="#0b7f4f"
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-white ${titleSize} font-semibold`}>
                    Step 2: Set Baseline
                  </Text>
                  <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                    Hold the rifle upright and pointing forward. Level it within ±3°, then hold steady.
                  </Text>
                </View>
              </View>
            </View>

            {/* Level Display */}
            <ScrollView
                className={headerMargin}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: scrollPadding }}
            >
              <View
                  className={[
                    "rounded-3xl border bg-brand-greenDark/65",
                    isLevel ? "border-brand-greenLight" : "border-brand-green/45",
                    containerPadding,
                  ].join(" ")}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white/70 text-sm">
                      Level Offset
                    </Text>
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
                    {isLevel ? "Baseline ready — tap Continue" : "Adjust until level…"}
                  </Text>
                  <Text className="text-white/70 mt-1 text-sm">
                    {isLevel
                        ? "We’ll save this as your baseline reference for pitch and cant."
                        : "Small adjustments are enough. Once level, pause briefly to lock it in."}
                  </Text>
                </View>

                {/* Debug info */}
                {isLevel && (
                    <View className="mt-4 px-4 py-3 rounded-2xl bg-brand-black/30 border border-brand-green/20">
                      <Text className="text-white/50 text-xs font-mono">
                        Baseline to capture:
                      </Text>
                      <Text className="text-white/70 text-xs font-mono mt-1">
                        roll0: {rollNow.toFixed(3)}°  |  pitch0: {pitchNow.toFixed(3)}°
                      </Text>
                    </View>
                )}

                {!isLevel && Math.abs(safe) <= 5 && (
                    <View className="mt-4 flex-row items-start">
                      <View className="size-10 rounded-2xl bg-brand-black/40 border border-brand-green/35 items-center justify-center mr-3">
                        <Image
                            source={icons.info}
                            className="w-5 h-5"
                            resizeMode="contain"
                            tintColor="#9ca3af"
                        />
                      </View>
                      <Text className="flex-1 text-white/65 text-sm">
                        Almost there — keep the rifle upright, make small adjustments, then hold steady.
                      </Text>
                    </View>
                )}
              </View>
            </ScrollView>

            {/* CTAs */}
            <View style={{ paddingBottom: bottomPadding }} className="mt-auto">
              <Pressable
                  onPress={handleCapture}
                  disabled={!isLevel}
                  className={[
                    "rounded-2xl items-center border",
                    isLandscapeMode ? "py-4" : "py-5",
                    isLevel
                        ? "bg-brand-greenLight border-brand-green/60"
                        : "bg-brand-black/50 border-brand-green/30",
                  ].join(" ")}
              >
                <Text className={`text-white font-semibold ${isLandscapeMode ? "text-lg" : "text-xl"}`}>
                  {isLevel ? "Continue" : "Level the rifle to continue"}
                </Text>
              </Pressable>

              <View className="flex-row mt-3 gap-3">
                <Pressable
                    onPress={handleBack}
                    className={[
                      "flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35",
                      isLandscapeMode ? "py-3" : "py-4",
                    ].join(" ")}
                >
                  <Text className={`text-white/90 font-semibold ${isLandscapeMode ? "text-sm" : "text-base"}`}>
                    Back
                  </Text>
                </Pressable>

                <Pressable
                    onPress={handleCancel}
                    className={[
                      "flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35",
                      isLandscapeMode ? "py-3" : "py-4",
                    ].join(" ")}
                >
                  <Text className={`text-white/90 font-semibold ${isLandscapeMode ? "text-sm" : "text-base"}`}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>

          </View>
        </SafeAreaView>
      </View>
  );
}
