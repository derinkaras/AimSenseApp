// ============================================================
// step7.tsx - Second Turret Calibration (Windage or Elevation)
// ============================================================
// Two phases:
// 1. Instruct user to dial turret any direction by X clicks
// 2. User confirms new crosshair position
//
// If axesSwapped is true (user turned windage in step6), this step
// calibrates ELEVATION instead. Otherwise calibrates WINDAGE.
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
    CALIBRATION_CLICK_COUNT,
    ScopeCenterPx,
    getClickSizeLabel,
    getCameraLayoutConfig,
    getMagnifierPosition,
    clampValue,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step7";

type Phase = "instruction" | "confirm" | "verify";
type StepSize = 1 | 5 | 10;
type Direction = "up" | "down" | "left" | "right";

export default function Step7() {
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

    // Normal flow (windage)
    const setWindageEndPx = useCalibrationStore((s) => s.setWindageEndPx);
    const calculateWindageScale = useCalibrationStore((s) => s.calculateWindageScale);

    // Swapped flow (elevation)
    const setElevationEndPx = useCalibrationStore((s) => s.setElevationEndPx);
    const calculateElevationScale = useCalibrationStore((s) => s.calculateElevationScale);

    const reset = useCalibrationStore((s) => s.resetCalibration);
    const storedCameraLayout = useCalibrationStore(selectCameraLayout); // ⚠️ Read from store

    const isLandscapeMode = isLandscape(mountOrientation);

    // Determine what we're calibrating based on axesSwapped
    const calibratingElevation = axesSwapped;
    const turretName = calibratingElevation ? "ELEVATION" : "WINDAGE";
    const expectedDirection = calibratingElevation ? "VERTICALLY" : "HORIZONTALLY";
    const expectedDirectionDetail = calibratingElevation ? "up or down" : "left or right";
    const turretLocation = calibratingElevation
        ? "Elevation turret is usually on top of the scope"
        : "Windage turret is usually on the side of the scope";
    const icon = calibratingElevation ? icons.arrowUp : icons.arrowRight;

    // Phase state
    const [phase, setPhase] = useState<Phase>("instruction");

    // Center point state (for confirm phase)
    const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
    const [stepSize, setStepSize] = useState<StepSize>(1);
    const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);

    // Modal state
    const [showDialBackModal, setShowDialBackModal] = useState(false);

    // Camera layout
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
        console.warn("⚠️ Step7: Camera layout not in store, using local calculation");
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

        console.log("📍 Step7 handleConfirmPosition:", {
            calibratingElevation,
            centerPoint
        });

        if (calibratingElevation) {
            // Swapped: save as elevation
            console.log("📍 Setting elevationEndPx:", centerPoint);
            setElevationEndPx(centerPoint);
            calculateElevationScale();
        } else {
            // Normal: save as windage
            console.log("📍 Setting windageEndPx:", centerPoint);
            setWindageEndPx(centerPoint);
            calculateWindageScale();
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
        router.push("/(calibration)/step8");
    };

    const handleBack = () => {
        if (phase === "verify") {
            // Go back to confirm phase
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
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            })
        );
    };

    // ------------------------------------------------------------
    // Magnifier position using centralized layout config
    // ------------------------------------------------------------
    const magnifierPos = useMemo(() => {
        const fallbackW = Math.max(0, width - layoutConfig.cameraInsets.padRight);
        const fallbackH = Math.max(0, height - layoutConfig.cameraInsets.padBottom);
        const containerW = cameraLayout.width > 0 ? cameraLayout.width : fallbackW;
        const containerH = cameraLayout.height > 0 ? cameraLayout.height : fallbackH;

        // Default position in top-left area
        return getMagnifierPosition(
            layoutConfig.magnifierSize / 2 + 50,
            layoutConfig.magnifierSize / 2 + insets.top + 20,
            containerW,
            containerH,
            layoutConfig.magnifierSize,
            width,
            insets.top
        );
    }, [
        width,
        height,
        insets.top,
        layoutConfig.cameraInsets.padRight,
        layoutConfig.cameraInsets.padBottom,
        layoutConfig.magnifierSize,
        cameraLayout.width,
        cameraLayout.height,
    ]);

    const dpBtn = isLandscapeMode ? "size-9" : "size-10";
    const dpIcon = isLandscapeMode ? "w-4 h-4" : "w-5 h-5";

    // ============================================================
    // Dial Back Modal
    // ============================================================
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
                        Before continuing, please dial the {calibratingElevation ? "elevation" : "windage"} turret back {CALIBRATION_CLICK_COUNT} clicks to return to your original zero position.
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
                                        <Image source={icon} className="w-8 h-8" resizeMode="contain" tintColor="#22c55e" />
                                    </View>
                                    <Text className="text-white text-2xl font-bold text-center">
                                        {calibratingElevation ? "Elevation" : "Windage"} Calibration
                                    </Text>
                                </View>
                            )}

                            {/* --- LANDSCAPE: TWO-COLUMN --- */}
                            {isLandscapeMode ? (
                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <View className="flex-row items-center mb-2">
                                            <View className="size-10 rounded-xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-2">
                                                <Image source={icon} className="w-5 h-5" resizeMode="contain" tintColor="#22c55e" />
                                            </View>
                                            <Text className="text-white text-lg font-bold">
                                                {calibratingElevation ? "Elevation" : "Windage"} Calibration
                                            </Text>
                                        </View>

                                        <View className="bg-brand-black/40 rounded-2xl px-3 py-2 mb-2">
                                            <Text className="text-white/80 text-center text-xs mb-1">
                                                Turn the <Text className="text-white font-bold">{turretName}</Text> turret
                                            </Text>

                                            <View className="flex-row items-end justify-center">
                                                <Text className="text-brand-greenLight text-xl font-extrabold mr-2">ANY DIRECTION</Text>
                                            </View>

                                            <View className="flex-row items-center justify-center mt-1">
                                                <Text className="text-white text-2xl font-extrabold">{CALIBRATION_CLICK_COUNT}</Text>
                                                <Text className="text-white/70 text-sm font-semibold ml-1">clicks</Text>
                                            </View>

                                            <Text className="text-white/50 text-center text-[10px] mt-1">
                                                ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                                            </Text>

                                            {/* Click accuracy + direction reminder */}
                                            <Text className="text-white/70 text-center text-[10px] mt-2 leading-4">
                                                Listen to each click carefully — going above or under reduces precision.{"\n"}
                                                Remember the direction you turn — you’ll reverse the same clicks later.
                                            </Text>
                                        </View>

                                        <View className="bg-yellow-500/20 rounded-xl px-3 py-2 border border-yellow-500/40">
                                            <Text className="text-yellow-200 text-[11px] text-center leading-4">
                                                {calibratingElevation ? "↕" : "↔"} Should move {expectedDirection} ({expectedDirectionDetail})
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="w-44 justify-between">
                                        <View>
                                            <Pressable
                                                onPress={handleDialed}
                                                className="rounded-2xl py-3 items-center bg-brand-greenLight border border-brand-green/60"
                                            >
                                                <Text className="text-white text-base font-semibold">I've dialed it</Text>
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
                                            Turn the <Text className="text-white font-bold">{turretName}</Text> turret
                                        </Text>
                                        <Text className="text-brand-greenLight text-center text-2xl font-bold mb-2">ANY DIRECTION</Text>
                                        <Text className="text-white text-center text-3xl font-bold">
                                            {CALIBRATION_CLICK_COUNT} clicks
                                        </Text>
                                        <Text className="text-white/50 text-center text-sm mt-2">
                                            ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                                        </Text>

                                        {/* Click accuracy + direction reminder */}
                                        <Text className="text-white/70 text-center text-xs mt-3 leading-5">
                                            Listen to each click carefully — going above or under reduces precision.{"\n"}
                                            Remember the direction you turn — you’ll reverse the same clicks later.
                                        </Text>
                                    </View>

                                    <View className="bg-yellow-500/20 rounded-xl px-4 py-3 mb-4 border border-yellow-500/40">
                                        <Text className="text-yellow-200 text-sm text-center font-medium">
                                            {`Crosshair should move ${expectedDirection} (${expectedDirectionDetail})`}
                                        </Text>
                                        <Text className="text-yellow-200/70 text-xs text-center mt-1">
                                            {turretLocation}
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={handleDialed}
                                        className="rounded-2xl py-5 items-center bg-brand-greenLight border border-brand-green/60"
                                    >
                                        <Text className="text-white text-xl font-semibold">I've dialed it</Text>
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
                                                left: scopeCenterPx.x - 30,
                                                top: scopeCenterPx.y - 30,
                                            },
                                        ]}
                                        pointerEvents="none"
                                    >
                                        <View style={styles.crosshairVertical} />
                                        <View style={styles.crosshairHorizontal} />
                                        <View style={styles.crosshairCenter} />
                                    </View>

                                    {/* Coordinate label below crosshair */}
                                    <View
                                        style={{
                                            position: "absolute",
                                            left: scopeCenterPx.x - 40,
                                            top: scopeCenterPx.y + 35,
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
                        <View className="flex-1 bg-brand-black py-6">
                            {/* Icon */}
                            <View className="items-center mb-2">
                                <View className="size-14 rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center">
                                    <Image source={icons.target} className="w-7 h-7" resizeMode="contain" tintColor="#22c55e" />
                                </View>
                            </View>

                            {/* Title */}
                            <Text className="text-white text-lg font-bold text-center mb-1">Verify Position</Text>

                            {/* Subtitle */}
                            <Text className="text-white/60 text-sm text-center mb-4">Confirm marker aligns with crosshair</Text>

                            {/* Spacer */}
                            <View className="flex-1 justify-center items-center">
                                {/* Position Box */}
                                {scopeCenterPx && (
                                    <View className="rounded-2xl p-4 bg-brand-greenDark/40 border border-brand-green/40 mb-4">
                                        <Text className="text-white/50 text-xs text-center mb-2">Original Position</Text>
                                        <Text className="text-brand-greenLight font-mono text-2xl font-bold text-center">
                                            ({scopeCenterPx.x}, {scopeCenterPx.y})
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Main Button */}
                            <Pressable
                                onPress={handleVerifyConfirm}
                                className="rounded-2xl py-3 mb-2 items-center bg-brand-greenLight border border-brand-green/60"
                            >
                                <Text className="text-white font-bold text-sm">Finish Calibration</Text>
                            </Pressable>

                            {/* Secondary Buttons */}
                            <View className="flex-row gap-2">
                                <Pressable
                                    onPress={handleBack}
                                    className="flex-1 rounded-2xl py-2.5 items-center bg-brand-black/60 border border-brand-green/30"
                                >
                                    <Text className="text-white/80 font-semibold text-xs">Back</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleCancel}
                                    className="flex-1 rounded-2xl py-2.5 items-center bg-brand-black/60 border border-brand-green/30"
                                >
                                    <Text className="text-white/80 font-semibold text-xs">Cancel</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        /* ==================== PORTRAIT VERIFY ==================== */
                        <View className="flex-1 bg-brand-black px-5">
                            {/* Header Row */}
                            <View className="flex-row items-center mb-4">
                                {/* Icon */}
                                <View className="size-12 rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center mr-3">
                                    <Image source={icons.target} className="w-6 h-6" resizeMode="contain" tintColor="#22c55e" />
                                </View>

                                {/* Title + Subtitle */}
                                <View className="flex-1">
                                    <Text className="text-white text-xl font-bold">Verify Position</Text>
                                    <Text className="text-white/60 text-sm">Confirm marker aligns with crosshair</Text>
                                </View>

                                {/* Position Box */}
                                {scopeCenterPx && (
                                    <View className="bg-brand-greenDark/50 border border-brand-green/40 rounded-xl px-3 py-2">
                                        <Text className="text-white/50 text-[10px]">Position</Text>
                                        <Text className="text-brand-greenLight font-mono text-base font-bold">
                                            ({scopeCenterPx.x}, {scopeCenterPx.y})
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Spacer */}
                            <View className="flex-1" />

                            {/* Main Button */}
                            <Pressable
                                onPress={handleVerifyConfirm}
                                className="rounded-2xl py-4 mb-3 items-center bg-brand-greenLight border border-brand-green/60"
                            >
                                <Text className="text-white font-bold text-lg">Finish Calibration</Text>
                            </Pressable>

                            {/* Secondary Buttons */}
                            <View className="flex-row gap-3">
                                <Pressable
                                    onPress={handleBack}
                                    className="flex-1 rounded-2xl py-3 items-center bg-brand-black/60 border border-brand-green/30"
                                >
                                    <Text className="text-white/80 font-semibold text-sm">Back</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleCancel}
                                    className="flex-1 rounded-2xl py-3 items-center bg-brand-black/60 border border-brand-green/30"
                                >
                                    <Text className="text-white/80 font-semibold text-sm">Cancel</Text>
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
                                    style={[styles.crosshairContainer, { left: centerPoint.x - 30, top: centerPoint.y - 30 }]}
                                    pointerEvents="none"
                                >
                                    <View style={styles.crosshairVertical} />
                                    <View style={styles.crosshairHorizontal} />
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
                                    left: magnifierPos.left,
                                    top: magnifierPos.top,
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
                                    <Text className="text-white font-semibold text-sm">{`Confirm New Crosshair ${ axesSwapped ? "Elevation" : "Windage"} Position`}</Text>
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

                                    <Pressable
                                        onPress={handleConfirmPosition}
                                        className="mt-3 w-full py-3 rounded-2xl bg-brand-greenLight border border-brand-green/60 items-center"
                                    >
                                        <Text className="text-white font-semibold text-sm">Confirm Position</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>

                        <View className="px-3 pb-3">
                            <View className="flex-row mt-2 gap-2">
                                <Pressable
                                    onPress={handleBack}
                                    className="flex-1 py-2 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
                                >
                                    <Text className="text-white/90 font-semibold text-[12px]">Back</Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleCancel}
                                    className="flex-1 py-2 rounded-xl items-center bg-brand-black/50 border border-brand-green/35"
                                >
                                    <Text className="text-white/90 font-semibold text-[12px]">Cancel</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>

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
                            <View style={[styles.crosshairContainer, { left: centerPoint.x - 30, top: centerPoint.y - 30 }]} pointerEvents="none">
                                <View style={styles.crosshairVertical} />
                                <View style={styles.crosshairHorizontal} />
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
                            <Text className="text-white font-semibold text-base">{`Confirm New Crosshair ${ axesSwapped ? "Elevation" : "Windage"} Position`}</Text>
                            <Text className="text-white/60 text-xs">Tap the crosshair center, then fine-tune.</Text>
                        </View>
                    </View>

                    {centerPoint ? (
                        <View className="flex-row gap-3">
                            <View className="flex-1 items-center">
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

                            <View className="justify-center">
                                <Pressable
                                    onPress={handleConfirmPosition}
                                    className="px-5 py-4 rounded-2xl bg-brand-greenLight border border-brand-green/60 items-center justify-center"
                                >
                                    <Text className="text-white font-semibold text-sm">Confirm</Text>
                                    <Text className="text-white font-semibold text-sm">Position</Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <View className="py-4">
                            <Text className="text-white/60 text-center text-sm">Tap where the crosshair moved to after dialing.</Text>
                        </View>
                    )}

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

            {renderDialBackModal()}
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
    modalIconContainer: {
        alignItems: "center",
        marginBottom: 16,
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
});