// ============================================================
// step1.tsx - Phone Orientation Selection
// ============================================================
// User selects how their phone is mounted on the scope.
// Responsive layout for both portrait and landscape.

import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCalibrationStore,
  selectPendingOrientation,
  MountOrientation,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step1";

const ORIENTATION_OPTIONS: { key: MountOrientation; label: string; sub: string; icon: any }[] = [
  { key: "portrait", label: "Portrait", sub: "Normal upright", icon: icons.phonePortrait },
  { key: "landscape-left", label: "Landscape (Left)", sub: "Rotated left", icon: icons.phoneLandscapeLeft },
  { key: "landscape-right", label: "Landscape (Right)", sub: "Rotated right", icon: icons.phoneLandscapeRight },
];

export default function Step1() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const { width, height } = useWindowDimensions();

  // Detect landscape based on screen dimensions (before user selects orientation)
  const isLandscapeMode = width > height;

  useFocusEffect(
      useCallback(() => {
        console.log(SCREEN_ID);
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const pendingOrientation = useCalibrationStore(selectPendingOrientation);
  const setPending = useCalibrationStore((s) => s.setPendingOrientation);
  const confirmOrientation = useCalibrationStore((s) => s.confirmOrientation);
  const reset = useCalibrationStore((s) => s.resetCalibration);
  const navigation = useNavigation();

  const handleNext = async () => {
    await confirmOrientation();
    router.push("/(calibration)/step2");
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

  // Responsive sizing
  const containerPadding = isLandscapeMode ? "px-4" : "px-6";
  const headerPadding = isLandscapeMode ? "p-2" : "p-5";
  const titleSize = isLandscapeMode ? "text-lg" : "text-2xl";
  const subtitleSize = isLandscapeMode ? "text-xs" : "text-base";
  const optionPadding = isLandscapeMode ? "px-3 py-1.5" : "px-4 py-4";
  const optionIconSize = isLandscapeMode ? "size-8" : "size-12";
  const optionIconInner = isLandscapeMode ? "w-4 h-4" : "w-7 h-7";
  const optionTitleSize = isLandscapeMode ? "text-sm" : "text-lg";
  const optionSubSize = isLandscapeMode ? "text-[10px]" : "text-sm";
  const buttonPadding = isLandscapeMode ? "py-2" : "py-5";
  const buttonTextSize = isLandscapeMode ? "text-base" : "text-xl";
  const cancelPadding = isLandscapeMode ? "py-1.5" : "py-4";
  const cancelTextSize = isLandscapeMode ? "text-xs" : "text-base";
  const optionGap = isLandscapeMode ? 6 : 12;
  const headerIconSize = isLandscapeMode ? "size-7" : "size-11";
  const headerIconInner = isLandscapeMode ? "w-4 h-4" : "w-6 h-6";

  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscapeMode) safeAreaEdges.push("left", "right");

  // CTA buttons component - reused in both layouts
  const CTAButtons = (
      <View style={{ paddingBottom: isLandscapeMode ? 0 : bottomPadding }}>
        <Pressable
            onPress={handleNext}
            className={`rounded-xl ${buttonPadding} items-center bg-brand-greenLight border border-brand-green/60`}
        >
          <Text className={`text-white ${buttonTextSize} font-semibold`}>Continue</Text>
        </Pressable>

        <Pressable
            onPress={handleCancel}
            className={`mt-2 ${cancelPadding} rounded-xl items-center bg-brand-black/50 border border-brand-green/35`}
        >
          <Text className={`text-white/90 ${cancelTextSize} font-semibold`}>Cancel</Text>
        </Pressable>
      </View>
  );

  return (
      <View className="flex-1 bg-brand-black">
        {shouldRenderCamera && (
            <CameraView style={StyleSheet.absoluteFill} facing="back" />
        )}

        <SafeAreaView className="flex-1" edges={safeAreaEdges}>
          <View className={`flex-1 ${containerPadding} pt-2`}>
            {isLandscapeMode ? (
                // LANDSCAPE: Single column, elements sized to fill screen
                <View className="flex-1" style={{ paddingBottom: bottomPadding }}>
                  {/* Header */}
                  <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                    <View className="flex-row items-center">
                      <View className={`${headerIconSize} rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-2`}>
                        <Image source={icons.compass} className={headerIconInner} resizeMode="contain" tintColor="#0b7f4f" />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-white ${titleSize} font-semibold`}>Phone Orientation</Text>
                        <Text className={`text-white/70 ${subtitleSize}`}>
                          Choose how your phone is mounted.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Options - flex to fill available space */}
                  <View className="flex-1 my-2" style={{ gap: optionGap }}>
                    {ORIENTATION_OPTIONS.map((option) => {
                      const selected = pendingOrientation === option.key;

                      return (
                          <Pressable
                              key={option.key}
                              onPress={() => setPending(option.key)}
                              className={[
                                `flex-1 rounded-3xl px-3 flex-row items-center border`,
                                selected
                                    ? "bg-brand-greenDark/80 border-brand-greenLight"
                                    : "bg-brand-black/60 border-brand-green/35",
                              ].join(" ")}
                          >
                            <View
                                className={[
                                  `${optionIconSize} rounded-2xl items-center justify-center border mr-2`,
                                  selected ? "bg-brand-black/50 border-brand-greenLight" : "bg-brand-black/40 border-brand-green/40",
                                ].join(" ")}
                            >
                              <Image
                                  source={option.icon}
                                  className={optionIconInner}
                                  resizeMode="contain"
                                  tintColor={selected ? "#0b7f4f" : "#9ca3af"}
                              />
                            </View>

                            <View className="flex-1">
                              <Text className={`text-white ${optionTitleSize} font-semibold`}>{option.label}</Text>
                              <Text className={`text-white/60 ${optionSubSize}`}>{option.sub}</Text>
                            </View>

                            <View
                                className={[
                                  "size-4 rounded-full border items-center justify-center",
                                  selected ? "border-brand-greenLight bg-brand-greenLight/15" : "border-brand-green/40 bg-transparent",
                                ].join(" ")}
                            >
                              {selected && (
                                  <Image source={icons.check} className="w-2.5 h-2.5" resizeMode="contain" tintColor="#0b7f4f" />
                              )}
                            </View>
                          </Pressable>
                      );
                    })}
                  </View>

                  {/* CTAs - stacked vertically */}
                  <Pressable
                      onPress={handleNext}
                      className={`rounded-xl ${buttonPadding} items-center bg-brand-greenLight border border-brand-green/60`}
                  >
                    <Text className={`text-white ${buttonTextSize} font-semibold`}>Continue</Text>
                  </Pressable>

                  <Pressable
                      onPress={handleCancel}
                      className={`mt-2 ${cancelPadding} rounded-xl items-center bg-brand-black/50 border border-brand-green/35`}
                  >
                    <Text className={`text-white/90 ${cancelTextSize} font-semibold`}>Cancel</Text>
                  </Pressable>
                </View>
            ) : (
                // PORTRAIT: Header fixed, options scroll, CTAs fixed at bottom
                <>
                  {/* Header */}
                  <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                    <View className="flex-row items-center">
                      <View className={`${headerIconSize} rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3`}>
                        <Image source={icons.compass} className={headerIconInner} resizeMode="contain" tintColor="#0b7f4f" />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-white ${titleSize} font-semibold`}>Phone Orientation</Text>
                        <Text className={`text-white/80 mt-2 ${subtitleSize}`}>
                          Choose how your phone is mounted. The screen will rotate after you press Continue.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Options ScrollView */}
                  <ScrollView
                      className="mt-3 flex-1"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ gap: optionGap, paddingBottom: 16 }}
                  >
                    {ORIENTATION_OPTIONS.map((option) => {
                      const selected = pendingOrientation === option.key;

                      return (
                          <Pressable
                              key={option.key}
                              onPress={() => setPending(option.key)}
                              className={[
                                `rounded-3xl ${optionPadding} flex-row items-center border`,
                                selected
                                    ? "bg-brand-greenDark/80 border-brand-greenLight"
                                    : "bg-brand-black/60 border-brand-green/35",
                              ].join(" ")}
                          >
                            <View
                                className={[
                                  `${optionIconSize} rounded-2xl items-center justify-center border mr-4`,
                                  selected ? "bg-brand-black/50 border-brand-greenLight" : "bg-brand-black/40 border-brand-green/40",
                                ].join(" ")}
                            >
                              <Image
                                  source={option.icon}
                                  className={optionIconInner}
                                  resizeMode="contain"
                                  tintColor={selected ? "#0b7f4f" : "#9ca3af"}
                              />
                            </View>

                            <View className="flex-1">
                              <Text className={`text-white ${optionTitleSize} font-semibold`}>{option.label}</Text>
                              <Text className={`text-white/70 mt-0.5 ${optionSubSize}`}>{option.sub}</Text>
                            </View>

                            <View
                                className={[
                                  "size-6 rounded-full border items-center justify-center",
                                  selected ? "border-brand-greenLight bg-brand-greenLight/15" : "border-brand-green/40 bg-transparent",
                                ].join(" ")}
                            >
                              {selected && (
                                  <Image source={icons.check} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />
                              )}
                            </View>
                          </Pressable>
                      );
                    })}

                    {/* Tip */}
                    <View className={`rounded-3xl bg-brand-black/40 border border-brand-green/25 ${optionPadding}`}>
                      <View className="flex-row items-start">
                        <View className="size-10 rounded-2xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mr-3">
                          <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-sm">Tip</Text>
                          <Text className="text-white/70 mt-1 text-sm">
                            Pick the orientation that matches how the phone sits in your mount. You can change this later.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  {/* CTAs fixed at bottom for portrait */}
                  {CTAButtons}
                </>
            )}
          </View>
        </SafeAreaView>
      </View>
  );
}