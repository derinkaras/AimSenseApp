// step3.tsx - Camera Setup (Zoom, Focus & Rotation)
import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { View, Text, Pressable, Image, StyleSheet, useWindowDimensions, GestureResponderEvent, Modal, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { CommonActions, useNavigation } from "expo-router/react-navigation";
import { useCalibrationStore, selectMountOrientation, selectCameraZoom, selectFocusPoint, selectScreenRotation, isLandscape, FocusPoint, getCameraLayoutConfig, clampValue } from "../calibration/exports";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, getSafeAreaEdges } from "../calibration/exports/styles";
import { HeaderCard, IconButton, SectionCard, PillButton, StatusBadge } from "../calibration/exports/components";

const SCREEN_ID = "step3";
const MAX_ROTATION = 60;
const MIN_ROTATION = -60;

export default function Step3() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;
  const { activeScreen, setActiveScreen } = useCameraContext();
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const storedZoom = useCalibrationStore(selectCameraZoom);
  const storedFocusPoint = useCalibrationStore(selectFocusPoint);
  const storedRotation = useCalibrationStore(selectScreenRotation);
  const setCameraZoom = useCalibrationStore((s) => s.setCameraZoom);
  const setStoreFocusPoint = useCalibrationStore((s) => s.setFocusPoint);
  const setStoreRotation = useCalibrationStore((s) => s.setScreenRotation);
  const setCameraLayoutStore = useCalibrationStore((s) => s.setCameraLayout);
  const setCameraResolution = useCalibrationStore((s) => s.setCameraResolution);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);
  const compact = isLandscapeMode;
  const safeEdges = getSafeAreaEdges(isLandscapeMode);

  const [zoom, setZoom] = useState(storedZoom);
  const [focusPoint, setLocalFocusPoint] = useState<FocusPoint | null>(storedFocusPoint);
  const [rotation, setRotation] = useState(storedRotation);
  const [showFocusIndicator, setShowFocusIndicator] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusLocked, setFocusLocked] = useState(!!storedFocusPoint);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const focusAppliedRef = useRef(false);

  useFocusEffect(
      useCallback(() => {
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;
  const layoutConfig = useMemo(
      () => getCameraLayoutConfig(width, height, isLandscapeMode, insets.bottom),
      [width, height, isLandscapeMode, insets.bottom]
  );

  useEffect(() => {
    if (width > 0 && height > 0) {
      setCameraLayoutStore(layoutConfig);
    }
  }, [layoutConfig, setCameraLayoutStore, width, height]);

  // Save camera resolution when layout is captured (spec 14.2)
  useEffect(() => {
    if (cameraLayout.width > 0 && cameraLayout.height > 0) {
      setCameraResolution({
        width: cameraLayout.width,
        height: cameraLayout.height,
      });
    }
  }, [cameraLayout.width, cameraLayout.height, setCameraResolution]);

  const applyFocus = useCallback(async (normalizedX: number, normalizedY: number) => {
    try {
      if (cameraRef.current && typeof (cameraRef.current as any).focus === "function") {
        await (cameraRef.current as any).focus({ x: normalizedX, y: normalizedY });
      }
    } catch (err) {
      console.warn("Failed to apply focus:", err);
    }
  }, []);

  useEffect(() => {
    if (focusPoint && shouldRenderCamera && cameraLayout.width > 0 && !focusAppliedRef.current) {
      const timer = setTimeout(() => {
        applyFocus(focusPoint.normalizedX, focusPoint.normalizedY);
        focusAppliedRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [focusPoint, shouldRenderCamera, cameraLayout.width, applyFocus]);

  useEffect(() => {
    focusAppliedRef.current = false;
  }, [focusPoint?.x, focusPoint?.y]);

  const handleTapToFocus = async (event: GestureResponderEvent) => {
    if (cameraLayout.width === 0 || cameraLayout.height === 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const centerX = cameraLayout.width / 2;
    const centerY = cameraLayout.height / 2;
    const angleRad = (-rotation * Math.PI) / 180;
    const dx = locationX - centerX;
    const dy = locationY - centerY;
    const cameraX = centerX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
    const cameraY = centerY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    const normalizedX = clampValue(cameraX / cameraLayout.width, 0, 1);
    const normalizedY = clampValue(cameraY / cameraLayout.height, 0, 1);
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
    await applyFocus(normalizedX, normalizedY);
    setTimeout(() => {
      setIsFocusing(false);
      setFocusLocked(true);
      focusAppliedRef.current = true;
    }, 800);
    setTimeout(() => setShowFocusIndicator(false), 1500);
  };

  const handleCameraLayout = (e: any) => setCameraLayout(e.nativeEvent.layout);
  const handleZoomChange = (v: number) => setZoom(v);
  const handleRotationChange = (v: number) => setRotation(Math.round(v * 2) / 2);
  const handleResetZoom = () => setZoom(0);
  const handleResetRotation = () => setRotation(0);
  const handleClearFocus = () => {
    setLocalFocusPoint(null);
    setFocusLocked(false);
    focusAppliedRef.current = false;
  };
  const handleNext = () => {
    setCameraZoom(zoom);
    setStoreFocusPoint(focusPoint);
    setStoreRotation(rotation);
    router.push("/(calibration)/step4");
  };
  const handleBack = () => router.back();
  const handleCancel = async () => {
    await reset();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "(tabs)" }] }));
  };

  const rotationTransform = { transform: [{ rotate: `${rotation}deg` }] };

  // Focus Trouble Modal - proper sizing for both orientations
  const renderInfoModal = () => (
      <Modal
          visible={showInfoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfoModal(false)}
          supportedOrientations={["portrait", "landscape"]}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowInfoModal(false)}>
          <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
          >
            <Pressable
                style={[styles.modalContent, compact && styles.modalContentCompact]}
                onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalIconContainer}>
                <Image
                    source={icons.info}
                    style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, tintColor: "#22c55e" }}
                    resizeMode="contain"
                />
              </View>
              <Text style={[styles.modalTitle, compact && { fontSize: 15 }]}>Focus Trouble?</Text>
              <Text style={[styles.modalSubtitle, compact && { fontSize: 11, marginBottom: 10 }]}>
                If the camera won't focus clearly through your scope, your phone adapter may need adjustment.
              </Text>

              <View style={[styles.modalSection, compact && { padding: 10 }]}>
                <Text style={[styles.modalSectionTitle, compact && { fontSize: 11 }]}>What to check:</Text>
                <Text style={[styles.modalSectionText, compact && { fontSize: 10 }]}>
                  • Use a distant target.{"\n"}
                  • Low light makes focusing harder.{"\n"}
                  • Adapter too close to scope{"\n"}
                  • Adapter too far from scope{"\n"}
                  • Eye relief not aligned
                </Text>
              </View>

              <View style={[styles.modalSectionAlt, compact && { padding: 10 }]}>
                <Text style={[styles.modalSectionTitle, compact && { fontSize: 11 }]}>Common Solution:</Text>
                <Text style={[styles.modalSectionText, compact && { fontSize: 10 }]}>
                  Slide the adapter in or out until the image appears sharp.
                </Text>
              </View>

              <Pressable
                  onPress={() => setShowInfoModal(false)}
                  style={[styles.modalButton, compact && { paddingVertical: 10 }]}
              >
                <Text style={[styles.modalButtonText, compact && { fontSize: 13 }]}>Got it</Text>
              </Pressable>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>
  );

  const renderFocusIndicator = () => {
    if (!focusPoint) return null;
    if (showFocusIndicator) {
      return (
          <View
              style={[styles.focusIndicator, { left: focusPoint.x - 30, top: focusPoint.y - 30 }]}
              pointerEvents="none"
          >
            <View
                style={[
                  styles.focusRing,
                  isFocusing && styles.focusRingAnimating,
                  focusLocked && styles.focusRingLocked,
                ]}
            />
          </View>
      );
    }
    if (focusLocked) {
      return (
          <View
              style={[styles.lockedFocusIndicator, { left: focusPoint.x - 24, top: focusPoint.y - 24 }]}
              pointerEvents="none"
          >
            <View style={styles.lockedFocusOuter}>
              <View style={styles.lockedFocusInner} />
            </View>
          </View>
      );
    }
    return null;
  };

  // LANDSCAPE LAYOUT
  if (isLandscapeMode) {
    return (
        <View className="flex-1 bg-brand-black">
          <View
              onLayout={handleCameraLayout}
              style={[StyleSheet.absoluteFill, { right: layoutConfig.cameraInsets.padRight }]}
          >
            {shouldRenderCamera && (
                <Pressable onPress={handleTapToFocus} style={StyleSheet.absoluteFill}>
                  <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        zoom={zoom}
                        autofocus={focusLocked ? "off" : "on"}
                    />
                  </View>
                  {renderFocusIndicator()}
                  {!focusPoint && (
                      <View style={styles.guideOverlay} pointerEvents="none">
                        <View style={styles.guideBox}>
                          <Text style={styles.guideText}>Tap to lock focus</Text>
                        </View>
                      </View>
                  )}
                </Pressable>
            )}
          </View>

          <SafeAreaView
              className="absolute right-0 top-0 bottom-0 bg-brand-black/95 border-l border-brand-green/30"
              style={{ width: layoutConfig.sidePanelWidth }}
              edges={["top", "bottom", "right"]}
          >
            <ScrollView className="flex-1 p-3" showsVerticalScrollIndicator={false}>
              <Pressable
                  onPress={() => setShowInfoModal(true)}
                  className="flex-row items-center justify-center py-1.5 px-2 rounded-lg bg-blue-500/15 border border-blue-400/30 mb-2"
              >
                <Image
                    source={icons.info}
                    className="w-3.5 h-3.5 mr-1.5"
                    resizeMode="contain"
                    style={{ tintColor: "#60a5fa" }}
                />
                <Text className="text-blue-300 text-[10px] font-semibold">Focus trouble?</Text>
              </Pressable>

              <HeaderCard icon={icons.camera} title="Camera Setup" subtitle="Zoom, focus & align" compact />

              <SectionCard title="Zoom" variant="secondary" compact className="mt-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white/70 text-[10px]">Level</Text>
                  <Text className="text-brand-greenLight font-mono text-[10px]">
                    {(zoom * 100).toFixed(0)}%
                  </Text>
                </View>
                <Slider
                    style={{ width: "100%", height: 32 }}
                    minimumValue={0}
                    maximumValue={1}
                    value={zoom}
                    onValueChange={handleZoomChange}
                    minimumTrackTintColor="#0b7f4f"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#22c55e"
                />
              </SectionCard>

              <SectionCard title="Rotation" variant="secondary" compact className="mt-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white/70 text-[10px]">Angle</Text>
                  <Text
                      className={cn(
                          "font-mono text-[10px]",
                          rotation === 0 ? "text-white/50" : "text-brand-greenLight"
                      )}
                  >
                    {rotation > 0 ? "+" : ""}
                    {rotation.toFixed(1)}°
                  </Text>
                </View>
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
                <View className="flex-row justify-between">
                  <Text className="text-white/40 text-[9px]">-60°</Text>
                  <Pressable onPress={handleResetRotation}>
                    <Text className="text-brand-greenLight/70 text-[9px] font-semibold">Reset</Text>
                  </Pressable>
                  <Text className="text-white/40 text-[9px]">+60°</Text>
                </View>
              </SectionCard>

              <SectionCard title="Focus" variant="secondary" compact className="mt-2">
                {focusPoint ? (
                    <View className="flex-row items-center">
                      <StatusBadge
                          status={focusLocked ? "success" : "warning"}
                          label={focusLocked ? "LOCKED" : "..."}
                          compact
                          className="flex-1"
                      />
                      <Pressable
                          onPress={handleClearFocus}
                          className="ml-2 px-2 py-1 rounded bg-brand-black/40 border border-brand-green/30"
                      >
                        <Text className="text-white/70 text-[9px]">Clear</Text>
                      </Pressable>
                    </View>
                ) : (
                    <Text className="text-white/50 text-[9px] text-center">Tap camera to focus</Text>
                )}
              </SectionCard>
            </ScrollView>
          </SafeAreaView>

          <View
              className="absolute bottom-0 left-0 items-center pb-3 px-3"
              style={{ right: layoutConfig.sidePanelWidth }}
              pointerEvents="box-none"
          >
            <View className="flex-row items-center gap-2 bg-brand-black/80 rounded-xl p-2 border border-brand-green/40">
              <IconButton icon={icons.chevronLeft} onPress={handleBack} size="sm" />
              <IconButton icon={icons.chevronRight} onPress={handleNext} size="sm" variant="primary" tintColor="#fff" />
              <IconButton icon={icons.cancel} onPress={handleCancel} size="sm" />
            </View>
          </View>

          {renderInfoModal()}
        </View>
    );
  }

  // PORTRAIT LAYOUT
  return (
      <View className="flex-1 bg-brand-black">
        <View
            onLayout={handleCameraLayout}
            style={[StyleSheet.absoluteFill, { bottom: layoutConfig.cameraInsets.padBottom }]}
        >
          {shouldRenderCamera && (
              <Pressable onPress={handleTapToFocus} style={StyleSheet.absoluteFill}>
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                  <CameraView
                      ref={cameraRef}
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      zoom={zoom}
                      autofocus={focusLocked ? "off" : "on"}
                  />
                </View>
                {renderFocusIndicator()}
                {!focusPoint && (
                    <View style={styles.guideOverlay} pointerEvents="none">
                      <View style={styles.guideBox}>
                        <Text style={styles.guideText}>Tap to lock focus</Text>
                      </View>
                    </View>
                )}
              </Pressable>
          )}
        </View>

        <SafeAreaView
            className="absolute bottom-0 left-0 right-0 bg-brand-black/95 border-t border-brand-green/30"
            style={{ height: layoutConfig.bottomPanelTotalHeight }}
            edges={["bottom"]}
        >
          <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
            <Pressable
                onPress={() => setShowInfoModal(true)}
                className="flex-row items-center justify-center py-2 px-3 rounded-xl bg-blue-500/15 border border-blue-400/30 mb-2"
            >
              <Image
                  source={icons.info}
                  className="w-4 h-4 mr-2"
                  resizeMode="contain"
                  style={{ tintColor: "#60a5fa" }}
              />
              <Text className="text-blue-300 text-sm font-semibold">Focus trouble?</Text>
            </Pressable>

            <View className="flex-row gap-2 mb-2">
              <View className="flex-1 rounded-xl bg-brand-greenDark/50 border border-brand-green/40 p-2">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white font-semibold text-xs">Zoom</Text>
                  <Text className="text-brand-greenLight font-mono text-xs">{(zoom * 100).toFixed(0)}%</Text>
                </View>
                <Slider
                    style={{ width: "100%", height: 28 }}
                    minimumValue={0}
                    maximumValue={1}
                    value={zoom}
                    onValueChange={handleZoomChange}
                    minimumTrackTintColor="#0b7f4f"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#22c55e"
                />
              </View>
              <View className="flex-1 rounded-xl bg-brand-greenDark/50 border border-brand-green/40 p-2">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white font-semibold text-xs">Rotation</Text>
                  <Text
                      className={cn("font-mono text-xs", rotation === 0 ? "text-white/50" : "text-brand-greenLight")}
                  >
                    {rotation > 0 ? "+" : ""}
                    {rotation.toFixed(1)}°
                  </Text>
                </View>
                <Slider
                    style={{ width: "100%", height: 28 }}
                    minimumValue={MIN_ROTATION}
                    maximumValue={MAX_ROTATION}
                    value={rotation}
                    onValueChange={handleRotationChange}
                    minimumTrackTintColor="#0b7f4f"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#22c55e"
                />
              </View>
            </View>

            <View className="flex-row gap-2 mb-2">
              <PillButton label="Reset Zoom" onPress={handleResetZoom} variant="ghost" compact />
              <PillButton label="Reset Rot" onPress={handleResetRotation} variant="ghost" compact />
              {focusPoint && <PillButton label="Clear Focus" onPress={handleClearFocus} variant="ghost" compact />}
            </View>

            <View className="items-center mb-2">
              {focusPoint ? (
                  <StatusBadge status={focusLocked ? "success" : "warning"} label={focusLocked ? "Focus Locked" : "Focusing..."} />
              ) : (
                  <StatusBadge status="neutral" label="Tap camera to focus" showDot={false} />
              )}
            </View>

            <View className="flex-row items-center justify-center gap-4">
              <IconButton icon={icons.chevronLeft} onPress={handleBack} size="md" />
              <IconButton icon={icons.chevronRight} onPress={handleNext} size="md" variant="primary" tintColor="#fff" />
              <IconButton icon={icons.cancel} onPress={handleCancel} size="md" />
            </View>
          </ScrollView>
        </SafeAreaView>

        {renderInfoModal()}
      </View>
  );
}

const styles = StyleSheet.create({
  guideOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  guideBox: {
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.4)",
    alignItems: "center",
  },
  guideText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    borderColor: "#eab308",
  },
  focusRingLocked: {
    borderWidth: 2,
    borderColor: "#22c55e",
  },
  lockedFocusIndicator: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedFocusOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  lockedFocusInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  // Modal styles - self contained for proper landscape handling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.4)",
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  modalContentCompact: {
    maxWidth: 280,
    padding: 14,
  },
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 18,
  },
  modalSection: {
    backgroundColor: "rgba(11,127,79,0.2)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.3)",
    marginBottom: 8,
  },
  modalSectionAlt: {
    backgroundColor: "rgba(11,127,79,0.35)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.4)",
    marginBottom: 12,
  },
  modalSectionTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalSectionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 17,
  },
  modalButton: {
    backgroundColor: "#0b7f4f",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});