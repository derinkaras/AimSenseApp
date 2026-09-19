// ============================================================
// step1.tsx - Phone Orientation Selection
// ============================================================
// User selects how their phone is mounted on the scope.
// Responsive layout adapts to portrait/landscape and all device sizes.

import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "expo-router/react-navigation";

import {
  useCalibrationStore,
  selectPendingOrientation,
  MountOrientation,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, useResponsiveStyles, getSafeAreaEdges } from "../calibration/exports/styles";
import { HeaderCard, InfoCard, NavBar, SelectionOption } from "../calibration/exports/components";

const SCREEN_ID = "step1";

// ==================== ORIENTATION OPTIONS ====================
const ORIENTATION_OPTIONS: {
  key: MountOrientation;
  label: string;
  sublabel: string;
  icon: any;
}[] = [
  {
    key: "portrait",
    label: "Portrait",
    sublabel: "Normal upright position",
    icon: icons.phonePortrait,
  },
  {
    key: "landscape-left",
    label: "Landscape Left",
    sublabel: "Phone rotated left",
    icon: icons.phoneLandscapeLeft,
  },
  {
    key: "landscape-right",
    label: "Landscape Right",
    sublabel: "Phone rotated right",
    icon: icons.phoneLandscapeRight,
  },
];

// ==================== MAIN COMPONENT ====================
export default function Step1() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Detect layout based on screen dimensions (before user selects orientation)
  const isLandscapeLayout = width > height;
  const styles = useResponsiveStyles(isLandscapeLayout);
  const safeEdges = getSafeAreaEdges(isLandscapeLayout);

  // Store selectors and actions
  const pendingOrientation = useCalibrationStore(selectPendingOrientation);
  const setPending = useCalibrationStore((s) => s.setPendingOrientation);
  const confirmOrientation = useCalibrationStore((s) => s.confirmOrientation);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  // Focus effect to set active screen
  useFocusEffect(
    useCallback(() => {
      console.log(SCREEN_ID);
      setActiveScreen(SCREEN_ID);
      return () => {};
    }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  // ==================== HANDLERS ====================
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

  // ==================== RENDER ====================
  const compact = isLandscapeLayout;
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View className="flex-1 bg-brand-black">
      {/* Camera Background */}
      {shouldRenderCamera && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      )}

      <SafeAreaView className="flex-1" edges={safeEdges}>
        <View className={cn("flex-1 pt-3", compact ? "px-4" : "px-5")}>
          {isLandscapeLayout ? (
            // ==================== LANDSCAPE LAYOUT ====================
            <View className="flex-1" style={{ paddingBottom: bottomPadding }}>
              {/* Header */}
              <HeaderCard
                icon={icons.compass}
                title="Phone Orientation"
                subtitle="Select how your phone is mounted"
                compact
              />

              {/* Options - flex to fill space */}
              <View className="flex-1 my-2 gap-1.5">
                {ORIENTATION_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setPending(option.key)}
                    className={cn(
                      "flex-1 rounded-2xl px-3 flex-row items-center border",
                      pendingOrientation === option.key
                        ? "bg-brand-greenDark/80 border-brand-greenLight"
                        : "bg-brand-black/60 border-brand-green/35"
                    )}
                  >
                    <View
                      className={cn(
                        "w-9 h-9 rounded-xl items-center justify-center border mr-2",
                        pendingOrientation === option.key
                          ? "bg-brand-black/50 border-brand-greenLight"
                          : "bg-brand-black/40 border-brand-green/40"
                      )}
                    >
                      <Image
                        source={option.icon}
                        className="w-5 h-5"
                        resizeMode="contain"
                        style={{
                          tintColor:
                            pendingOrientation === option.key
                              ? "#0b7f4f"
                              : "#9ca3af",
                        }}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-white text-sm font-semibold">
                        {option.label}
                      </Text>
                      <Text className="text-white/60 text-[10px]">
                        {option.sublabel}
                      </Text>
                    </View>

                    <View
                      className={cn(
                        "w-4 h-4 rounded-full border items-center justify-center",
                        pendingOrientation === option.key
                          ? "border-brand-greenLight bg-brand-greenLight/15"
                          : "border-brand-green/40"
                      )}
                    >
                      {pendingOrientation === option.key && (
                        <View className="w-2 h-2 rounded-full bg-brand-greenLight" />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* CTAs */}
              <Pressable
                onPress={handleNext}
                className="rounded-xl py-2.5 items-center bg-brand-greenLight border border-brand-green/60"
              >
                <Text className="text-white text-base font-semibold">
                  Continue
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCancel}
                className="mt-2 py-2 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
              >
                <Text className="text-white/90 text-xs font-semibold">
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : (
            // ==================== PORTRAIT LAYOUT ====================
            <>
              {/* Header */}
              <HeaderCard
                icon={icons.compass}
                title="Phone Orientation"
                subtitle="Choose how your phone is mounted. The screen will rotate after you press Continue."
              />

              {/* Options ScrollView */}
              <ScrollView
                className="mt-4 flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
              >
                {ORIENTATION_OPTIONS.map((option) => (
                  <SelectionOption
                    key={option.key}
                    icon={option.icon}
                    label={option.label}
                    sublabel={option.sublabel}
                    selected={pendingOrientation === option.key}
                    onPress={() => setPending(option.key)}
                  />
                ))}

                {/* Tip Card */}
                <InfoCard
                  icon={icons.info}
                  title="Tip"
                  variant="tip"
                >
                  Pick the orientation that matches how the phone sits in your mount. You can change this later.
                </InfoCard>
              </ScrollView>

              {/* CTAs */}
              <View style={{ paddingBottom: bottomPadding }}>
                <Pressable
                  onPress={handleNext}
                  className="rounded-xl py-4 items-center bg-brand-greenLight border border-brand-green/60"
                >
                  <Text className="text-white text-lg font-semibold">
                    Continue
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCancel}
                  className="mt-3 py-3 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
                >
                  <Text className="text-white/90 text-base font-semibold">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
