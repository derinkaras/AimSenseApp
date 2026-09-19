// ============================================================
// step8.tsx - Confirm & Begin Hunting
// ============================================================
// Final review screen before transitioning to Hunt Mode.
// Shows calibration summary and allows user to start hunting.

import React, { useCallback } from "react";
import { View, Text, Pressable, Image, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useNavigation } from "expo-router/react-navigation";

import {
  useCalibrationStore,
  selectMountOrientation,
  selectScopeUnit,
  selectScopeCenterPx,
  selectCameraZoom,
  selectFocusPoint,
  selectScreenRotation,
  selectRoll0,
  selectPitch0,
  selectPxPerUnitX,
  selectPxPerUnitY,
  getOrientationLabel,
  getUnitLabel,
  isLandscape,
} from "@/app/calibration/exports";
import { useHuntStore } from "@/app/hunt/store";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, getSafeAreaEdges } from "../calibration/exports/styles";
import { HeaderCard, IconButton, SectionCard } from "../calibration/exports/components";

const SCREEN_ID = "step8";

// ==================== SUMMARY CARD COMPONENT ====================
interface SummaryItemProps {
  icon: any;
  label: string;
  value: string;
  success: boolean;
  compact?: boolean;
}

function SummaryItem({ icon, label, value, success, compact = false }: SummaryItemProps) {
  return (
      <View
          className={cn(
              "rounded-2xl bg-brand-greenDark/65 border border-brand-green/45",
              compact ? "p-3" : "p-4"
          )}
      >
        <View className="flex-row items-center">
          <View
              className={cn(
                  "rounded-xl bg-brand-black/50 border border-brand-green/40 items-center justify-center",
                  compact ? "w-10 h-10 mr-3" : "w-12 h-12 mr-4"
              )}
          >
            <Image
                source={icon}
                className={compact ? "w-5 h-5" : "w-6 h-6"}
                resizeMode="contain"
                style={{ tintColor: "#0b7f4f" }}
            />
          </View>
          <View className="flex-1">
            <Text className={cn("text-white/70", compact ? "text-xs" : "text-sm")}>
              {label}
            </Text>
            <Text
                className={cn(
                    "text-white font-semibold mt-0.5",
                    compact ? "text-base" : "text-lg"
                )}
            >
              {value} {success && "✓"}
            </Text>
          </View>
        </View>
      </View>
  );
}

