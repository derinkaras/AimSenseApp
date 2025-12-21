// ============================================================
// step6.tsx - First Turret Calibration (Expects Elevation)
// ============================================================
// Two phases:
// 1. Instruct user to dial ELEVATION any direction by X clicks
// 2. User confirms new crosshair position
//
// If crosshair moved horizontally instead of vertically,
// user turned the wrong turret (windage). We accept it as
// windage calibration and swap so step7 does elevation.
// ⚠️ CRITICAL: Uses camera layout from store (set in step4)

import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    StyleSheet,
    Modal,
    GestureResponderEvent,
    useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
    useCalibrationStore,
    selectMountOrientation,
    selectClickSize,
    selectScopeUnit,
    selectAxesSwapped,
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
    clampValue,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step6";

type Phase = "instruction" | "confirm" | "verify";
type StepSize = 1 | 5 | 10;
type Direction = "up" | "down" | "left" | "right";
type AxisDirection = "vertical" | "horizontal";

export default function Step6() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();

    useFocusEffect(
        useCallback(() => {
            console.log(SCREEN_ID);
            setActiveScreen(SCREEN_ID);
            return () => {};
        }, [setActiveScreen])
    );

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { width, height } = useWindowDimensions();

    const mountOrientation = useCalibrationStore(selectMountOrientation);
    const clickSize = useCalibrationStore(selectClickSize);
    const scopeUnit = useCalibrationStore(selectScopeUnit);
    const axesSwapped = useCalibrationStore(selectAxesSwapped);
    const cameraZoom = useCalibrationStore(selectCameraZoom);
    const focusPoint = useCalibrationStore(selectFocusPoint);
    const screenRotation = useCalibrationStore(selectScreenRotation);
    const scopeCenterPx = useCalibrationStore(selectScopeCenterPx);

    // Determine if focus is locked (autofocus should be off)
    const focusLocked = focusPoint !== null;

    // Rotation transform style
    const rotationTransform = { transform: [{ rotate: `${screenRotation}deg` }] };

    const setElevationEndPx = useCalibrationStore((s) => s.setElevationEndPx);
    const calculateElevationScale = useCalibrationStore((s) => s.calculateElevationScale);
    const setWindageStartPx = useCalibrationStore((s) => s.setWindageStartPx);

    // Windage actions (if wrong turret)
    const setWindageEndPx = useCalibrationStore((s) => s.setWindageEndPx);
    const calculateWindageScale = useCalibrationStore((s) => s.calculateWindageScale);
    const setElevationStartPx = useCalibrationStore((s) => s.setElevationStartPx);

    // Axes swap
    const setAxesSwapped = useCalibrationStore((s) => s.setAxesSwapped);

    const reset = useCalibrationStore((s) => s.resetCalibration);
    const storedCameraLayout = useCalibrationStore(selectCameraLayout); // ⚠️ Read from store

    const isLandscapeMode = isLandscape(mountOrientation);

    // Calculate click count based on scope unit and click size
    const calibrationClickCount = getCalibrationClickCount(scopeUnit, clickSize);
    const targetMovement = getTargetMovementLabel(scopeUnit);

    // Phase state
    const [phase, setPhase] = useState<Phase>("instruction");

    // Center point state (for confirm phase)
    const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
    const [stepSize, setStepSize] = useState<StepSize>(1);
    const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);

    // Modals
    const [showUnexpectedModal, setShowUnexpectedModal] = useState(false);
    const [showSwappedModal, setShowSwappedModal] = useState(false);
    const [showDialBackModal, setShowDialBackModal] = useState(false);

    // Camera layout (used for micro adjust clamping + magnifier clamping)
    const [cameraLayout, setCameraLayout] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
    if (isLandscapeMode) safeAreaEdges.push("left", "right");

    // ⚠️ CRITICAL: Use layout from store (set in step4), fallback to local calculation
    const layoutConfig = useMemo(() => {
        if (storedCameraLayout) {
            return storedCameraLayout;
        }
        // Fallback if store not yet populated (shouldn't happen in normal flow)
        console.warn("⚠️ Step6: Camera layout not in store, using local calculation");
        return getCameraLayoutConfig(width, height, isLandscapeMode, insets.bottom);
    }, [storedCameraLayout, width, height, isLandscapeMode, insets.bottom]);

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

    const handleMicroAdjust = (direction: Direction) => {
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

    const handleResetPosition = () => {
        if (lastTapPoint) setCenterPoint(lastTapPoint);
    };

    // Phase transitions
    const handleDialed = () => setPhase("confirm");

    const handleConfirmPosition = () => {
        if (!centerPoint) return;

        console.log("📍 Step6 handleConfirmPosition:", {
            axesSwapped,
            centerPoint,
            scopeCenterPx
        });

        if (axesSwapped) {
            // User turned windage turret instead of elevation - save as WINDAGE calibration
            // Windage started at scope center, ended at centerPoint
            if (scopeCenterPx) {
                console.log("📍 Setting windageStartPx to scopeCenterPx:", scopeCenterPx);
                setWindageStartPx(scopeCenterPx);
            } else {
                console.warn("⚠️ scopeCenterPx is null in swapped flow!");
            }
            setWindageEndPx(centerPoint);
            calculateWindageScale();
            // Note: elevationStartPx was already set in step5 as scopeCenterPx
            // Step7 will calibrate elevation since axes are swapped
        } else {
            // Normal flow: save as ELEVATION calibration
            // Elevation started at scope center (set in step5), ended at centerPoint
            setElevationEndPx(centerPoint);
            // After user dials back, windage will start from scope center
            if (scopeCenterPx) {
                console.log("📍 Setting windageStartPx to scopeCenterPx:", scopeCenterPx);
                setWindageStartPx(scopeCenterPx);
            } else {
                console.warn("⚠️ scopeCenterPx is null in normal flow!");
            }
            calculateElevationScale();
        }

        // Show dial back confirmation modal
        setShowDialBackModal(true);
    };

    const handleDialBackConfirmed = () => {
        setShowDialBackModal(false);
        // Go to verification phase - show scope center for visual confirmation
        setPhase("verify");
    };

    const handleVerifyConfirm = () => {
        router.push("/(calibration)/step7");
    };

    // Unexpected behavior handling
    const handleUnexpectedBehavior = () => setShowUnexpectedModal(true);

    const handleAxisDirection = (axis: AxisDirection) => {
        setShowUnexpectedModal(false);

        if (axis === "vertical") {
            // Correct! They turned elevation turret - movement is vertical
            // Just close modal, they can continue normally
        } else {
            // Wrong turret! They turned windage instead of elevation
            // We'll save this as windage calibration
            setShowSwappedModal(true);
        }
    };

    const handleSwappedConfirm = () => {
        // Mark that axes are swapped (they turned windage instead of elevation)
        setAxesSwapped(true);
        setShowSwappedModal(false);
        // Go to confirm phase - they still need to tap the position
        setPhase("confirm");
    };

    const handleBack = () => {
        if (phase === "verify") {
            // Go back to confirm phase
            setPhase("confirm");
        } else if (phase === "confirm") {
            setPhase("instruction");
            setCenterPoint(null);
            setAxesSwapped(false)
        } else {
            router.back();
        }
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

    // ------------------------------------------------------------
    // Magnifier position - as top-left as possible respecting safe areas
    // ------------------------------------------------------------
    const magnifierPos = useMemo(() => {
        const halfMag = layoutConfig.magnifierSize / 2;

        // Minimum padding from edges
        const edgePadding = 4;

        // Respect safe areas (notch/dynamic island)
        const safeLeft = isLandscapeMode ? Math.max(insets.left, edgePadding) : edgePadding;
        const safeTop = Math.max(insets.top, edgePadding);

        return {
            x: safeLeft + halfMag + edgePadding,
            y: safeTop + halfMag + edgePadding
        };
    }, [isLandscapeMode, insets.left, insets.top, layoutConfig.magnifierSize]);

    const dpBtn = isLandscapeMode ? "size-9" : "size-10";
    const dpIcon = isLandscapeMode ? "w-4 h-4" : "w-5 h-5";

    // ============================================================
    // Modals
    // ============================================================
    const renderUnexpectedModal = () => (
        <Modal
            visible={showUnexpectedModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowUnexpectedModal(false)}
            supportedOrientations={["portrait", "landscape"]}
        >
            <Pressable
                style={styles.modalOverlay}
                onPress={() => setShowUnexpectedModal(false)}
            >
                <Pressable
                    style={[
                        styles.modalContent,
                        isLandscapeMode && styles.modalContentLandscapeCompact,
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[styles.modalTitle, isLandscapeMode && styles.modalTitleLandscape]}>Which way did it move?</Text>

                    {/* Shorter text in landscape */}
                    <Text style={[styles.modalSubtitle, isLandscapeMode && styles.modalSubtitleLandscape]}>
                        {isLandscapeMode
                            ? "Note the direction the crosshair moved when you dialed."
                            : "When you dialed the turret, note the direction the crosshair moved.\nListen to each click carefully — over- or under-dialing will reduce precision.\nRemember the direction you turned — you'll need to dial back the same number of clicks later."
                        }
                    </Text>

                    <View style={[styles.modalButtonContainer, isLandscapeMode && styles.modalButtonContainerLandscape]}>
                        <Pressable
                            onPress={() => handleAxisDirection("vertical")}
                            style={[styles.modalOptionButton, isLandscapeMode && styles.modalOptionButtonLandscape]}
                        >
                            <Text style={[styles.modalOptionText, isLandscapeMode && styles.modalOptionTextLandscape]}>↑ UP or DOWN ↓</Text>
                            <Text style={[styles.modalOptionSubtext, isLandscapeMode && styles.modalOptionSubtextLandscape]}>Vertical</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleAxisDirection("horizontal")}
                            style={[styles.modalOptionButton, isLandscapeMode && styles.modalOptionButtonLandscape]}
                        >
                            <Text style={[styles.modalOptionText, isLandscapeMode && styles.modalOptionTextLandscape]}>← LEFT or RIGHT →</Text>
                            <Text style={[styles.modalOptionSubtext, isLandscapeMode && styles.modalOptionSubtextLandscape]}>Horizontal</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => setShowUnexpectedModal(false)}
                        style={[styles.modalCancelButton, isLandscapeMode && styles.modalCancelButtonLandscape]}
                    >
                        <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );

    const renderSwappedModal = () => (
        <Modal
            visible={showSwappedModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSwappedModal(false)}
            supportedOrientations={["portrait", "landscape"]}
        >
            <Pressable
                style={styles.modalOverlay}
                onPress={() => {}}
            >
                <View
                    style={[
                        styles.modalContent,
                        isLandscapeMode && styles.modalContentLandscape,
                    ]}
                >
                    <View style={styles.modalIconContainer}>
                        <Text style={styles.modalIcon}>✓</Text>
                    </View>

                    <Text style={styles.modalTitle}>No problem!</Text>

                    {/* UPDATED COPY */}
                    <Text style={styles.modalSubtitle}>
                        Looks like you turned the windage turret instead of elevation. That's okay — we'll use this for windage calibration.
                    </Text>
                    <Pressable
                        onPress={handleSwappedConfirm}
                        style={styles.modalPrimaryButton}
                    >
                        <Text style={styles.modalPrimaryButtonText}>Continue</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );

    const renderDialBackModal = () => (
        <Modal
            visible={showDialBackModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDialBackModal(false)}
            supportedOrientations={["portrait", "landscape"]}
        >
            <Pressable
                style={styles.modalOverlay}
                onPress={() => {}}
            >
                <View
                    style={[
                        styles.modalContent,
                        isLandscapeMode && styles.modalContentLandscape,
                    ]}
                >


                    <Text style={styles.modalTitle}>Dial Back to Zero</Text>

                    <Text style={styles.modalSubtitle}>
                        Before continuing, please dial the {axesSwapped ? "windage" : "elevation"} turret back {calibrationClickCount} clicks to return to your original zero position.
                    </Text>

                    <View style={styles.modalButtonContainer}>
                        <Pressable
                            onPress={handleDialBackConfirmed}
                            style={styles.modalPrimaryButton}
                        >
                            <Text style={styles.modalPrimaryButtonText}>I've Dialed Back</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );

    // ============================================================
    // Instruction Phase
    // ============================================================
    if (phase === "instruction") {
        return (
            <View className="flex-1 bg-brand-black">
                {shouldRenderCamera && (
                    <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                        <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                    </View>
                )}

                <SafeAreaView className="flex-1" edges={safeAreaEdges}>
                    <View className={`flex-1 ${isLandscapeMode ? "px-4" : "px-6"} pt-4 justify-center`}>
                        {/* Main Instruction Card */}
                        <View
                            className={[
                                "rounded-3xl bg-brand-greenDark/85 border border-brand-green/60",
                                isLandscapeMode ? "p-4" : "p-6",
                            ].join(" ")}
                        >
                            {/* --- PORTRAIT HEADER --- */}
                            {!isLandscapeMode && (
                                <View className="items-center mb-4">
                                    <View className="size-16 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mb-3">
                                        <Image source={icons.arrowUp} className="w-8 h-8" resizeMode="contain" tintColor="#22c55e" />
                                    </View>
                                    <Text className="text-white text-2xl font-bold text-center">Elevation Calibration</Text>
                                </View>
                            )}

                            {/* --- LANDSCAPE: TWO-COLUMN, COMPACT --- */}
                            {isLandscapeMode ? (
                                <View className="flex-row gap-3">
                                    {/* Left: Instruction content */}
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-2">
                                            <View className="size-10 rounded-xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-2">
                                                <Image source={icons.arrowUp} className="w-5 h-5" resizeMode="contain" tintColor="#22c55e" />
                                            </View>
                                            <Text className="text-white text-lg font-bold">Elevation Calibration</Text>
                                        </View>

                                        <View className="bg-brand-black/40 rounded-2xl px-3 py-2 mb-2">
                                            <Text className="text-white/80 text-center text-xs mb-1">
                                                Turn the <Text className="text-white font-bold">ELEVATION</Text> turret
                                            </Text>

                                            <View className="flex-row items-end justify-center">
                                                <Text className="text-brand-greenLight text-xl font-extrabold mr-2">ANY DIRECTION</Text>
                                            </View>

                                            <View className="flex-row items-center justify-center mt-1">
                                                <Text className="text-white text-2xl font-extrabold">{calibrationClickCount}</Text>
                                                <Text className="text-white/70 text-sm font-semibold ml-1">clicks</Text>
                                                <Text className="text-brand-greenLight text-sm font-bold ml-1">= {targetMovement}</Text>
                                            </View>

                                            <Text className="text-white/50 text-center text-[10px] mt-1">
                                                ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                                            </Text>

                                            {/* ADDED COPY (no UI change, just text) */}
                                            <Text className="text-white/70 text-center text-[10px] mt-2 leading-4">
                                                Listen to each click carefully — going above or under reduces precision.{"\n"}
                                                Remember the direction you turn — you’ll reverse the same clicks later.
                                            </Text>
                                        </View>

                                        <View className="bg-yellow-500/20 rounded-xl px-3 py-2 border border-yellow-500/40">
                                            <Text className="text-yellow-200 text-[11px] text-center leading-4">
                                                Should move VERTICALLY (up/down)
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Right: Primary action + links + nav */}
                                    <View className="w-44 justify-between">
                                        <View>
                                            <Pressable
                                                onPress={handleDialed}
                                                className="rounded-2xl py-3 items-center bg-brand-greenLight border border-brand-green/60"
                                            >
                                                <Text className="text-white text-base font-semibold">I've dialed it</Text>
                                            </Pressable>

                                            <Pressable onPress={handleUnexpectedBehavior} className="mt-2 py-2 items-center">
                                                <Text className="text-white/50 text-xs underline">It moved sideways?</Text>
                                            </Pressable>
                                        </View>

                                        <View className="gap-2 mt-2">
                                            <Pressable
                                                onPress={handleBack}
                                                className="py-3 rounded-2xl items-center bg-brand-black/50 border border-brand-green/35"
                                            >
                                                <Text className="text-white/90 font-semibold text-sm">Back</Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={handleCancel}
                                                className="py-3 rounded-2xl items-center bg-brand-black/50 border border-brand-green/35"
                                            >
                                                <Text className="text-white/90 font-semibold text-sm">Cancel</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                /* --- PORTRAIT BODY --- */
                                <>
                                    <View className="bg-brand-black/40 rounded-2xl p-4 mb-4">
                                        <Text className="text-white/80 text-center text-base mb-2">
                                            Turn the <Text className="text-white font-bold">ELEVATION</Text> turret
                                        </Text>
                                        <Text className="text-brand-greenLight text-center text-2xl font-bold mb-2">ANY DIRECTION</Text>
                                        <Text className="text-white text-center text-3xl font-bold">
                                            {calibrationClickCount} clicks
                                        </Text>
                                        <Text className="text-brand-greenLight text-center text-xl font-bold">
                                            = {targetMovement}
                                        </Text>
                                        <Text className="text-white/50 text-center text-sm mt-2">
                                            ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                                        </Text>

                                        {/* ADDED COPY (no UI change, just text) */}
                                        <Text className="text-white/70 text-center text-xs mt-3 leading-5">
                                            Listen to each click carefully — going above or under reduces precision.{"\n"}
                                            Remember the direction you turn — you’ll reverse the same clicks later.
                                        </Text>
                                    </View>

                                    <View className="bg-yellow-500/20 rounded-xl px-4 py-3 mb-4 border border-yellow-500/40">
                                        <Text className="text-yellow-200 text-sm text-center font-medium">
                                            Crosshair should move VERTICALLY (up or down)
                                        </Text>
                                        <Text className="text-yellow-200/70 text-xs text-center mt-1">
                                            Elevation turret is usually on top of the scope
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={handleDialed}
                                        className="rounded-2xl py-5 items-center bg-brand-greenLight border border-brand-green/60"
                                    >
                                        <Text className="text-white text-xl font-semibold">I've dialed it</Text>
                                    </Pressable>

                                    <Pressable onPress={handleUnexpectedBehavior} className="mt-3 py-3 items-center">
                                        <Text className="text-white/50 text-sm underline">It moved sideways instead?</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>

                        {/* Back / Cancel (PORTRAIT ONLY) */}
                        {!isLandscapeMode && (
                            <View className="flex-row mt-4 gap-3">
                                <Pressable
                                    onPress={handleBack}
                                    className="flex-1 py-4 rounded-2xl items-center bg-brand-black/50 border border-brand-green/35"
                                >
                                    <Text className="text-white/90 font-semibold text-base">Back</Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleCancel}
                                    className="flex-1 py-4 rounded-2xl items-center bg-brand-black/50 border border-brand-green/35"
                                >
                                    <Text className="text-white/90 font-semibold text-base">Cancel</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </SafeAreaView>

                {renderUnexpectedModal()}
                {renderSwappedModal()}
                {renderDialBackModal()}
            </View>
        );
    }

    // ============================================================
    // Verify Phase - Show scope center for visual confirmation
    // ============================================================
    if (phase === "verify") {
        return (
            <View className="flex-1 bg-brand-black">
                {/* Camera with scope center marker - MUST use same insets as step5 */}
                <View
                    onLayout={handleCameraLayout}
                    style={[StyleSheet.absoluteFill, { right: layoutConfig.cameraInsets.padRight, bottom: layoutConfig.cameraInsets.padBottom }]}
                >
                    {shouldRenderCamera && (
                        <View style={StyleSheet.absoluteFill}>
                            <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                                <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                            </View>

                            {/* Scope center marker - this is where crosshair should be */}
                            {scopeCenterPx && (
                                <>
                                    <View
                                        style={[
                                            styles.crosshairContainer,
                                            {
                                                left: scopeCenterPx.x - 40,
                                                top: scopeCenterPx.y - 40,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    >
                                        <View style={styles.crosshairTop} />
                                        <View style={styles.crosshairBottom} />
                                        <View style={styles.crosshairLeft} />
                                        <View style={styles.crosshairRight} />
                                        <View style={styles.crosshairCenter} />
                                    </View>

                                    {/* Coordinate label below crosshair */}
                                    <View
                                        style={{
                                            position: "absolute",
                                            left: scopeCenterPx.x - 40,
                                            top: scopeCenterPx.y + 45,
                                            backgroundColor: "rgba(0, 0, 0, 0.75)",
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: "rgba(11, 127, 79, 0.5)",
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

                {/* Control panel - MUST use same dimensions as step5 */}
                <SafeAreaView
                    className="flex-1"
                    edges={safeAreaEdges}
                    style={isLandscapeMode
                        ? { position: "absolute", right: 0, top: 0, bottom: 0, width: layoutConfig.sidePanelWidth }
                        : { position: "absolute", left: 0, right: 0, bottom: 0, height: layoutConfig.bottomPanelTotalHeight }
                    }
                >
                    {isLandscapeMode ? (
                        /* ==================== LANDSCAPE VERIFY ==================== */
                        <View className="flex-1 bg-brand-black py-4">
                            {/* Icon */}
                            <View className="items-center mb-2">
                                <View className="size-12 rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center">
                                    <Image source={icons.target} className="w-6 h-6" resizeMode="contain" tintColor="#22c55e" />
                                </View>
                            </View>

                            {/* Title */}
                            <Text className="text-white text-base font-bold text-center mb-2">Verify Turret Reset</Text>

                            {/* Explanation */}
                            <View className="px-3 mb-3">
                                <Text className="text-white/70 text-xs text-center leading-4">
                                    This step confirms you correctly dialed the turret back to its original position.
                                    The green marker should align with your scope's crosshair — if it doesn't, you may have miscounted clicks.
                                </Text>
                            </View>

                            {/* Position Box */}
                            <View className="flex-1 justify-center items-center">
                                {scopeCenterPx && (
                                    <View className="rounded-2xl p-3 bg-brand-greenDark/40 border border-brand-green/40">
                                        <Text className="text-white/50 text-[10px] text-center mb-1">Original Zero Position</Text>
                                        <Text className="text-brand-greenLight font-mono text-xl font-bold text-center">
                                            ({scopeCenterPx.x}, {scopeCenterPx.y})
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Navigation Buttons - Bottom of side panel */}
                            <View className="px-3 pb-3 pt-2">
                                <View className="flex-row items-center justify-center gap-2">
                                    <Pressable
                                        onPress={handleBack}
                                        className="size-10 rounded-xl items-center justify-center bg-brand-black/60 border border-brand-green/35"
                                    >
                                        <Image source={icons.chevronLeft} className="w-5 h-5" resizeMode="contain" tintColor="#e5e5e5" />
                                    </Pressable>

                                    <Pressable
                                        onPress={handleVerifyConfirm}
                                        className="size-10 rounded-xl items-center justify-center bg-brand-greenLight border border-brand-green/60"
                                    >
                                        <Image source={icons.chevronRight} className="w-5 h-5" resizeMode="contain" tintColor="#ffffff" />
                                    </Pressable>

                                    <Pressable
                                        onPress={handleCancel}
                                        className="size-10 rounded-xl items-center justify-center bg-brand-black/60 border border-brand-green/35"
                                    >
                                        <Image source={icons.cancel} className="w-5 h-5" resizeMode="contain" tintColor="#e5e5e5" />
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    ) : (
                        /* ==================== PORTRAIT VERIFY ==================== */
                        <View className="flex-1 bg-brand-black px-4 py-2 justify-between">
                            {/* Header Row */}
                            <View className="flex-row items-center">
                                {/* Icon */}
                                <View className="size-9 rounded-lg bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center mr-2">
                                    <Image source={icons.target} className="w-4 h-4" resizeMode="contain" tintColor="#22c55e" />
                                </View>

                                {/* Title */}
                                <View className="flex-1">
                                    <Text className="text-white text-base font-bold">Verify Turret Reset</Text>
                                </View>

                                {/* Position Box */}
                                {scopeCenterPx && (
                                    <View className="bg-brand-greenDark/50 border border-brand-green/40 rounded-lg px-2 py-1">
                                        <Text className="text-white/50 text-[8px]">Zero</Text>
                                        <Text className="text-brand-greenLight font-mono text-xs font-bold">
                                            ({scopeCenterPx.x}, {scopeCenterPx.y})
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Explanation Card - Compact */}
                            <View className="bg-brand-greenDark/30 border border-brand-green/30 rounded-lg px-3 py-2 my-2">
                                <Text className="text-white/80 text-xs leading-4">
                                    Confirm you dialed the turret back correctly. The green marker should align with your scope's crosshair.
                                </Text>
                            </View>

                            {/* Icon Buttons */}
                            <View className="flex-row items-center justify-center gap-3">
                                <Pressable
                                    onPress={handleBack}
                                    className="size-11 rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35"
                                >
                                    <Image source={icons.chevronLeft} className="w-5 h-5" resizeMode="contain" tintColor="#e5e5e5" />
                                </Pressable>

                                <Pressable
                                    onPress={handleVerifyConfirm}
                                    className="size-11 rounded-xl items-center justify-center bg-brand-greenLight border border-brand-green/60"
                                >
                                    <Image source={icons.chevronRight} className="w-5 h-5" resizeMode="contain" tintColor="#ffffff" />
                                </Pressable>

                                <Pressable
                                    onPress={handleCancel}
                                    className="size-11 rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35"
                                >
                                    <Image source={icons.cancel} className="w-5 h-5" resizeMode="contain" tintColor="#e5e5e5" />
                                </Pressable>
                            </View>
                        </View>
                    )}
                </SafeAreaView>
            </View>
        );
    }

    // ============================================================
    // Confirm Phase - LANDSCAPE
    // ============================================================
    if (isLandscapeMode) {
        return (
            <View className="flex-1 bg-brand-black">
                {/* Camera region (left) */}
                <View
                    onLayout={handleCameraLayout}
                    style={[StyleSheet.absoluteFill, { right: layoutConfig.cameraInsets.padRight, bottom: layoutConfig.cameraInsets.padBottom }]}
                >
                    {shouldRenderCamera && (
                        <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                            <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                                <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                            </View>

                            {centerPoint && (
                                <View
                                    style={[styles.crosshairContainer, { left: centerPoint.x - 40, top: centerPoint.y - 40 }]}
                                    pointerEvents="none"
                                >
                                    <View style={styles.crosshairTop} />
                                    <View style={styles.crosshairBottom} />
                                    <View style={styles.crosshairLeft} />
                                    <View style={styles.crosshairRight} />
                                    <View style={styles.crosshairCenter} />
                                </View>
                            )}

                            {!centerPoint && (
                                <View style={styles.guideOverlay} pointerEvents="none">
                                    <View style={styles.guideBox}>
                                        <Text style={styles.guideText}>Tap the crosshair center</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    )}

                    {centerPoint && (
                        <View
                            style={[
                                styles.magnifier,
                                {
                                    width: layoutConfig.magnifierSize,
                                    height: layoutConfig.magnifierSize,
                                    left: magnifierPos.x,
                                    top: magnifierPos.y,
                                },
                            ]}
                            pointerEvents="none"
                        >
                            <View style={styles.magnifierInner}>
                                <Text style={styles.magnifierLabel}>
                                    {centerPoint.x}, {centerPoint.y}
                                </Text>
                                <View style={styles.magnifierCrosshair}>
                                    <View style={styles.magnifierCrosshairV} />
                                    <View style={styles.magnifierCrosshairH} />
                                    <View style={styles.magnifierCrosshairDot} />
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Right panel */}
                <SafeAreaView
                    className="absolute top-0 bottom-0 right-0"
                    edges={["top", "bottom", "right"]}
                    style={{ width: layoutConfig.sidePanelWidth }}
                >
                    <View className="flex-1 bg-brand-black/95 border-l border-brand-green/30">
                        <View className="px-3 pt-3 pb-2">
                            <View className="flex-row items-start">
                                <View className="size-8 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                                    <Image source={icons.target} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">{`Confirm New ${ axesSwapped ? "Windage" : "Elevation"} Crosshair Position`}</Text>
                                    <Text className="text-white/60 text-[11px]">Tap, then fine-tune.</Text>
                                </View>
                            </View>
                        </View>

                        <View className="flex-1 px-3">
                            {!centerPoint ? (
                                <View className="mt-2 p-3 rounded-2xl bg-brand-black/40 border border-brand-green/25">
                                    <Text className="text-white/70 text-[12px] leading-4">
                                        Tap where the crosshair moved to after dialing.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <View className="mt-1">
                                        <Text className="text-white/50 text-[11px] mb-1">Step</Text>
                                        <View className="flex-row gap-1">
                                            {([1, 5, 10] as StepSize[]).map((size) => (
                                                <Pressable
                                                    key={size}
                                                    onPress={() => setStepSize(size)}
                                                    className={[
                                                        "flex-1 py-2 rounded-xl border items-center",
                                                        stepSize === size
                                                            ? "bg-brand-greenLight/20 border-brand-greenLight"
                                                            : "bg-brand-black/40 border-brand-green/30",
                                                    ].join(" ")}
                                                >
                                                    <Text
                                                        className={[
                                                            "text-[12px] font-semibold",
                                                            stepSize === size ? "text-white" : "text-white/60",
                                                        ].join(" ")}
                                                    >
                                                        {size}px
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>

                                    <View className="mt-3 items-center">
                                        <Pressable
                                            onPress={() => handleMicroAdjust("up")}
                                            className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1`}
                                        >
                                            <Image source={icons.chevronUp} className={dpIcon} resizeMode="contain" tintColor="#0b7f4f" />
                                        </Pressable>

                                        <View className="flex-row items-center gap-1">
                                            <Pressable
                                                onPress={() => handleMicroAdjust("left")}
                                                className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center`}
                                            >
                                                <Image source={icons.chevronLeft} className={dpIcon} resizeMode="contain" tintColor="#0b7f4f" />
                                            </Pressable>

                                            <View className={`${dpBtn} rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center`}>
                                                <Text className="text-white/50 text-[11px] font-mono">{stepSize}px</Text>
                                            </View>

                                            <Pressable
                                                onPress={() => handleMicroAdjust("right")}
                                                className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center`}
                                            >
                                                <Image source={icons.chevronRight} className={dpIcon} resizeMode="contain" tintColor="#0b7f4f" />
                                            </Pressable>
                                        </View>

                                        <Pressable
                                            onPress={() => handleMicroAdjust("down")}
                                            className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1`}
                                        >
                                            <Image source={icons.chevronDown} className={dpIcon} resizeMode="contain" tintColor="#0b7f4f" />
                                        </Pressable>
                                    </View>

                                    <Pressable
                                        onPress={handleResetPosition}
                                        className="mt-3 py-2 rounded-xl bg-brand-black/40 border border-brand-green/30 items-center"
                                    >
                                        <Text className="text-white/75 text-[12px] font-semibold">Reset to tap</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>

                        {/* Navigation Buttons - Bottom of side panel */}
                        <View className="px-3 pb-3 pt-2">
                            <View className="flex-row items-center justify-center gap-2">
                                <Pressable
                                    onPress={handleBack}
                                    className="size-10 rounded-xl items-center justify-center bg-brand-black/60 border border-brand-green/35"
                                >
                                    <Image source={icons.chevronLeft} className="w-5 h-5" resizeMode="contain" tintColor="#e5e5e5" />
                                </Pressable>

                                <Pressable
                                    onPress={handleConfirmPosition}
                                    disabled={!centerPoint}
                                    className={`size-10 rounded-xl items-center justify-center border ${centerPoint ? "bg-brand-greenLight border-brand-green/60" : "bg-brand-black/30 border-brand-green/30"}`}
                                >
                                    <Image source={icons.chevronRight} className="w-5 h-5" resizeMode="contain" tintColor={centerPoint ? "#ffffff" : "#666666"} />
                                </Pressable>

                                <Pressable
                                    onPress={handleCancel}
                                    className="size-10 rounded-xl items-center justify-center bg-brand-black/60 border border-brand-green/35"
                                >
                                    <Image source={icons.cancel} className="w-5 h-5" resizeMode="contain" tintColor="#e5e5e5" />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>

                {renderUnexpectedModal()}
                {renderSwappedModal()}
                {renderDialBackModal()}
            </View>
        );
    }

    // ============================================================
    // Confirm Phase - PORTRAIT
    // ============================================================
    const controlPanelHeight = 240;

    return (
        <View className="flex-1 bg-brand-black">
            <View onLayout={handleCameraLayout} style={[StyleSheet.absoluteFill, { bottom: controlPanelHeight + layoutConfig.bottomPadding }]}>
                {shouldRenderCamera && (
                    <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                        <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                            <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                        </View>

                        {centerPoint && (
                            <View style={[styles.crosshairContainer, { left: centerPoint.x - 40, top: centerPoint.y - 40 }]} pointerEvents="none">
                                <View style={styles.crosshairTop} />
                                <View style={styles.crosshairBottom} />
                                <View style={styles.crosshairLeft} />
                                <View style={styles.crosshairRight} />
                                <View style={styles.crosshairCenter} />
                            </View>
                        )}

                        {!centerPoint && (
                            <View style={styles.guideOverlay}>
                                <View style={styles.guideBox}>
                                    <Text style={styles.guideText}>Tap the crosshair center</Text>
                                </View>
                            </View>
                        )}
                    </Pressable>
                )}

                {centerPoint && (
                    <View
                        style={[styles.magnifier, { top: insets.top + 10, right: 10, width: 120, height: 120 }]}
                        pointerEvents="none"
                    >
                        <View style={styles.magnifierInner}>
                            <Text style={styles.magnifierLabel}>
                                {centerPoint.x}, {centerPoint.y}
                            </Text>
                            <View style={styles.magnifierCrosshair}>
                                <View style={styles.magnifierCrosshairV} />
                                <View style={styles.magnifierCrosshairH} />
                                <View style={styles.magnifierCrosshairDot} />
                            </View>
                        </View>
                    </View>
                )}
            </View>

            <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={["bottom"]}>
                <View style={{ paddingBottom: layoutConfig.bottomPadding }} className="bg-brand-black/95 border-t border-brand-green/30 px-4 pt-4">
                    <View className="flex-row items-center mb-3">
                        <View className="size-9 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                            <Image source={icons.target} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-semibold text-base">{`Confirm New ${ axesSwapped ? "Windage" : "Elevation"} Crosshair Position`}</Text>
                            <Text className="text-white/60 text-xs">Tap the crosshair center, then fine-tune.</Text>
                        </View>
                    </View>

                    {centerPoint ? (
                        <View className="flex-row gap-6 justify-center items-center">
                            <View className="items-center">
                                <View className="items-center">
                                    <Pressable
                                        onPress={() => handleMicroAdjust("up")}
                                        className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1"
                                    >
                                        <Image source={icons.chevronUp} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                                    </Pressable>

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

                                    <Pressable
                                        onPress={() => handleMicroAdjust("down")}
                                        className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1"
                                    >
                                        <Image source={icons.chevronDown} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                                    </Pressable>
                                </View>
                            </View>

                            <View className="items-center gap-2">
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
                                            <Text className={["text-xs font-semibold", stepSize === size ? "text-white" : "text-white/60"].join(" ")}>
                                                {size}px
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Pressable
                                    onPress={handleResetPosition}
                                    className="px-3 py-2 rounded-lg bg-brand-black/40 border border-brand-green/30 items-center"
                                >
                                    <Text className="text-white/70 text-xs font-semibold">Reset</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View className="py-4">
                            <Text className="text-white/60 text-center text-sm">Tap where the crosshair moved to after dialing.</Text>
                        </View>
                    )}

                    {/* CTAs - Icon Buttons */}
                    <View className="flex-row mt-3 items-center justify-center gap-4">
                        <Pressable
                            onPress={handleBack}
                            className="size-14 rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35"
                        >
                            <Image source={icons.chevronLeft} className="w-6 h-6" resizeMode="contain" tintColor="#e5e5e5" />
                        </Pressable>

                        <Pressable
                            onPress={handleConfirmPosition}
                            disabled={!centerPoint}
                            className={`size-14 rounded-xl items-center justify-center border ${centerPoint ? "bg-brand-greenLight border-brand-green/60" : "bg-brand-black/30 border-brand-green/30"}`}
                        >
                            <Image source={icons.chevronRight} className="w-6 h-6" resizeMode="contain" tintColor={centerPoint ? "#ffffff" : "#666666"} />
                        </Pressable>

                        <Pressable
                            onPress={handleCancel}
                            className="size-14 rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35"
                        >
                            <Image source={icons.cancel} className="w-6 h-6" resizeMode="contain" tintColor="#e5e5e5" />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>

            {renderUnexpectedModal()}
            {renderSwappedModal()}
            {renderDialBackModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    crosshairContainer: {
        position: "absolute",
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    // Open center design - 4 line segments with gap
    crosshairTop: {
        position: "absolute",
        width: 2,
        height: 32,
        top: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairBottom: {
        position: "absolute",
        width: 2,
        height: 32,
        bottom: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairLeft: {
        position: "absolute",
        width: 32,
        height: 2,
        left: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairRight: {
        position: "absolute",
        width: 32,
        height: 2,
        right: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairCenter: {
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#22c55e",
        borderWidth: 1.5,
        borderColor: "rgba(0, 0, 0, 0.6)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#0a0a0a",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(11, 127, 79, 0.4)",
        padding: 24,
        width: "100%",
        maxWidth: 340,
    },
    modalContentLandscape: {
        maxWidth: 420,
        paddingVertical: 20,
        paddingHorizontal: 28,
    },
    modalContentLandscapeCompact: {
        maxWidth: 480,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    modalTitleLandscape: {
        fontSize: 16,
        marginBottom: 4,
    },
    modalSubtitleLandscape: {
        fontSize: 12,
        marginBottom: 12,
        lineHeight: 16,
    },
    modalButtonContainerLandscape: {
        flexDirection: "row",
        gap: 10,
    },
    modalOptionButtonLandscape: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
    },
    modalOptionTextLandscape: {
        fontSize: 14,
    },
    modalOptionSubtextLandscape: {
        fontSize: 10,
        marginTop: 2,
    },
    modalCancelButtonLandscape: {
        marginTop: 10,
        paddingVertical: 8,
    },
    modalIconContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    modalIcon: {
        fontSize: 48,
        color: "#22c55e",
    },
    modalTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
    },
    modalSubtitle: {
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
    },
    modalButtonContainer: {
        gap: 12,
    },
    modalOptionButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: "rgba(11, 127, 79, 0.3)",
        borderWidth: 1,
        borderColor: "rgba(11, 127, 79, 0.4)",
    },
    modalOptionText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
    modalOptionSubtext: {
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 12,
        marginTop: 4,
    },
    modalPrimaryButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: "#0b7f4f",
        marginTop: 8,
    },
    modalPrimaryButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "600",
    },
    modalCancelButton: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalCancelText: {
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 14,
    },
});