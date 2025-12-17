// ============================================================
// step3.tsx - Align Scope Center (Tap + Micro Adjust)
// ============================================================
// User taps to place scope center, then fine-tunes with controls.

import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  useWindowDimensions,
  GestureResponderEvent,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCalibrationStore,
  selectMountOrientation,
  isLandscape,
  ScopeCenterPx,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step3";

type StepSize = 1 | 5 | 10;

export default function Step3() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();

  useFocusEffect(
      useCallback(() => {
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const setScopeCenterPx = useCalibrationStore((s) => s.setScopeCenterPx);
  const setElevationStartPx = useCalibrationStore((s) => s.setElevationStartPx);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);

  // Center point state
  const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
  const [stepSize, setStepSize] = useState<StepSize>(1);
  const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);

  // Track camera view bounds
  const cameraViewRef = useRef<View>(null);
  const [cameraLayout, setCameraLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscapeMode) safeAreaEdges.push("left", "right");

  const bottomPadding = Math.max(insets.bottom, 8);

  // Magnifier settings
  const MAGNIFIER_SIZE = 120;
  const MAGNIFIER_ZOOM = 3;

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
      case "up":
        newPoint.y = Math.max(0, centerPoint.y - delta);
        break;
      case "down":
        newPoint.y = Math.min(cameraLayout.height, centerPoint.y + delta);
        break;
      case "left":
        newPoint.x = Math.max(0, centerPoint.x - delta);
        break;
      case "right":
        newPoint.x = Math.min(cameraLayout.width, centerPoint.x + delta);
        break;
    }

    setCenterPoint(newPoint);
  };

  const handleReset = () => {
    if (lastTapPoint) {
      setCenterPoint(lastTapPoint);
    }
  };

  const handleNext = () => {
    if (centerPoint) {
      setScopeCenterPx(centerPoint);
      // Also set as elevation start position
      setElevationStartPx(centerPoint);
      router.push("/(calibration)/step4");
    }
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

  // Control panel dimensions based on orientation
  const controlPanelHeight = isLandscapeMode ? 160 : 240;

  return (
      <View className="flex-1 bg-brand-black">
        {/* Camera Feed (tappable area) */}
        <View
            ref={cameraViewRef}
            onLayout={handleCameraLayout}
            style={[
              StyleSheet.absoluteFill,
              { bottom: controlPanelHeight + bottomPadding },
            ]}
        >
          {shouldRenderCamera && (
              <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                <CameraView style={StyleSheet.absoluteFill} facing="back" />

                {/* Crosshair overlay at center point */}
                {centerPoint && (
                    <View
                        style={[
                          styles.crosshairContainer,
                          {
                            left: centerPoint.x - 30,
                            top: centerPoint.y - 30,
                          },
                        ]}
                        pointerEvents="none"
                    >
                      {/* Vertical line */}
                      <View style={styles.crosshairVertical} />
                      {/* Horizontal line */}
                      <View style={styles.crosshairHorizontal} />
                      {/* Center dot */}
                      <View style={styles.crosshairCenter} />
                    </View>
                )}

                {/* Guide text when no point set */}
                {!centerPoint && (
                    <View style={styles.guideOverlay}>
                      <View style={styles.guideBox}>
                        <Text style={styles.guideText}>
                          Tap on the crosshair center
                        </Text>
                      </View>
                    </View>
                )}
              </Pressable>
          )}

          {/* Magnifier (shows zoomed view around center point) */}
          {centerPoint && (
              <View
                  style={[
                    styles.magnifier,
                    {
                      width: MAGNIFIER_SIZE,
                      height: MAGNIFIER_SIZE,
                      top: insets.top + 10,
                      right: 10,
                    },
                  ]}
                  pointerEvents="none"
              >
                <View style={styles.magnifierInner}>
                  <Text style={styles.magnifierLabel}>
                    {centerPoint.x}, {centerPoint.y}
                  </Text>
                  {/* Magnifier crosshair */}
                  <View style={styles.magnifierCrosshair}>
                    <View style={styles.magnifierCrosshairV} />
                    <View style={styles.magnifierCrosshairH} />
                    <View style={styles.magnifierCrosshairDot} />
                  </View>
                </View>
              </View>
          )}
        </View>

        {/* Control Panel */}
        <SafeAreaView
            className="absolute bottom-0 left-0 right-0"
            edges={["bottom"]}
        >
          <View
              style={{ paddingBottom: bottomPadding }}
              className="bg-brand-black/95 border-t border-brand-green/30 px-4 pt-4"
          >
            {/* Header */}
            <View className="flex-row items-center mb-3">
              <View className="size-9 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                <Image source={icons.target} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">Align Scope Center</Text>
                <Text className="text-white/60 text-xs">Tap the crosshair center, then fine-tune.</Text>
              </View>
            </View>

            {centerPoint ? (
                <>
                  {/* Micro Adjust Controls */}
                  <View className={`flex-row ${isLandscapeMode ? "gap-4" : "gap-3"}`}>
                    {/* D-Pad */}
                    <View className="flex-1 items-center">
                      <View className="items-center">
                        {/* Up */}
                        <Pressable
                            onPress={() => handleMicroAdjust("up")}
                            className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1"
                        >
                          <Image source={icons.chevronUp} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                        </Pressable>

                        {/* Left / Center / Right */}
                        <View className="flex-row items-center gap-1">
                          <Pressable
                              onPress={() => handleMicroAdjust("left")}
                              className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                          >
                            <Image source={icons.chevronLeft} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                          </Pressable>

                          <View className="size-10 rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center">
                            <Text className="text-white/50 text-xs font-mono">{stepSize}px</Text>
                          </View>

                          <Pressable
                              onPress={() => handleMicroAdjust("right")}
                              className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                          >
                            <Image source={icons.chevronRight} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                          </Pressable>
                        </View>

                        {/* Down */}
                        <Pressable
                            onPress={() => handleMicroAdjust("down")}
                            className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1"
                        >
                          <Image source={icons.chevronDown} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                        </Pressable>
                      </View>
                    </View>

                    {/* Step Size + Reset */}
                    <View className="justify-center gap-2">
                      <Text className="text-white/50 text-xs text-center">Step</Text>
                      <View className="flex-row gap-1">
                        {([1, 5, 10] as StepSize[]).map((size) => (
                            <Pressable
                                key={size}
                                onPress={() => setStepSize(size)}
                                className={[
                                  "px-3 py-2 rounded-lg border",
                                  stepSize === size
                                      ? "bg-brand-greenLight/20 border-brand-greenLight"
                                      : "bg-brand-black/40 border-brand-green/30",
                                ].join(" ")}
                            >
                              <Text
                                  className={[
                                    "text-xs font-semibold",
                                    stepSize === size ? "text-white" : "text-white/60",
                                  ].join(" ")}
                              >
                                {size}px
                              </Text>
                            </Pressable>
                        ))}
                      </View>

                      <Pressable
                          onPress={handleReset}
                          className="px-3 py-2 rounded-lg bg-brand-black/40 border border-brand-green/30 items-center"
                      >
                        <Text className="text-white/70 text-xs font-semibold">Reset</Text>
                      </Pressable>
                    </View>

                    {/* Save Center Button */}
                    <View className="justify-center">
                      <Pressable
                          onPress={handleNext}
                          className="px-5 py-4 rounded-2xl bg-brand-greenLight border border-brand-green/60 items-center justify-center"
                      >
                        <Text className="text-white font-semibold text-sm">Save</Text>
                        <Text className="text-white font-semibold text-sm">Center</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
            ) : (
                <View className="py-4">
                  <Text className="text-white/60 text-center text-sm">
                    Take your time — this sets your overlay reference.
                  </Text>
                </View>
            )}

            {/* Back / Cancel */}
            <View className="flex-row mt-3 gap-3">
              <Pressable
                  onPress={handleBack}
                  className="flex-1 py-3 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
              >
                <Text className="text-white/90 font-semibold text-sm">Back</Text>
              </Pressable>

              <Pressable
                  onPress={handleCancel}
                  className="flex-1 py-3 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
              >
                <Text className="text-white/90 font-semibold text-sm">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
  );
}

const styles = StyleSheet.create({
  crosshairContainer: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairVertical: {
    position: "absolute",
    width: 2,
    height: 60,
    backgroundColor: "#0b7f4f",
  },
  crosshairHorizontal: {
    position: "absolute",
    width: 60,
    height: 2,
    backgroundColor: "#0b7f4f",
  },
  crosshairCenter: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    borderWidth: 1,
    borderColor: "#0b7f4f",
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  guideBox: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(11, 127, 79, 0.4)",
  },
  guideText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  magnifier: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#0b7f4f",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
  },
  magnifierInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  magnifierLabel: {
    position: "absolute",
    bottom: 4,
    color: "#0b7f4f",
    fontSize: 10,
    fontFamily: "monospace",
  },
  magnifierCrosshair: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  magnifierCrosshairV: {
    position: "absolute",
    width: 1,
    height: 40,
    backgroundColor: "#22c55e",
  },
  magnifierCrosshairH: {
    position: "absolute",
    width: 40,
    height: 1,
    backgroundColor: "#22c55e",
  },
  magnifierCrosshairDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
});