// ==================== MAIN COMPONENT ====================
export default function Step8() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // Store selectors
  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const scopeUnit = useCalibrationStore(selectScopeUnit);
  const scopeCenterPx = useCalibrationStore(selectScopeCenterPx);
  const cameraZoom = useCalibrationStore(selectCameraZoom);
  const focusPoint = useCalibrationStore(selectFocusPoint);
  const screenRotation = useCalibrationStore(selectScreenRotation);
  const roll0 = useCalibrationStore(selectRoll0);
  const pitch0 = useCalibrationStore(selectPitch0);
  const pxPerUnitX = useCalibrationStore(selectPxPerUnitX);
  const pxPerUnitY = useCalibrationStore(selectPxPerUnitY);
  const beginHunt = useCalibrationStore((s) => s.beginHunt);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  // Hunt store - initialize before navigating
  const initializeHunt = useHuntStore((s) => s.initializeHunt);

  const isLandscapeMode = isLandscape(mountOrientation);
  const safeEdges = getSafeAreaEdges(isLandscapeMode);
  const compact = isLandscapeMode;
  const focusLocked = focusPoint !== null;
  const rotationTransform = { transform: [{ rotate: `${screenRotation}deg` }] };

  // Validation checks
  const hasScopeCenter = scopeCenterPx !== null;
  const hasPixelScale = pxPerUnitX > 0 && pxPerUnitY > 0;
  const hasReference = Number.isFinite(roll0) && Number.isFinite(pitch0);
  const isComplete = hasScopeCenter && hasPixelScale && hasReference;

  // Debug logging - remove after fixing
  console.log("📊 Step8 Validation:", {
    hasScopeCenter,
    scopeCenterPx,
    hasPixelScale,
    pxPerUnitX,
    pxPerUnitY,
    hasReference,
    roll0,
    pitch0,
    isComplete
  });

  // Focus effect
  useFocusEffect(
      useCallback(() => {
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  // ==================== HANDLERS ====================
  const handleBeginHunting = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Build calibration result and save to calibration store
      const calibrationResult = await beginHunt();
      // Initialize hunt store with the fresh calibration result BEFORE navigating
      initializeHunt(calibrationResult);
      router.replace("/(hunt)/select-gun");
    } catch (error) {
      console.error("Failed to begin hunting:", error);
    }
  };

  const handleBack = () => router.back();

  const handleCancel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <View style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    zoom={cameraZoom}
                    autofocus={focusLocked ? "off" : "on"}
                />
              </View>
            </View>
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
                  icon={icons.check}
                  title="Calibration Complete"
                  subtitle="Review your settings and begin hunting"
                  compact={compact}
              />

              {/* Summary Cards */}
              <SummaryItem
                  icon={icons.target}
                  label="Scope Center"
                  value={hasScopeCenter ? "Captured" : "Not captured"}
                  success={hasScopeCenter}
                  compact={compact}
              />

              <SummaryItem
                  icon={icons.scope}
                  label="Scope Adjustments"
                  value={hasPixelScale ? `Calibrated (${getUnitLabel(scopeUnit)})` : "Not calibrated"}
                  success={hasPixelScale}
                  compact={compact}
              />

              <SummaryItem
                  icon={icons.compass}
                  label="Reference Baseline"
                  value={hasReference ? "Set" : "Not set"}
                  success={hasReference}
                  compact={compact}
              />

              <SummaryItem
                  icon={icons.camera}
                  label="Camera Setup"
                  value="Ready"
                  success={true}
                  compact={compact}
              />

              {/* Settings Summary */}
              <SectionCard variant="muted" compact={compact}>
                <View className={compact ? "gap-2" : "gap-3"}>
                  <View className="flex-row justify-between">
                    <Text className="text-white/60 text-sm">Orientation</Text>
                    <Text className="text-white text-sm font-semibold">
                      {getOrientationLabel(mountOrientation)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-white/60 text-sm">Unit System</Text>
                    <Text className="text-white text-sm font-semibold">
                      {getUnitLabel(scopeUnit)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-white/60 text-sm">Camera Zoom</Text>
                    <Text className="text-white text-sm font-semibold">
                      {(cameraZoom * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-white/60 text-sm">Rotation</Text>
                    <Text className="text-white text-sm font-semibold">
                      {screenRotation.toFixed(1)}°
                    </Text>
                  </View>
                </View>
              </SectionCard>

              {/* Status Message */}
              {isComplete ? (
                  <View
                      className={cn(
                          "rounded-2xl bg-brand-greenLight/15 border border-brand-greenLight/40",
                          compact ? "p-3" : "p-4"
                      )}
                  >
                    <Text
                        className={cn(
                            "text-brand-greenLight text-center font-semibold",
                            compact ? "text-sm" : "text-base"
                        )}
                    >
                      All systems ready — tap "Begin Hunting" to start!
                    </Text>
                  </View>
              ) : (
                  <View
                      className={cn(
                          "rounded-2xl bg-yellow-500/15 border border-yellow-500/40",
                          compact ? "p-3" : "p-4"
                      )}
                  >
                    <Text
                        className={cn(
                            "text-yellow-500 text-center font-semibold",
                            compact ? "text-sm" : "text-base"
                        )}
                    >
                      Some steps are incomplete. Go back to finish calibration.
                    </Text>
                  </View>
              )}
            </ScrollView>

            {/* CTAs */}
            <View className={compact ? "py-2" : "py-3"}>
              {/* Begin Hunting Button */}
              <Pressable
                  onPress={handleBeginHunting}
                  disabled={!isComplete}
                  className={cn(
                      "rounded-xl items-center border",
                      compact ? "py-3" : "py-4",
                      isComplete
                          ? "bg-brand-greenLight border-brand-green/60"
                          : "bg-brand-black/30 border-brand-green/30"
                  )}
              >
                <View className="flex-row items-center">
                  <Image
                      source={icons.target}
                      className={compact ? "w-5 h-5 mr-2" : "w-6 h-6 mr-3"}
                      resizeMode="contain"
                      style={{ tintColor: isComplete ? "#ffffff" : "#666666" }}
                  />
                  <Text
                      className={cn(
                          "font-semibold",
                          compact ? "text-base" : "text-lg",
                          isComplete ? "text-white" : "text-white/40"
                      )}
                  >
                    Begin Hunting
                  </Text>
                </View>
              </Pressable>

              {/* Navigation */}
              <View className="flex-row items-center justify-center gap-4 mt-3">
                <IconButton
                    icon={icons.chevronLeft}
                    onPress={handleBack}
                    size={compact ? "sm" : "md"}
                />

                <IconButton
                    icon={icons.cancel}
                    onPress={handleCancel}
                    size={compact ? "sm" : "md"}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
  );
}