// ============================================================
// step4.tsx - Camera Zoom & Focus Calibration
// ============================================================
// User sets zoom level and tap-to-focus point for the camera.
// Focus is LOCKED to the tapped point and persists through all
// subsequent calibration steps. Autofocus is disabled once locked.

import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
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
import Slider from "@react-native-community/slider";

import {
  useCalibrationStore,
  selectMountOrientation,
  selectCameraZoom,
  selectFocusPoint,
  isLandscape,
  FocusPoint,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step4";

const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

export default function Step4() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;

  const { activeScreen, setActiveScreen } = useCameraContext();
  const cameraRef = useRef<CameraView>(null);

  useFocusEffect(
      useCallback(() => {
        console.log(SCREEN_ID);
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const storedZoom = useCalibrationStore(selectCameraZoom);
  const storedFocusPoint = useCalibrationStore(selectFocusPoint);
  const setCameraZoom = useCalibrationStore((s) => s.setCameraZoom);
  const setStoreFocusPoint = useCalibrationStore((s) => s.setFocusPoint);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);

  // Local state for zoom and focus
  const [zoom, setZoom] = useState(storedZoom);
  const [focusPoint, setLocalFocusPoint] = useState<FocusPoint | null>(storedFocusPoint);
  const [showFocusIndicator, setShowFocusIndicator] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusLocked, setFocusLocked] = useState(!!storedFocusPoint);

  // Camera layout for calculating normalized coordinates
  const [cameraLayout, setCameraLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Ref to track if we need to re-apply focus
  const focusAppliedRef = useRef(false);

  const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscapeMode) safeAreaEdges.push("left", "right");

  const bottomPadding = Math.max(insets.bottom, 8);

  // Layout sizing
  const SIDE_PANEL_W = useMemo(() => {
    const w = Math.round(width * 0.34);
    return clamp(w, 220, 280);
  }, [width]);

  const cameraInsets = useMemo(() => {
    if (isLandscapeMode) {
      return { padRight: SIDE_PANEL_W, padBottom: 0 };
    }
    return { padRight: 0, padBottom: 280 + bottomPadding };
  }, [isLandscapeMode, SIDE_PANEL_W, bottomPadding]);

  const handleCameraLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setCameraLayout({ x, y, width, height });
  };

  // Apply focus to camera using normalized coordinates
  const applyFocus = useCallback(async (normalizedX: number, normalizedY: number) => {
    try {
      if (cameraRef.current) {
        // Use the focus method if available (expo-camera)
        // @ts-ignore - focus method exists on CameraView but may not be typed
        if (typeof cameraRef.current.focus === 'function') {
          await cameraRef.current.focus({ x: normalizedX, y: normalizedY });
        }
      }
    } catch (err) {
      console.warn("Failed to apply focus:", err);
    }
  }, []);

  // Re-apply focus when camera becomes ready or focus point exists
  useEffect(() => {
    if (focusPoint && shouldRenderCamera && cameraLayout.width > 0 && !focusAppliedRef.current) {
      // Small delay to ensure camera is ready
      const timer = setTimeout(() => {
        applyFocus(focusPoint.normalizedX, focusPoint.normalizedY);
        focusAppliedRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [focusPoint, shouldRenderCamera, cameraLayout.width, applyFocus]);

  // Reset focus applied ref when focus point changes
  useEffect(() => {
    focusAppliedRef.current = false;
  }, [focusPoint?.x, focusPoint?.y]);

  const handleTapToFocus = async (event: GestureResponderEvent) => {
    if (cameraLayout.width === 0 || cameraLayout.height === 0) return;

    const { locationX, locationY } = event.nativeEvent;

    // Calculate normalized coordinates (0-1) for camera API
    const normalizedX = clamp(locationX / cameraLayout.width, 0, 1);
    const normalizedY = clamp(locationY / cameraLayout.height, 0, 1);

    const point: FocusPoint = {
      x: Math.round(locationX),
      y: Math.round(locationY),
      normalizedX,
      normalizedY,
    };

    setLocalFocusPoint(point);
    setShowFocusIndicator(true);
    setIsFocusing(true);
    setFocusLocked(false);
    focusAppliedRef.current = false;

    // Apply focus to camera
    await applyFocus(normalizedX, normalizedY);

    // Animate focus indicator - show "focusing" state
    setTimeout(() => {
      setIsFocusing(false);
      setFocusLocked(true);
      focusAppliedRef.current = true;
    }, 800);

    // Hide the large focus indicator after animation
    setTimeout(() => {
      setShowFocusIndicator(false);
    }, 1500);
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
  };

  const handleNext = () => {
    // Save zoom and focus to store
    setCameraZoom(zoom);
    setStoreFocusPoint(focusPoint);
    router.push("/(calibration)/step5");
  };

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

  const handleResetZoom = () => {
    setZoom(0);
  };

  const handleClearFocus = () => {
    setLocalFocusPoint(null);
    setFocusLocked(false);
    focusAppliedRef.current = false;
  };

  // Layout adjustments
  const headerPadding = isLandscapeMode ? "p-3" : "p-4";
  const titleSize = isLandscapeMode ? "text-lg" : "text-xl";
  const subtitleSize = isLandscapeMode ? "text-xs" : "text-sm";

  // ============================================================
  // LANDSCAPE Layout
  // ============================================================
  if (isLandscapeMode) {
    return (
        <View className="flex-1 bg-brand-black">
          {/* Camera Feed */}
          <View
              onLayout={handleCameraLayout}
              style={[
                StyleSheet.absoluteFill,
                { right: cameraInsets.padRight, bottom: cameraInsets.padBottom },
              ]}
          >
            {shouldRenderCamera && (
                <Pressable onPress={handleTapToFocus} style={StyleSheet.absoluteFill}>
                  <CameraView
                      ref={cameraRef}
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      zoom={zoom}
                      autofocus={focusLocked ? "off" : "on"}
                  />

                  {/* Focus indicator - animating */}
                  {focusPoint && showFocusIndicator && (
                      <View
                          style={[
                            styles.focusIndicator,
                            {
                              left: focusPoint.x - 30,
                              top: focusPoint.y - 30,
                            },
                          ]}
                          pointerEvents="none"
                      >
                        <View style={[
                          styles.focusRing,
                          isFocusing && styles.focusRingAnimating,
                          focusLocked && styles.focusRingLocked
                        ]} />
                      </View>
                  )}

                  {/* Locked focus point indicator (persistent) */}
                  {focusPoint && !showFocusIndicator && focusLocked && (
                      <View
                          style={[
                            styles.lockedFocusIndicator,
                            {
                              left: focusPoint.x - 24,
                              top: focusPoint.y - 24,
                            },
                          ]}
                          pointerEvents="none"
                      >
                        <View style={styles.lockedFocusOuter}>
                          <View style={styles.lockedFocusInner} />
                        </View>
                        <Text style={styles.lockedFocusLabel}>LOCKED</Text>
                      </View>
                  )}

                  {/* Guide overlay */}
                  {!focusPoint && (
                      <View style={styles.guideOverlay}>
                        <View style={styles.guideBox}>
                          <Text style={styles.guideText}>Tap to lock focus point</Text>
                          <Text style={styles.guideSubtext}>Focus will stay locked during calibration</Text>
                        </View>
                      </View>
                  )}
                </Pressable>
            )}
          </View>

          {/* Side Panel */}
          <SafeAreaView
              className="absolute right-0 top-0 bottom-0 bg-brand-black/90 border-l border-brand-green/30"
              style={{ width: SIDE_PANEL_W }}
              edges={["top", "bottom", "right"]}
          >
            <View className="flex-1 p-3">
              {/* Header */}
              <View className={`rounded-2xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60 mb-3`}>
                <View className="flex-row items-center">
                  <View className="size-9 rounded-xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-2">
                    <Image source={icons.camera} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-white ${titleSize} font-semibold`}>Camera Setup</Text>
                    <Text className={`text-white/70 mt-0.5 ${subtitleSize}`}>
                      Set zoom & lock focus
                    </Text>
                  </View>
                </View>
              </View>

              {/* Zoom Control */}
              <View className="rounded-2xl bg-brand-greenDark/50 border border-brand-green/40 p-3 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-semibold text-sm">Zoom Level</Text>
                  <Text className="text-brand-greenLight font-mono text-sm">{(zoom * 100).toFixed(0)}%</Text>
                </View>
                <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={0}
                    maximumValue={1}
                    value={zoom}
                    onValueChange={handleZoomChange}
                    minimumTrackTintColor="#0b7f4f"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#22c55e"
                />
                <Pressable
                    onPress={handleResetZoom}
                    className="mt-2 py-2 rounded-lg bg-brand-black/40 border border-brand-green/30 items-center"
                >
                  <Text className="text-white/70 text-xs font-semibold">Reset Zoom</Text>
                </Pressable>
              </View>

              {/* Focus Status */}
              <View className="rounded-2xl bg-brand-greenDark/50 border border-brand-green/40 p-3 mb-3">
                <Text className="text-white font-semibold text-sm mb-2">Focus Lock</Text>
                {focusPoint ? (
                    <>
                      <View className={`flex-row items-center justify-center mb-2 py-2 rounded-lg ${focusLocked ? "bg-brand-greenLight/20" : "bg-yellow-500/20"}`}>
                        <View className={`w-2 h-2 rounded-full mr-2 ${focusLocked ? "bg-brand-greenLight" : "bg-yellow-500"}`} />
                        <Text className={`text-xs font-semibold ${focusLocked ? "text-brand-greenLight" : "text-yellow-500"}`}>
                          {focusLocked ? "FOCUS LOCKED" : "FOCUSING..."}
                        </Text>
                      </View>
                      <Pressable
                          onPress={handleClearFocus}
                          className="py-2 rounded-lg bg-brand-black/40 border border-brand-green/30 items-center"
                      >
                        <Text className="text-white/70 text-xs font-semibold">Clear & Re-focus</Text>
                      </Pressable>
                    </>
                ) : (
                    <Text className="text-white/50 text-xs text-center py-2">
                      Tap camera to lock focus
                    </Text>
                )}
              </View>

              {/* Spacer */}
              <View className="flex-1" />

              {/* CTAs */}
              <Pressable
                  onPress={handleNext}
                  className="rounded-xl py-3 items-center bg-brand-greenLight border border-brand-green/60 mb-2"
              >
                <Text className="text-white font-semibold text-sm">Continue</Text>
              </Pressable>

              <View className="flex-row gap-2">
                <Pressable
                    onPress={handleBack}
                    className="flex-1 py-2 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
                >
                  <Text className="text-white/90 font-semibold text-xs">Back</Text>
                </Pressable>

                <Pressable
                    onPress={handleCancel}
                    className="flex-1 py-2 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
                >
                  <Text className="text-white/90 font-semibold text-xs">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>
    );
  }

  // ============================================================
  // PORTRAIT Layout
  // ============================================================
  return (
      <View className="flex-1 bg-brand-black">
        {/* Camera Feed */}
        <View
            onLayout={handleCameraLayout}
            style={[
              StyleSheet.absoluteFill,
              { bottom: cameraInsets.padBottom },
            ]}
        >
          {shouldRenderCamera && (
              <Pressable onPress={handleTapToFocus} style={StyleSheet.absoluteFill}>
                <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    zoom={zoom}
                    autofocus={focusLocked ? "off" : "on"}
                />

                {/* Focus indicator - animating */}
                {focusPoint && showFocusIndicator && (
                    <View
                        style={[
                          styles.focusIndicator,
                          {
                            left: focusPoint.x - 30,
                            top: focusPoint.y - 30,
                          },
                        ]}
                        pointerEvents="none"
                    >
                      <View style={[
                        styles.focusRing,
                        isFocusing && styles.focusRingAnimating,
                        focusLocked && styles.focusRingLocked
                      ]} />
                    </View>
                )}

                {/* Locked focus point indicator (persistent) */}
                {focusPoint && !showFocusIndicator && focusLocked && (
                    <View
                        style={[
                          styles.lockedFocusIndicator,
                          {
                            left: focusPoint.x - 24,
                            top: focusPoint.y - 24,
                          },
                        ]}
                        pointerEvents="none"
                    >
                      <View style={styles.lockedFocusOuter}>
                        <View style={styles.lockedFocusInner} />
                      </View>
                      <Text style={styles.lockedFocusLabel}>LOCKED</Text>
                    </View>
                )}

                {/* Guide overlay */}
                {!focusPoint && (
                    <View style={styles.guideOverlay}>
                      <View style={styles.guideBox}>
                        <Text style={styles.guideText}>Tap to lock focus point</Text>
                        <Text style={styles.guideSubtext}>Focus will stay locked during calibration</Text>
                      </View>
                    </View>
                )}
              </Pressable>
          )}
        </View>

        {/* Bottom Panel */}
        <SafeAreaView className="flex-1" edges={safeAreaEdges}>
          <View className="flex-1" />

          <View
              className="bg-brand-black/95 border-t border-brand-green/30 px-5 pt-4"
              style={{ paddingBottom: bottomPadding }}
          >
            {/* Header */}
            <View className="rounded-2xl p-4 bg-brand-greenDark/70 border border-brand-green/60 mb-4">
              <View className="flex-row items-center">
                <View className="size-10 rounded-xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                  <Image source={icons.camera} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-lg font-semibold">Camera Setup</Text>
                  <Text className="text-white/70 mt-0.5 text-sm">
                    Adjust zoom and tap to lock focus on your reticle
                  </Text>
                </View>
              </View>
            </View>

            {/* Zoom Control */}
            <View className="rounded-2xl bg-brand-greenDark/50 border border-brand-green/40 p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-semibold">Zoom Level</Text>
                <Text className="text-brand-greenLight font-mono text-lg">{(zoom * 100).toFixed(0)}%</Text>
              </View>
              <Slider
                  style={{ width: "100%", height: 44 }}
                  minimumValue={0}
                  maximumValue={1}
                  value={zoom}
                  onValueChange={handleZoomChange}
                  minimumTrackTintColor="#0b7f4f"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#22c55e"
              />
              <View className="flex-row gap-3 mt-2">
                <Pressable
                    onPress={handleResetZoom}
                    className="flex-1 py-2 rounded-lg bg-brand-black/40 border border-brand-green/30 items-center"
                >
                  <Text className="text-white/70 text-sm font-semibold">Reset Zoom</Text>
                </Pressable>
                {focusPoint && (
                    <Pressable
                        onPress={handleClearFocus}
                        className="flex-1 py-2 rounded-lg bg-brand-black/40 border border-brand-green/30 items-center"
                    >
                      <Text className="text-white/70 text-sm font-semibold">Clear Focus</Text>
                    </Pressable>
                )}
              </View>
            </View>

            {/* Focus Status */}
            <View className="flex-row items-center justify-center mb-4">
              <View className={`px-4 py-2 rounded-full flex-row items-center ${focusPoint ? (focusLocked ? "bg-brand-greenLight/20" : "bg-yellow-500/20") : "bg-brand-black/40"} border ${focusPoint ? (focusLocked ? "border-brand-greenLight" : "border-yellow-500") : "border-brand-green/30"}`}>
                {focusPoint && (
                    <View className={`w-2 h-2 rounded-full mr-2 ${focusLocked ? "bg-brand-greenLight" : "bg-yellow-500"}`} />
                )}
                <Text className={`text-sm font-semibold ${focusPoint ? (focusLocked ? "text-brand-greenLight" : "text-yellow-500") : "text-white/50"}`}>
                  {focusPoint ? (focusLocked ? "Focus Locked" : "Focusing...") : "Tap camera to lock focus"}
                </Text>
              </View>
            </View>

            {/* CTAs */}
            <Pressable
                onPress={handleNext}
                className="rounded-2xl py-4 items-center bg-brand-greenLight border border-brand-green/60"
            >
              <Text className="text-white font-semibold text-lg">Continue</Text>
            </Pressable>

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
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  guideBox: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(11, 127, 79, 0.4)",
    alignItems: "center",
  },
  guideText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  guideSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 4,
  },
  focusIndicator: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  focusRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#22c55e",
    backgroundColor: "transparent",
  },
  focusRingAnimating: {
    borderWidth: 3,
    borderColor: "#eab308", // yellow while focusing
  },
  focusRingLocked: {
    borderWidth: 2,
    borderColor: "#22c55e",
  },
  lockedFocusIndicator: {
    position: "absolute",
    width: 48,
    height: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  lockedFocusOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  lockedFocusInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  lockedFocusLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "bold",
    color: "#22c55e",
    letterSpacing: 0.5,
  },
});