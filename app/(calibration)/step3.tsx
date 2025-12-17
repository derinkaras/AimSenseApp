import React, { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCalibrationStore,
  selectMountOrientation,
  selectRoll0,
  selectPitch0,
  getOrientationLabel,
  isLandscape,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step3";

export default function Step3() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  // ============================================================
  // KEY: Get context and register this screen when focused
  // ============================================================
  const { activeScreen, setActiveScreen } = useCameraContext();

  useFocusEffect(
      useCallback(() => {
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  // Only render camera if this is the active screen
  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const mountOrientation = useCalibrationStore(selectMountOrientation);

  // still selected so step-2 capture is validated by “existing in store”
  // (not shown to user)
  const roll0 = useCalibrationStore(selectRoll0);
  const pitch0 = useCalibrationStore(selectPitch0);

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

  const sideCtaWidth = isLandscapeMode
      ? Math.min(320, Math.max(240, Math.floor(width * 0.34)))
      : 0;

  const bottomPadding = Math.max(insets.bottom, 8);

  const hasBaseline =
      Number.isFinite(roll0) &&
      Number.isFinite(pitch0);

  const SummaryCards = ({ compact = false }: { compact?: boolean }) => (
      <View className={compact ? "gap-3" : "gap-4"}>
        {/* Mount Orientation Card */}
        <View className={`rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 ${compact ? "p-4" : "p-5"}`}>
          <View className="flex-row items-center">
            <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
              <Image source={icons.phonePortrait} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
            </View>
            <View className="flex-1">
              <Text className="text-white/70 text-sm">Mount Orientation</Text>
              <Text className={`text-white ${compact ? "text-lg" : "text-xl"} font-semibold mt-1`}>
                {getOrientationLabel(mountOrientation)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reference Captured Card (replaces baseline numbers) */}
        <View className={`rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 ${compact ? "p-4" : "p-5"}`}>
          <View className="flex-row items-center">
            <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
              <Image source={icons.check} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
            </View>

            <View className="flex-1">
              <Text className="text-white/70 text-sm">Reference</Text>
              <Text className={`text-white ${compact ? "text-lg" : "text-xl"} font-semibold mt-1`}>
                {hasBaseline ? "Captured" : "Not captured"}
              </Text>
              <Text className="text-white/65 text-sm mt-1">
                AimSense will track live adjustments from this point.
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View className="rounded-3xl bg-brand-black/40 border border-brand-green/25 px-4 py-4">
          <View className="flex-row items-start">
            <View className="size-10 rounded-2xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mr-3">
              <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">Ready to save</Text>
              <Text className="text-white/70 mt-1 text-sm">
                All set. AimSense is ready when you are.
              </Text>
            </View>
          </View>
        </View>
      </View>
  );

  return (
      <View className="flex-1 bg-brand-black">
        {shouldRenderCamera && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

        <SafeAreaView className="flex-1" edges={safeAreaEdges}>
          {!isLandscapeMode ? (
              <View className="flex-1 px-6 pt-4">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 170 + bottomPadding }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
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

                  <View className="mt-6">
                    <SummaryCards />
                  </View>
                </ScrollView>

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
              <View className="flex-1 flex-row pt-3">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingLeft: 16, paddingRight: 12, paddingTop: 8, paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
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

                  <View className="mt-4">
                    <SummaryCards compact />
                  </View>
                </ScrollView>

                <View
                    style={{
                      width: sideCtaWidth,
                      paddingRight: 16,
                      paddingLeft: 8,
                      paddingBottom: bottomPadding,
                    }}
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

                    <View className="items-center">
                      <Text className="text-white/50 text-xs mt-3">Tip: You can recalibrate anytime from settings.</Text>
                    </View>
                  </View>
                </View>
              </View>
          )}
        </SafeAreaView>
      </View>
  );
}
