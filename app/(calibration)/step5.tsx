// ============================================================
// step5.tsx - Align Scope Center (Tap + Micro Adjust)
// ============================================================
// User taps on camera to mark crosshair center, then fine-tunes position.
// ⚠️ CRITICAL: Uses camera layout from store (set in step3)
// Also captures camera resolution for hunt mode validation (spec 14.2)

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  GestureResponderEvent,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { CommonActions, useNavigation } from "@react-navigation/native";

import {
  useCalibrationStore,
  selectMountOrientation,
  selectCameraZoom,
  selectFocusPoint,
  selectScreenRotation,
  selectCameraLayout,
  isLandscape,
  ScopeCenterPx,
  getCameraLayoutConfig,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, getSafeAreaEdges } from "../calibration/exports/styles";
import { HeaderCard, IconButton, SectionCard, StepSizeSelector, PillButton } from "../calibration/exports/components";
import { crosshairStyles, magnifierStyles, guideStyles } from "../calibration/exports/calibrationStyles";

const SCREEN_ID = "step5";
type StepSize = 1 | 5 | 10;
const MAX_ROTATION = 45;
const MIN_ROTATION = -45;

// ==================== MAIN COMPONENT ====================
export default function Step5() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();
  const cameraViewRef = useRef<View>(null);

  // Store selectors
  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const cameraZoom = useCalibrationStore(selectCameraZoom);
  const focusPoint = useCalibrationStore(selectFocusPoint);
  const storedRotation = useCalibrationStore(selectScreenRotation);
  const storedCameraLayout = useCalibrationStore(selectCameraLayout);
  const setScopeCenterPx = useCalibrationStore((s) => s.setScopeCenterPx);
  const setElevationStartPx = useCalibrationStore((s) => s.setElevationStartPx);
  const setStoreRotation = useCalibrationStore((s) => s.setScreenRotation);
  const setCameraResolution = useCalibrationStore((s) => s.setCameraResolution);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);
  const safeEdges = getSafeAreaEdges(isLandscapeMode);
  const compact = isLandscapeMode;
  const focusLocked = focusPoint !== null;

  // Local state
  const [rotation, setRotation] = useState(storedRotation);
  const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
  const [stepSize, setStepSize] = useState<StepSize>(1);
  const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);
  const [cameraLayout, setCameraLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const rotationTransform = { transform: [{ rotate: `${rotation}deg` }] };

  // Focus effect
  useFocusEffect(
      useCallback(() => {
        console.log(SCREEN_ID);
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  // Layout config from store or fallback
  const layoutConfig = useMemo(() => {
    if (storedCameraLayout) return storedCameraLayout;
    console.warn("⚠️ Step5: Camera layout not in store, using local calculation");
    return getCameraLayoutConfig(width, height, isLandscapeMode, insets.bottom);
  }, [storedCameraLayout, width, height, isLandscapeMode, insets.bottom]);

  // Magnifier position
  const magnifierPos = useMemo(() => {
    const halfMag = layoutConfig.magnifierSize / 2;
    const edgePadding = 4;
    const safeLeft = isLandscapeMode ? Math.max(insets.left, edgePadding) : edgePadding;
    const safeTop = Math.max(insets.top, edgePadding);
    return {
      x: safeLeft + halfMag + edgePadding,
      y: safeTop + halfMag + edgePadding,
    };
  }, [isLandscapeMode, insets, layoutConfig.magnifierSize]);

  // ==================== HANDLERS ====================
  const handleCameraLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setCameraLayout({ x, y, width, height });
  };

  const handleTap = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const newPoint = { x: Math.round(locationX), y: Math.round(locationY) };
    setCenterPoint(newPoint);
    setLastTapPoint(newPoint);
  };

  const handleMicroAdjust = (direction: "up" | "down" | "left" | "right") => {
    if (!centerPoint) return;
    const delta = stepSize;
    let newPoint = { ...centerPoint };

    switch (direction) {
      case "up": newPoint.y = Math.max(0, centerPoint.y - delta); break;
      case "down": newPoint.y = Math.min(cameraLayout.height, centerPoint.y + delta); break;
      case "left": newPoint.x = Math.max(0, centerPoint.x - delta); break;
      case "right": newPoint.x = Math.min(cameraLayout.width, centerPoint.x + delta); break;
    }
    setCenterPoint(newPoint);
  };

  const handleReset = () => lastTapPoint && setCenterPoint(lastTapPoint);

  const handleRotationChange = (value: number) => {
    setRotation(Math.round(value * 2) / 2);
  };

  const handleResetRotation = () => setRotation(0);

  const handleRotationMicroAdjust = (direction: "cw" | "ccw") => {
    const delta = 0.5; // 0.5 degree increments
    setRotation((prev) => {
      const newValue = direction === "cw" ? prev + delta : prev - delta;
      return Math.max(MIN_ROTATION, Math.min(MAX_ROTATION, Math.round(newValue * 2) / 2));
    });
  };

  const handleNext = () => {
    if (!centerPoint) return;
    setScopeCenterPx(centerPoint);
    setElevationStartPx(centerPoint);
    setStoreRotation(rotation);
    // Save camera resolution for hunt mode validation (spec 14.2)
    // This is the authoritative capture point since we know camera is active
    if (cameraLayout.width > 0 && cameraLayout.height > 0) {
      setCameraResolution({
        width: cameraLayout.width,
        height: cameraLayout.height,
      });
    }
    router.push("/(calibration)/step6");
  };

  const handleBack = () => router.back();

  const handleCancel = async () => {
    await reset();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "(tabs)" }] }));
  };

  // ==================== CROSSHAIR COMPONENT ====================
  const Crosshair = ({ point }: { point: ScopeCenterPx }) => (
      <View style={[crosshairStyles.container, { left: point.x - 40, top: point.y - 40 }]} pointerEvents="none">
        <View style={crosshairStyles.top} />
        <View style={crosshairStyles.bottom} />
        <View style={crosshairStyles.left} />
        <View style={crosshairStyles.right} />
        <View style={crosshairStyles.center} />
      </View>
  );

  // ==================== MAGNIFIER COMPONENT ====================
  const Magnifier = ({ point }: { point: ScopeCenterPx }) => (
      <View
          style={[
            magnifierStyles.container,
            { width: layoutConfig.magnifierSize, height: layoutConfig.magnifierSize, left: magnifierPos.x, top: magnifierPos.y },
          ]}
          pointerEvents="none"
      >
        <View style={magnifierStyles.inner}>
          <Text style={magnifierStyles.label}>{point.x}, {point.y}</Text>
          <View style={magnifierStyles.crosshair}>
            <View style={magnifierStyles.crosshairV} />
            <View style={magnifierStyles.crosshairH} />
            <View style={magnifierStyles.crosshairDot} />
          </View>
        </View>
      </View>
  );

  // ==================== RENDER ====================
  if (isLandscapeMode) {
    return (
        <View className="flex-1 bg-brand-black">
          {/* Camera Feed */}
          <View
              ref={cameraViewRef}
              onLayout={handleCameraLayout}
              style={[StyleSheet.absoluteFill, { right: layoutConfig.cameraInsets.padRight }]}
          >
            {shouldRenderCamera && (
                <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                  <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                    <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                  </View>
                  {centerPoint && <Crosshair point={centerPoint} />}
                  {!centerPoint && (
                      <View style={guideStyles.overlay} pointerEvents="none">
                        <View style={guideStyles.box}>
                          <Text style={guideStyles.text}>Tap on the crosshair center</Text>
                        </View>
                      </View>
                  )}
                </Pressable>
            )}
            {centerPoint && <Magnifier point={centerPoint} />}
          </View>

          {/* Side Panel */}
          <SafeAreaView className="absolute top-0 bottom-0 right-0" edges={["top", "bottom", "right"]} style={{ width: layoutConfig.sidePanelWidth }}>
            <View className="flex-1 bg-brand-black/95 border-l border-brand-green/30">
              <View className="px-3 pt-3 pb-2">
                <HeaderCard icon={icons.target} title="Align Scope Center" subtitle="Tap, then fine-tune" compact />
              </View>

              <ScrollView className="flex-1 px-3" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                {/* Rotation Control */}
                <SectionCard title="Rotation" variant="secondary" compact className="mb-2">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-white/70 text-[10px]">Angle</Text>
                    <Text className={cn("font-mono text-[10px]", rotation === 0 ? "text-white/50" : "text-brand-greenLight")}>
                      {rotation > 0 ? "+" : ""}{rotation.toFixed(1)}°
                    </Text>
                  </View>

                  {/* Slider with micro adjust buttons */}
                  <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={() => handleRotationMicroAdjust("ccw")}
                        className="w-8 h-8 rounded-lg bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                    >
                      <Text className="text-brand-greenLight text-xs font-bold">−</Text>
                    </Pressable>
                    <View className="flex-1">
                      <Slider
                          style={{ width: "100%", height: 32 }}
                          minimumValue={MIN_ROTATION}
                          maximumValue={MAX_ROTATION}
                          value={rotation}
                          onValueChange={handleRotationChange}
                          minimumTrackTintColor="#0b7f4f"
                          maximumTrackTintColor="#333"
                          thumbTintColor="#22c55e"
                      />
                    </View>
                    <Pressable
                        onPress={() => handleRotationMicroAdjust("cw")}
                        className="w-8 h-8 rounded-lg bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                    >
                      <Text className="text-brand-greenLight text-xs font-bold">+</Text>
                    </Pressable>
                  </View>

                  <View className="flex-row justify-between items-center px-1 mt-1">
                    <Text className="text-white/40 text-[9px]">-45°</Text>
                    <Pressable onPress={handleResetRotation}>
                      <Text className="text-brand-greenLight/70 text-[9px] font-semibold">Reset</Text>
                    </Pressable>
                    <Text className="text-white/40 text-[9px]">+45°</Text>
                  </View>
                </SectionCard>

                {/* Micro Adjust */}
                {centerPoint && (
                    <SectionCard title="Micro Adjust" variant="secondary" compact className="mb-2">
                      <StepSizeSelector value={stepSize} onChange={setStepSize} compact />

                      <View className="items-center mt-3">
                        <Pressable onPress={() => handleMicroAdjust("up")} className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1">
                          <Image source={icons.chevronUp} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                        </Pressable>
                        <View className="flex-row items-center gap-1">
                          <Pressable onPress={() => handleMicroAdjust("left")} className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center">
                            <Image source={icons.chevronLeft} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                          </Pressable>
                          <View className="w-9 h-9 rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center">
                            <Text className="text-white/50 text-[10px] font-mono">{stepSize}px</Text>
                          </View>
                          <Pressable onPress={() => handleMicroAdjust("right")} className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center">
                            <Image source={icons.chevronRight} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                          </Pressable>
                        </View>
                        <Pressable onPress={() => handleMicroAdjust("down")} className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1">
                          <Image source={icons.chevronDown} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                        </Pressable>
                      </View>
                    </SectionCard>
                )}
              </ScrollView>

              {/* Navigation */}
              <View className="px-3 pb-3 pt-2">
                <View className="flex-row items-center justify-center gap-2">
                  <IconButton icon={icons.chevronLeft} onPress={handleBack} size="sm" />
                  <IconButton icon={icons.chevronRight} onPress={handleNext} disabled={!centerPoint} size="sm" variant="primary" tintColor="#ffffff" />
                  <IconButton icon={icons.cancel} onPress={handleCancel} size="sm" />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>
    );
  }

  // ==================== PORTRAIT LAYOUT ====================
  return (
      <View className="flex-1 bg-brand-black">
        {/* Camera Feed */}
        <View
            ref={cameraViewRef}
            onLayout={handleCameraLayout}
            style={[StyleSheet.absoluteFill, { bottom: layoutConfig.bottomPanelTotalHeight }]}
        >
          {shouldRenderCamera && (
              <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                  <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                </View>
                {centerPoint && <Crosshair point={centerPoint} />}
                {!centerPoint && (
                    <View style={guideStyles.overlay} pointerEvents="none">
                      <View style={guideStyles.box}>
                        <Text style={guideStyles.text}>Tap on the crosshair center</Text>
                      </View>
                    </View>
                )}
              </Pressable>
          )}
          {centerPoint && <Magnifier point={centerPoint} />}
        </View>

        {/* Bottom Panel */}
        <SafeAreaView
            className="absolute bottom-0 left-0 right-0 bg-brand-black/95 border-t border-brand-green/30"
            style={{ height: layoutConfig.bottomPanelTotalHeight }}
            edges={["bottom"]}
        >
          <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
            <HeaderCard icon={icons.target} title="Align Scope Center" subtitle="Tap the crosshair, then fine-tune" compact />

            {/* Rotation Control - Always visible */}
            <SectionCard title="Rotation" variant="secondary" compact className="mt-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-white/70 text-xs">Angle</Text>
                <Text className={cn("font-mono text-xs", rotation === 0 ? "text-white/50" : "text-brand-greenLight")}>
                  {rotation > 0 ? "+" : ""}{rotation.toFixed(1)}°
                </Text>
              </View>

              {/* Slider with micro adjust buttons */}
              <View className="flex-row items-center gap-2">
                <Pressable
                    onPress={() => handleRotationMicroAdjust("ccw")}
                    className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                >
                  <Text className="text-brand-greenLight text-base font-bold">−</Text>
                </Pressable>
                <View className="flex-1">
                  <Slider
                      style={{ width: "100%", height: 36 }}
                      minimumValue={MIN_ROTATION}
                      maximumValue={MAX_ROTATION}
                      value={rotation}
                      onValueChange={handleRotationChange}
                      minimumTrackTintColor="#0b7f4f"
                      maximumTrackTintColor="#333"
                      thumbTintColor="#22c55e"
                  />
                </View>
                <Pressable
                    onPress={() => handleRotationMicroAdjust("cw")}
                    className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                >
                  <Text className="text-brand-greenLight text-base font-bold">+</Text>
                </Pressable>
              </View>

              <View className="flex-row justify-between items-center px-1 mt-1">
                <Text className="text-white/40 text-[10px]">-45°</Text>
                <Pressable onPress={handleResetRotation}>
                  <Text className="text-brand-greenLight/70 text-[10px] font-semibold">Reset</Text>
                </Pressable>
                <Text className="text-white/40 text-[10px]">+45°</Text>
              </View>
            </SectionCard>

            {centerPoint && (
                <View className="mt-3">
                  <View className="flex-row gap-3">
                    {/* Step Size */}
                    <View className="flex-1">
                      <Text className="text-white font-semibold text-xs mb-2">Step Size</Text>
                      <StepSizeSelector value={stepSize} onChange={setStepSize} />
                    </View>

                    {/* D-Pad */}
                    <View className="items-center">
                      <Pressable onPress={() => handleMicroAdjust("up")} className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1">
                        <Image source={icons.chevronUp} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                      </Pressable>
                      <View className="flex-row items-center gap-1">
                        <Pressable onPress={() => handleMicroAdjust("left")} className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center">
                          <Image source={icons.chevronLeft} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                        </Pressable>
                        <View className="w-10 h-10 rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center">
                          <Text className="text-white/50 text-xs font-mono">{stepSize}</Text>
                        </View>
                        <Pressable onPress={() => handleMicroAdjust("right")} className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center">
                          <Image source={icons.chevronRight} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                        </Pressable>
                      </View>
                      <Pressable onPress={() => handleMicroAdjust("down")} className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1">
                        <Image source={icons.chevronDown} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                      </Pressable>
                    </View>
                  </View>
                </View>
            )}

            {/* Navigation */}
            <View className="flex-row items-center justify-center gap-4 mt-4">
              <IconButton icon={icons.chevronLeft} onPress={handleBack} size="md" />
              <IconButton icon={icons.chevronRight} onPress={handleNext} disabled={!centerPoint} size="md" variant="primary" tintColor="#ffffff" />
              <IconButton icon={icons.cancel} onPress={handleCancel} size="md" />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
  );
}