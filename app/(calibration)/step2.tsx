// ============================================================
// step2.tsx - Scope Setup (Units + Click Size)
// ============================================================
// User selects their scope's unit system (MOA/MIL) and click size.
// Responsive layout adapts to portrait/landscape and all device sizes.

import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "expo-router/react-navigation";

import {
  useCalibrationStore,
  selectScopeUnit,
  selectClickSize,
  selectMountOrientation,
  isLandscape,
  ScopeUnit,
  MOA_CLICK_OPTIONS,
  MIL_CLICK_OPTIONS,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, getSafeAreaEdges } from "../calibration/exports/styles";
import { HeaderCard, InfoCard, IconButton, SelectionOption, SectionCard } from "../calibration/exports/components";

const SCREEN_ID = "step2";

// ==================== MAIN COMPONENT ====================
export default function Step2() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Store selectors
  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const scopeUnit = useCalibrationStore(selectScopeUnit);
  const clickSize = useCalibrationStore(selectClickSize);
  const setScopeUnit = useCalibrationStore((s) => s.setScopeUnit);
  const setClickSize = useCalibrationStore((s) => s.setClickSize);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);
  const clickOptions = scopeUnit === "MOA" ? MOA_CLICK_OPTIONS : MIL_CLICK_OPTIONS;
  const safeEdges = getSafeAreaEdges(isLandscapeMode);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      console.log(SCREEN_ID);
      setActiveScreen(SCREEN_ID);
      return () => {};
    }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;
  const compact = isLandscapeMode;

  // ==================== HANDLERS ====================
  const handleNext = () => router.push("/(calibration)/step3");
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
          {/* Scrollable Content */}
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
              icon={icons.scope}
              title="Scope Setup"
              subtitle="AimSense will guide your scope adjustments"
              compact={compact}
            />

            {/* Unit Selection */}
            <SectionCard
              title="Unit System"
              variant="secondary"
              compact={compact}
            >
              <View className={cn("flex-row", compact ? "gap-2" : "gap-3")}>
                {(["MOA", "MIL"] as ScopeUnit[]).map((unit) => {
                  const selected = scopeUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => setScopeUnit(unit)}
                      className={cn(
                        "flex-1 rounded-2xl items-center border",
                        compact ? "py-3" : "py-4",
                        selected
                          ? "bg-brand-greenLight/20 border-brand-greenLight"
                          : "bg-brand-black/40 border-brand-green/30"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-semibold",
                          compact ? "text-base" : "text-lg",
                          selected ? "text-white" : "text-white/70"
                        )}
                      >
                        {unit === "MOA" ? "MOA" : "MIL / MRAD"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionCard>

            {/* Click Size Selection */}
            <SectionCard
              title="Click Size"
              subtitle="Check your turret markings or manual"
              variant="secondary"
              compact={compact}
            >
              <View className={compact ? "gap-2" : "gap-3"}>
                {clickOptions.map((option) => (
                  <SelectionOption
                    key={option.value}
                    label={option.label}
                    sublabel={`${option.value} ${scopeUnit.toLowerCase()} per click`}
                    selected={clickSize === option.value}
                    onPress={() => setClickSize(option.value)}
                    compact={compact}
                  />
                ))}
              </View>
            </SectionCard>

            {/* Helper Tip */}
            <InfoCard
              icon={icons.info}
              title="AimSense handles the math"
              variant="tip"
              compact={compact}
            >
              Just follow the steps — we'll tell you exactly how many clicks to dial.
            </InfoCard>
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
                onPress={handleNext}
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
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
