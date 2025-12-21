// step6.tsx - First Turret Calibration (Expects Elevation)
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Modal,
  ScrollView,
  GestureResponderEvent,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "@react-navigation/native";
import {
  useCalibrationStore,
  selectMountOrientation,
  selectClickSize,
  selectScopeUnit,
  selectCameraZoom,
  selectFocusPoint,
  selectScreenRotation,
  selectScopeCenterPx,
  selectCameraLayout,
  isLandscape,
  getCalibrationClickCount,
  getTargetMovementLabel,
  ScopeCenterPx,
  getClickSizeLabel,
  getCameraLayoutConfig,
} from "../calibration/exports";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { cn, getSafeAreaEdges } from "../calibration/exports/styles";
import {
  HeaderCard,
  IconButton,
  SectionCard,
  StepSizeSelector,
  PillButton,
  InfoCard,
} from "../calibration/exports/components";
import {
  crosshairStyles,
  magnifierStyles,
  guideStyles,
} from "../calibration/exports/calibrationStyles";

const SCREEN_ID = "step6";
type Phase = "instruction" | "confirm" | "verify";
type StepSize = 1 | 5 | 10;
type Direction = "up" | "down" | "left" | "right";
type AxisDirection = "vertical" | "horizontal";

export default function Step6() {
  const [permission] = useCameraPermissions();
  const cameraEnabled = !!permission?.granted;
  const { activeScreen, setActiveScreen } = useCameraContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();

  const mountOrientation = useCalibrationStore(selectMountOrientation);
  const clickSize = useCalibrationStore(selectClickSize);
  const scopeUnit = useCalibrationStore(selectScopeUnit);
  const cameraZoom = useCalibrationStore(selectCameraZoom);
  const focusPoint = useCalibrationStore(selectFocusPoint);
  const screenRotation = useCalibrationStore(selectScreenRotation);
  const scopeCenterPx = useCalibrationStore(selectScopeCenterPx);
  const storedCameraLayout = useCalibrationStore(selectCameraLayout);

  const setElevationEndPx = useCalibrationStore((s) => s.setElevationEndPx);
  const calculateElevationScale = useCalibrationStore((s) => s.calculateElevationScale);
  const setWindageStartPx = useCalibrationStore((s) => s.setWindageStartPx);
  const setWindageEndPx = useCalibrationStore((s) => s.setWindageEndPx);
  const calculateWindageScale = useCalibrationStore((s) => s.calculateWindageScale);
  const setElevationStartPx = useCalibrationStore((s) => s.setElevationStartPx);
  const setAxesSwapped = useCalibrationStore((s) => s.setAxesSwapped);
  const reset = useCalibrationStore((s) => s.resetCalibration);

  const isLandscapeMode = isLandscape(mountOrientation);
  const safeEdges = getSafeAreaEdges(isLandscapeMode);
  const compact = isLandscapeMode;
  const focusLocked = focusPoint !== null;
  const rotationTransform = { transform: [{ rotate: `${screenRotation}deg` }] };
  const calibrationClickCount = getCalibrationClickCount(scopeUnit, clickSize);
  const targetMovement = getTargetMovementLabel(scopeUnit);

  const [phase, setPhase] = useState<Phase>("instruction");
  const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
  const [stepSize, setStepSize] = useState<StepSize>(1);
  const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [showSwappedModal, setShowSwappedModal] = useState(false);
  const [showDialBackModal, setShowDialBackModal] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useFocusEffect(
      useCallback(() => {
        setActiveScreen(SCREEN_ID);
        return () => {};
      }, [setActiveScreen])
  );

  const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

  const layoutConfig = useMemo(
      () => storedCameraLayout || getCameraLayoutConfig(width, height, isLandscapeMode, insets.bottom),
      [storedCameraLayout, width, height, isLandscapeMode, insets.bottom]
  );

  const magnifierPos = useMemo(() => {
    const h = layoutConfig.magnifierSize / 2;
    const safeLeft = isLandscapeMode ? Math.max(insets.left, 4) : 4;
    return { x: safeLeft + h + 8, y: Math.max(insets.top, 4) + h + 8 };
  }, [isLandscapeMode, insets, layoutConfig.magnifierSize]);

  const handleCameraLayout = (e: any) => setCameraLayout(e.nativeEvent.layout);

  const handleTap = (e: GestureResponderEvent) => {
    const pt = { x: Math.round(e.nativeEvent.locationX), y: Math.round(e.nativeEvent.locationY) };
    setCenterPoint(pt);
    setLastTapPoint(pt);
  };

  const handleMicroAdjust = (dir: Direction) => {
    if (!centerPoint) return;
    const d = stepSize;
    const pt = { ...centerPoint };
    if (dir === "up") pt.y = Math.max(0, pt.y - d);
    if (dir === "down") pt.y = Math.min(cameraLayout.height, pt.y + d);
    if (dir === "left") pt.x = Math.max(0, pt.x - d);
    if (dir === "right") pt.x = Math.min(cameraLayout.width, pt.x + d);
    setCenterPoint(pt);
  };

  const handleResetPosition = () => {
    if (lastTapPoint) setCenterPoint(lastTapPoint);
  };

  const handleDialed = () => setPhase("confirm");

  const handleConfirmPosition = () => {
    if (centerPoint) setShowDirectionModal(true);
  };

  const handleAxisDirection = (axis: AxisDirection) => {
    setShowDirectionModal(false);
    if (!centerPoint || !scopeCenterPx) return;
    if (axis === "vertical") {
      setAxesSwapped(false);
      setElevationEndPx(centerPoint);
      calculateElevationScale();
      setWindageStartPx(scopeCenterPx);
      setShowDialBackModal(true);
    } else {
      setShowSwappedModal(true);
    }
  };

  const handleSwappedConfirm = () => {
    if (!centerPoint || !scopeCenterPx) return;
    setShowSwappedModal(false);
    setAxesSwapped(true);
    setWindageStartPx(scopeCenterPx);
    setWindageEndPx(centerPoint);
    calculateWindageScale();
    setElevationStartPx(centerPoint);
    setShowDialBackModal(true);
  };

  const handleDialBackConfirmed = () => {
    setShowDialBackModal(false);
    setPhase("verify");
  };

  const handleVerifyConfirm = () => router.push("/(calibration)/step7");

  const handleBack = () => {
    if (phase === "verify") {
      setPhase("confirm");
    } else if (phase === "confirm") {
      setPhase("instruction");
      setCenterPoint(null);
    } else {
      router.back();
    }
  };

  const handleCancel = async () => {
    await reset();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "(tabs)" }] }));
  };

  const Crosshair = ({ point }: { point: ScopeCenterPx }) => (
      <View style={[crosshairStyles.container, { left: point.x - 40, top: point.y - 40 }]} pointerEvents="none">
        <View style={crosshairStyles.top} />
        <View style={crosshairStyles.bottom} />
        <View style={crosshairStyles.left} />
        <View style={crosshairStyles.right} />
        <View style={crosshairStyles.center} />
      </View>
  );

  // Direction Modal
  const renderDirectionModal = () => (
      <Modal visible={showDirectionModal} transparent animationType="fade" supportedOrientations={["portrait", "landscape"]}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDirectionModal(false)}>
          <Pressable style={[styles.modalContent, compact && styles.modalContentCompact]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, compact && { fontSize: 16 }]}>Which way did it move?</Text>
            <Text style={[styles.modalSubtitle, compact && { fontSize: 11 }]}>
              {compact ? "Note the direction the crosshair moved." : "When you dialed the turret, which direction did the crosshair move?"}
            </Text>
            <View style={{ gap: compact ? 8 : 12 }}>
              <Pressable onPress={() => handleAxisDirection("vertical")} style={[styles.optionButton, compact && { paddingVertical: 10 }]}>
                <Text style={[styles.optionText, compact && { fontSize: 14 }]}>↑ UP or DOWN ↓</Text>
                <Text style={[styles.optionSubtext, compact && { fontSize: 11 }]}>Moved vertically (correct for elevation)</Text>
              </Pressable>
              <Pressable onPress={() => handleAxisDirection("horizontal")} style={[styles.optionButton, compact && { paddingVertical: 10 }]}>
                <Text style={[styles.optionText, compact && { fontSize: 14 }]}>← LEFT or RIGHT →</Text>
                <Text style={[styles.optionSubtext, compact && { fontSize: 11 }]}>Moved horizontally (windage turret)</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setShowDirectionModal(false)} style={[styles.secondaryButton, { marginTop: compact ? 12 : 16 }]}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
  );

  // Swapped Modal - green checkmark
  const renderSwappedModal = () => (
      <Modal visible={showSwappedModal} transparent animationType="fade" supportedOrientations={["portrait", "landscape"]}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, compact && styles.modalContentCompact]}>
            <View style={styles.iconContainer}>
              <Image source={icons.check} style={{ width: compact ? 32 : 40, height: compact ? 32 : 40, tintColor: "#22c55e" }} resizeMode="contain" />
            </View>
            <Text style={[styles.modalTitle, compact && { fontSize: 16 }]}>No problem!</Text>
            <Text style={[styles.modalSubtitle, compact && { fontSize: 11 }]}>
              Looks like you turned the windage turret instead of elevation. That's okay - we'll use this for windage calibration and do elevation next.
            </Text>
            <Pressable onPress={handleSwappedConfirm} style={[styles.primaryButton, compact && { paddingVertical: 12 }]}>
              <Text style={[styles.primaryButtonText, compact && { fontSize: 14 }]}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
  );

  // Dial Back Modal - reduced top margin
  const renderDialBackModal = () => (
      <Modal visible={showDialBackModal} transparent animationType="fade" supportedOrientations={["portrait", "landscape"]}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, compact && styles.modalContentCompact]}>
            <View style={[styles.iconContainer, { marginBottom: compact ? 8 : 12 }]}>
              <Image source={icons.refresh} style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, tintColor: "#22c55e" }} resizeMode="contain" />
            </View>
            <Text style={[styles.modalTitle, compact && { fontSize: 16, marginBottom: 4 }]}>Dial Back to Zero</Text>
            <View style={[styles.clickCountBox, compact && { padding: 10, marginBottom: 10 }]}>
              <Text style={[styles.clickCountText, compact && { fontSize: 20 }]}>{calibrationClickCount} clicks</Text>
              <Text style={[styles.clickCountSubtext, compact && { fontSize: 11 }]}>
                in the <Text style={{ color: "#22c55e", fontWeight: "600" }}>OPPOSITE</Text> direction
              </Text>
            </View>
            <View style={{ gap: compact ? 6 : 8 }}>
              <View style={styles.warningRow}>
                <Text style={[styles.warningIcon, compact && { fontSize: 12 }]}>{"⚠️"}</Text>
                <Text style={[styles.warningText, compact && { fontSize: 10, lineHeight: 14 }]}>
                  <Text style={styles.warningBold}>Remember which way you turned</Text>{" - you need to go the opposite direction now."}
                </Text>
              </View>
              <View style={styles.warningRow}>
                <Text style={[styles.warningIcon, compact && { fontSize: 12 }]}>{"⚠️"}</Text>
                <Text style={[styles.warningText, compact && { fontSize: 10, lineHeight: 14 }]}>
                  <Text style={styles.warningBold}>Go slow and count carefully</Text>{" - miscounting will throw off your zero."}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleDialBackConfirmed} style={[styles.primaryButton, { marginTop: compact ? 10 : 14 }, compact && { paddingVertical: 10 }]}>
              <Text style={[styles.primaryButtonText, compact && { fontSize: 14 }]}>I've Dialed Back</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
  );

  // ==================== INSTRUCTION PHASE ====================
  if (phase === "instruction") {
    return (
        <View className="flex-1 bg-brand-black">
          {shouldRenderCamera && (
              <View style={[StyleSheet.absoluteFill, isLandscapeMode && { right: layoutConfig.cameraInsets.padRight }]}>
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                  <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                </View>
              </View>
          )}
          <SafeAreaView className="flex-1" edges={safeEdges}>
            <View className={cn("flex-1 pt-3", compact ? "px-4" : "px-5")}>
              <ScrollView
                  className="flex-1"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: compact ? 12 : 16, paddingBottom: compact ? 80 : 100 }}
              >
                <HeaderCard
                    icon={icons.arrowUp}
                    title="Elevation Calibration"
                    subtitle="Dial the elevation turret to calibrate vertical adjustments"
                    compact={compact}
                />

                <SectionCard title="Instructions" variant="secondary" compact={compact}>
                  <View className={cn("bg-brand-black/40 rounded-xl", compact ? "p-3" : "p-4")}>
                    <Text className={cn("text-white/80 text-center", compact ? "text-xs mb-2" : "text-base mb-3")}>
                      Turn the <Text className="text-white font-bold">ELEVATION</Text> turret
                    </Text>
                    <View className="flex-row items-center justify-center">
                      <Text className={cn("text-white font-extrabold", compact ? "text-3xl" : "text-4xl")}>
                        {calibrationClickCount}
                      </Text>
                      <Text className={cn("text-white/70 font-semibold ml-2", compact ? "text-base" : "text-xl")}>clicks</Text>
                    </View>
                    <Text className={cn("text-brand-greenLight font-bold text-center", compact ? "text-sm mt-1" : "text-lg mt-2")}>
                      = {targetMovement}
                    </Text>
                    <Text className={cn("text-white/50 text-center", compact ? "text-[10px] mt-1" : "text-xs mt-2")}>
                      ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                    </Text>
                  </View>
                </SectionCard>

                {/* Important FIRST - yellow warning */}
                <InfoCard icon={icons.info} title="Important" variant="warning" compact={compact}>
                  {"Remember which direction you turn - you'll need to reverse it later. Count slowly and carefully - miscounting will affect your zero."}
                </InfoCard>

                {/* Expected Movement SECOND - yellow warning */}
                <InfoCard icon={icons.info} title="Expected Movement" variant="warning" compact={compact}>
                  {"Crosshair should move VERTICALLY (up or down). Elevation turret is usually on top of the scope."}
                </InfoCard>
              </ScrollView>

              <View className={compact ? "py-2" : "py-3"}>
                <Pressable
                    onPress={handleDialed}
                    className={cn("rounded-xl items-center bg-brand-greenLight border border-brand-green/60 mb-2", compact ? "py-2.5" : "py-4")}
                >
                  <Text className={cn("text-white font-semibold", compact ? "text-base" : "text-lg")}>I've dialed it</Text>
                </Pressable>
                <View className="flex-row items-center justify-center gap-4">
                  <IconButton icon={icons.chevronLeft} onPress={handleBack} size={compact ? "sm" : "md"} />
                  <IconButton icon={icons.cancel} onPress={handleCancel} size={compact ? "sm" : "md"} />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>
    );
  }

  // ==================== VERIFY PHASE ====================
  if (phase === "verify") {
    return (
        <View className="flex-1 bg-brand-black">
          <View
              onLayout={handleCameraLayout}
              style={[
                StyleSheet.absoluteFill,
                isLandscapeMode ? { right: layoutConfig.cameraInsets.padRight } : { bottom: layoutConfig.bottomPanelTotalHeight },
              ]}
          >
            {shouldRenderCamera && (
                <View style={StyleSheet.absoluteFill}>
                  <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                    <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                  </View>
                  {scopeCenterPx && (
                      <>
                        <Crosshair point={scopeCenterPx} />
                        <View
                            style={{
                              position: "absolute",
                              left: scopeCenterPx.x - 40,
                              top: scopeCenterPx.y + 45,
                              backgroundColor: "rgba(0,0,0,0.75)",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: "rgba(11,127,79,0.5)",
                            }}
                            pointerEvents="none"
                        >
                          <Text style={{ color: "#22c55e", fontSize: 11, fontFamily: "monospace", fontWeight: "600" }}>
                            ({scopeCenterPx.x}, {scopeCenterPx.y})
                          </Text>
                        </View>
                      </>
                  )}
                </View>
            )}
          </View>

          {isLandscapeMode ? (
              <SafeAreaView
                  className="absolute top-0 bottom-0 right-0 bg-brand-black/95 border-l border-brand-green/30"
                  edges={["top", "bottom", "right"]}
                  style={{ width: layoutConfig.sidePanelWidth }}
              >
                <View className="flex-1 px-3 pt-3">
                  <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <HeaderCard icon={icons.target} title="Verify Reset" subtitle="Confirm crosshair alignment" compact />
                    <SectionCard variant="secondary" compact className="mt-2">
                      <Text className="text-white/80 text-[10px] leading-3.5 text-center">
                        The green marker shows your original zero. Verify your scope's crosshair aligns with it.
                      </Text>
                    </SectionCard>
                    {scopeCenterPx && (
                        <SectionCard variant="elevated" compact className="mt-2">
                          <Text className="text-white/50 text-[10px] text-center">Original Zero</Text>
                          <Text className="text-brand-greenLight font-mono text-lg font-bold text-center mt-1">
                            ({scopeCenterPx.x}, {scopeCenterPx.y})
                          </Text>
                        </SectionCard>
                    )}
                    <View className="bg-brand-greenLight/10 border border-brand-greenLight/30 rounded-xl p-2 mt-2">
                      <Text className="text-brand-greenLight/90 text-[10px] text-center font-medium">
                        If aligned, tap Continue. If not, go back and re-dial.
                      </Text>
                    </View>
                  </ScrollView>
                  <View className="pb-3 pt-2">
                    <View className="flex-row items-center justify-center gap-2">
                      <IconButton icon={icons.chevronLeft} onPress={handleBack} size="sm" />
                      <IconButton icon={icons.chevronRight} onPress={handleVerifyConfirm} size="sm" variant="primary" tintColor="#fff" />
                      <IconButton icon={icons.cancel} onPress={handleCancel} size="sm" />
                    </View>
                  </View>
                </View>
              </SafeAreaView>
          ) : (
              <SafeAreaView
                  className="absolute bottom-0 left-0 right-0 bg-brand-black/95 border-t border-brand-green/30"
                  style={{ height: layoutConfig.bottomPanelTotalHeight }}
                  edges={["bottom"]}
              >
                <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
                  <HeaderCard icon={icons.target} title="Verify Turret Reset" subtitle="Confirm your crosshair is back to zero" compact />
                  <SectionCard variant="secondary" className="mt-3">
                    <Text className="text-white/80 text-xs leading-4 text-center">
                      The green marker shows your original zero position. Verify your scope's crosshair aligns with it.
                    </Text>
                  </SectionCard>
                  {scopeCenterPx && (
                      <SectionCard variant="elevated" className="mt-3">
                        <Text className="text-white/50 text-xs text-center">Original Zero Position</Text>
                        <Text className="text-brand-greenLight font-mono text-xl font-bold text-center mt-1">
                          ({scopeCenterPx.x}, {scopeCenterPx.y})
                        </Text>
                      </SectionCard>
                  )}
                  <View className="bg-brand-greenLight/10 border border-brand-greenLight/30 rounded-xl p-3 mt-3">
                    <Text className="text-brand-greenLight/90 text-xs text-center font-medium">
                      If aligned correctly, tap Continue. If not, go back and carefully re-dial.
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-center gap-4 mt-4">
                    <IconButton icon={icons.chevronLeft} onPress={handleBack} size="md" />
                    <IconButton icon={icons.chevronRight} onPress={handleVerifyConfirm} size="md" variant="primary" tintColor="#fff" />
                    <IconButton icon={icons.cancel} onPress={handleCancel} size="md" />
                  </View>
                </ScrollView>
              </SafeAreaView>
          )}
        </View>
    );
  }

  // ==================== CONFIRM PHASE ====================
  return (
      <View className="flex-1 bg-brand-black">
        <View
            onLayout={handleCameraLayout}
            style={[
              StyleSheet.absoluteFill,
              isLandscapeMode ? { right: layoutConfig.cameraInsets.padRight } : { bottom: layoutConfig.bottomPanelTotalHeight },
            ]}
        >
          {shouldRenderCamera && (
              <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                  <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                </View>
                {centerPoint ? (
                    <Crosshair point={centerPoint} />
                ) : (
                    <View style={guideStyles.overlay} pointerEvents="none">
                      <View style={guideStyles.box}>
                        <Text style={guideStyles.text}>Tap the new crosshair position</Text>
                      </View>
                    </View>
                )}
              </Pressable>
          )}
          {centerPoint && (
              <View
                  style={[
                    magnifierStyles.container,
                    { width: layoutConfig.magnifierSize, height: layoutConfig.magnifierSize, left: magnifierPos.x, top: magnifierPos.y },
                  ]}
                  pointerEvents="none"
              >
                <View style={magnifierStyles.inner}>
                  <Text style={magnifierStyles.label}>
                    {centerPoint.x}, {centerPoint.y}
                  </Text>
                  <View style={magnifierStyles.crosshair}>
                    <View style={magnifierStyles.crosshairV} />
                    <View style={magnifierStyles.crosshairH} />
                    <View style={magnifierStyles.crosshairDot} />
                  </View>
                </View>
              </View>
          )}
        </View>

        {isLandscapeMode ? (
            <SafeAreaView className="absolute top-0 bottom-0 right-0" edges={["top", "bottom", "right"]} style={{ width: layoutConfig.sidePanelWidth }}>
              <View className="flex-1 bg-brand-black/95 border-l border-brand-green/30 px-3 pt-3">
                <HeaderCard icon={icons.target} title="Mark Position" subtitle="Tap where crosshair moved" compact />
                {centerPoint && (
                    <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
                      <SectionCard title="Micro Adjust" variant="secondary" compact>
                        <StepSizeSelector value={stepSize} onChange={setStepSize} compact />
                        <View className="items-center mt-3">
                          <Pressable
                              onPress={() => handleMicroAdjust("up")}
                              className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1"
                          >
                            <Image source={icons.chevronUp} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                          </Pressable>
                          <View className="flex-row items-center gap-1">
                            <Pressable
                                onPress={() => handleMicroAdjust("left")}
                                className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                            >
                              <Image source={icons.chevronLeft} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                            </Pressable>
                            <View className="w-9 h-9 rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center">
                              <Text className="text-white/50 text-[10px] font-mono">{stepSize}px</Text>
                            </View>
                            <Pressable
                                onPress={() => handleMicroAdjust("right")}
                                className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                            >
                              <Image source={icons.chevronRight} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                            </Pressable>
                          </View>
                          <Pressable
                              onPress={() => handleMicroAdjust("down")}
                              className="w-9 h-9 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1"
                          >
                            <Image source={icons.chevronDown} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                          </Pressable>
                        </View>
                        <PillButton label="Reset" onPress={handleResetPosition} variant="ghost" compact className="mt-2" />
                      </SectionCard>
                    </ScrollView>
                )}
                <View className="pb-3 pt-2">
                  <Pressable
                      onPress={handleConfirmPosition}
                      disabled={!centerPoint}
                      className={cn("rounded-xl items-center mb-2 py-2", centerPoint ? "bg-brand-greenLight" : "bg-brand-black/30")}
                  >
                    <Text className="text-white font-semibold text-sm">Confirm Position</Text>
                  </Pressable>
                  <View className="flex-row items-center justify-center gap-2">
                    <IconButton icon={icons.chevronLeft} onPress={handleBack} size="sm" />
                    <IconButton icon={icons.cancel} onPress={handleCancel} size="sm" />
                  </View>
                </View>
              </View>
            </SafeAreaView>
        ) : (
            <SafeAreaView
                className="absolute bottom-0 left-0 right-0 bg-brand-black/95 border-t border-brand-green/30"
                style={{ height: layoutConfig.bottomPanelTotalHeight }}
                edges={["bottom"]}
            >
              <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
                <HeaderCard icon={icons.target} title="Mark New Position" subtitle="Tap where the crosshair moved" compact />
                {centerPoint && (
                    <View className="mt-3 flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-xs mb-2">Step Size</Text>
                        <StepSizeSelector value={stepSize} onChange={setStepSize} />
                      </View>
                      <View className="items-center">
                        <Pressable
                            onPress={() => handleMicroAdjust("up")}
                            className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1"
                        >
                          <Image source={icons.chevronUp} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                        </Pressable>
                        <View className="flex-row items-center gap-1">
                          <Pressable
                              onPress={() => handleMicroAdjust("left")}
                              className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                          >
                            <Image source={icons.chevronLeft} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                          </Pressable>
                          <View className="w-10 h-10 rounded-xl bg-brand-black/50 items-center justify-center">
                            <Text className="text-white/50 text-xs font-mono">{stepSize}</Text>
                          </View>
                          <Pressable
                              onPress={() => handleMicroAdjust("right")}
                              className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                          >
                            <Image source={icons.chevronRight} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                          </Pressable>
                        </View>
                        <Pressable
                            onPress={() => handleMicroAdjust("down")}
                            className="w-10 h-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1"
                        >
                          <Image source={icons.chevronDown} className="w-5 h-5" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                        </Pressable>
                      </View>
                    </View>
                )}
                <Pressable
                    onPress={handleConfirmPosition}
                    disabled={!centerPoint}
                    className={cn("rounded-xl items-center mt-3 py-3", centerPoint ? "bg-brand-greenLight" : "bg-brand-black/30")}
                >
                  <Text className="text-white font-semibold text-base">Confirm Position</Text>
                </Pressable>
                <View className="flex-row items-center justify-center gap-4 mt-3">
                  <IconButton icon={icons.chevronLeft} onPress={handleBack} size="md" />
                  <IconButton icon={icons.cancel} onPress={handleCancel} size="md" />
                </View>
              </ScrollView>
            </SafeAreaView>
        )}

        {renderDirectionModal()}
        {renderSwappedModal()}
        {renderDialBackModal()}
      </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
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
    maxWidth: 340,
  },
  modalContentCompact: {
    maxWidth: 300,
    padding: 14,
  },
  iconContainer: {
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
    marginBottom: 16,
    lineHeight: 18,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(11,127,79,0.3)",
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.4)",
  },
  optionText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#0b7f4f",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(11,127,79,0.2)",
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.4)",
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  clickCountBox: {
    backgroundColor: "rgba(11,127,79,0.2)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(11,127,79,0.3)",
  },
  clickCountText: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },
  clickCountSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  warningIcon: {
    color: "#eab308",
    fontSize: 14,
    marginRight: 6,
  },
  warningText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  warningBold: {
    fontWeight: "600",
  },
});