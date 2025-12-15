import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCalibrationStore,
  selectMountOrientation,
  getOrientationLabel,
  isLandscape,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";

export default function Step3() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const levelZeroRollDeg = useCalibrationStore((s) => s.levelZeroRollDeg);
  const finishCalibration = useCalibrationStore((s) => s.finishCalibration);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);

  const handleConfirm = async () => {
    await finishCalibration();
    navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "(tabs)" }],
        })
    );
  };

  const handleBack = () => router.back();

  const handleCancel = async () => {
    await reset();
    router.replace("/(tabs)/Home");
  };

  // Adjust sizing for landscape
  const headerPadding = isLandscapeMode ? "p-3" : "p-5";
  const titleSize = isLandscapeMode ? "text-xl" : "text-2xl";
  const subtitleSize = isLandscapeMode ? "text-sm" : "text-base";
  const subtitleMargin = isLandscapeMode ? "mt-1" : "mt-2";

  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscapeMode) safeAreaEdges.push("left", "right");

  // Right column width (clamped)
  const sideCtaWidth = isLandscapeMode
      ? Math.min(320, Math.max(240, Math.floor(width * 0.34)))
      : 0;

  const bottomPadding = Math.max(insets.bottom, 8);

  return (
      <View className="flex-1 bg-brand-black">
        {cameraEnabled && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

        <SafeAreaView className="flex-1" edges={safeAreaEdges}>
          {/* Portrait: original single column */}
          {!isLandscapeMode ? (
              <View className="flex-1 px-6 pt-4">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 170 + bottomPadding }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                  {/* Header */}
                  <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                    <View className="flex-row items-center">
                      <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                        <Image source={icons.check} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-white ${titleSize} font-semibold`}>Step 3: Confirm</Text>
                        <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                          Review your calibration settings before saving.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Summary */}
                  <View className="mt-6 gap-4">
                    <View className="rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 p-5">
                      <View className="flex-row items-center">
                        <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                          <Image source={icons.phonePortrait} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white/70 text-sm">Mount Orientation</Text>
                          <Text className="text-white text-xl font-semibold mt-1">
                            {getOrientationLabel(mountOrientation)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 p-5">
                      <View className="flex-row items-center">
                        <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                          <Image source={icons.level} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white/70 text-sm">Level Zero Offset</Text>
                          <Text className="text-white text-xl font-semibold mt-1">
                            {levelZeroRollDeg.toFixed(2)}°
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="rounded-3xl bg-brand-black/40 border border-brand-green/25 px-4 py-4">
                      <View className="flex-row items-start">
                        <View className="size-10 rounded-2xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mr-3">
                          <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-sm">Ready to save</Text>
                          <Text className="text-white/70 mt-1 text-sm">
                            These settings will be saved and used for future sessions. You can recalibrate at any time.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Portrait pinned footer */}
                <View style={{ paddingBottom: bottomPadding }} className="absolute bottom-0 left-0 right-0 px-6">
                  <View className="bg-brand-black/55 border border-brand-green/20 rounded-3xl p-3">
                    <Pressable
                        onPress={handleConfirm}
                        className="rounded-2xl items-center bg-brand-greenLight border border-brand-green/60 py-5"
                    >
                      <Text className="text-white font-semibold text-xl">Save Calibration</Text>
                    </Pressable>

                    <View className="flex-row mt-3 gap-3">
                      <Pressable
                          onPress={handleBack}
                          className="flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-4"
                      >
                        <Text className="text-white/90 font-semibold text-base">Redo Level</Text>
                      </Pressable>

                      <Pressable
                          onPress={handleCancel}
                          className="flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-4"
                      >
                        <Text className="text-red-400 font-semibold text-base">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
          ) : (
              /* Landscape: two columns (left scroll, right CTAs) */
              <View className="flex-1 flex-row pt-3">
                {/* Left content */}
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                      paddingLeft: 16,
                      paddingRight: 12,
                      paddingTop: 8,
                      paddingBottom: 16,
                    }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                  {/* Header */}
                  <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                    <View className="flex-row items-center">
                      <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                        <Image source={icons.check} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-white ${titleSize} font-semibold`}>Step 3: Confirm</Text>
                        <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                          Review your calibration settings before saving.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Summary */}
                  <View className="mt-4 gap-3">
                    <View className="rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 p-4">
                      <View className="flex-row items-center">
                        <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                          <Image source={icons.phonePortrait} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white/70 text-sm">Mount Orientation</Text>
                          <Text className="text-white text-lg font-semibold mt-1">
                            {getOrientationLabel(mountOrientation)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 p-4">
                      <View className="flex-row items-center">
                        <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                          <Image source={icons.level} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white/70 text-sm">Level Zero Offset</Text>
                          <Text className="text-white text-lg font-semibold mt-1">
                            {levelZeroRollDeg.toFixed(2)}°
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="rounded-3xl bg-brand-black/40 border border-brand-green/25 px-4 py-4">
                      <View className="flex-row items-start">
                        <View className="size-10 rounded-2xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mr-3">
                          <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-sm">Ready to save</Text>
                          <Text className="text-white/70 mt-1 text-sm">
                            These settings will be saved and used for future sessions. You can recalibrate at any time.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Right CTAs */}
                <View
                    style={{
                      width: sideCtaWidth,
                      paddingRight: 16,
                      paddingLeft: 8,
                      paddingBottom: bottomPadding,
                    }}
                    className="justify-between"
                >
                  <View className="bg-brand-black/55 border border-brand-green/20 rounded-3xl p-3">
                    <Text className="text-white/70 text-xs mb-2">Actions</Text>

                    <Pressable
                        onPress={handleConfirm}
                        className="rounded-2xl items-center bg-brand-greenLight border border-brand-green/60 py-4"
                    >
                      <Text className="text-white font-semibold text-lg">Save</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleBack}
                        className="mt-3 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-3"
                    >
                      <Text className="text-white/90 font-semibold text-sm">Redo Level</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleCancel}
                        className="mt-3 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-3"
                    >
                      <Text className="text-red-400 font-semibold text-sm">Cancel</Text>
                    </Pressable>
                    <View className="justify-center items-center">
                      <Text className="text-white/50 text-xs mt-3">
                        Tip: You can recalibrate anytime from settings.
                      </Text>
                    </View>
                  </View>

                </View>
              </View>
          )}
        </SafeAreaView>
      </View>
  );
}
