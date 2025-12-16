// ============================================================
// step1.tsx - ALTERNATIVE APPROACH
// ============================================================
// Each screen registers itself when focused, and only renders
// its camera when it's the active screen. This guarantees only
// ONE camera instance is rendering at any time.

import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
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

  // ============================================================
  // KEY: Get context and register this screen when focused
  // ============================================================
  const { activeScreen, setActiveScreen } = useCameraContext();

  useFocusEffect(
      useCallback(() => {
        setActiveScreen(SCREEN_ID);
        return () => {
        };
      }, [setActiveScreen])
  );

  // Only render camera if this is the active screen
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

  return (
      <View className="flex-1 bg-brand-black">
        {/* Only renders when this is the active screen */}
        {shouldRenderCamera && (
            <CameraView style={StyleSheet.absoluteFill} facing="back" />
        )}

        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          <View className="flex-1 px-6 pt-4">
            {/* Header */}
            <View className="rounded-3xl p-5 bg-brand-greenDark/70 border border-brand-green/60">
              <View className="flex-row items-center">
                <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                  <Image source={icons.compass} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-2xl font-semibold">Step 1: Phone Orientation</Text>
                  <Text className="text-white/80 mt-2 text-base">
                    Choose how your phone is mounted. The screen will rotate after you press Continue.
                  </Text>
                </View>
              </View>
            </View>

            {/* Options */}
            <ScrollView
                className="mt-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 180 }}
            >
              {ORIENTATION_OPTIONS.map((option) => {
                const selected = pendingOrientation === option.key;

                return (
                    <Pressable
                        key={option.key}
                        onPress={() => setPending(option.key)}
                        className={[
                          "rounded-3xl px-4 py-4 flex-row items-center border",
                          selected
                              ? "bg-brand-greenDark/80 border-brand-greenLight"
                              : "bg-brand-black/60 border-brand-green/35",
                        ].join(" ")}
                    >
                      <View
                          className={[
                            "size-12 rounded-2xl items-center justify-center border mr-4",
                            selected ? "bg-brand-black/50 border-brand-greenLight" : "bg-brand-black/40 border-brand-green/40",
                          ].join(" ")}
                      >
                        <Image
                            source={option.icon}
                            className="w-7 h-7"
                            resizeMode="contain"
                            tintColor={selected ? "#0b7f4f" : "#9ca3af"}
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-white text-lg font-semibold">{option.label}</Text>
                        <Text className="text-white/70 mt-0.5 text-sm">{option.sub}</Text>
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
              <View className="rounded-3xl bg-brand-black/40 border border-brand-green/25 px-4 py-4">
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

            {/* CTAs */}
            <View style={{ paddingBottom: bottomPadding }} className="mt-auto">
              <Pressable
                  onPress={handleNext}
                  className="rounded-2xl py-5 items-center bg-brand-greenLight border border-brand-green/60"
              >
                <Text className="text-white text-xl font-semibold">Continue</Text>
              </Pressable>

              <Pressable
                  onPress={handleCancel}
                  className="mt-3 py-4 rounded-2xl items-center bg-brand-black/50 border border-brand-green/35"
              >
                <Text className="text-white/90 text-base font-semibold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
  );
}