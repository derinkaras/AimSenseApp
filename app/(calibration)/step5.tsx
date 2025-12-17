// ============================================================
// step5.tsx - Elevation Dial Calibration
// ============================================================
// Two phases:
// 1. Instruct user to dial elevation UP by X clicks
// 2. User confirms new crosshair position
//
// UI rules:
// - Instruction (green card): keep as you have it (portrait + landscape)
// - Confirm:
//    - PORTRAIT: keep existing bottom panel UI
//    - LANDSCAPE: Step4-style (camera left + flush right panel)
//      + responsive magnifier clamped inside visible camera + pushed from left

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
    isLandscape,
    CALIBRATION_CLICK_COUNT,
    ScopeCenterPx,
    getClickSizeLabel,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step5";

type Phase = "instruction" | "confirm";
type StepSize = 1 | 5 | 10;
type Direction = "up" | "down" | "left" | "right";

const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

export default function Step5() {
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
    const setElevationEndPx = useCalibrationStore((s) => s.setElevationEndPx);
    const setElevationInverted = useCalibrationStore((s) => s.setElevationInverted);
    const calculateElevationScale = useCalibrationStore((s) => s.calculateElevationScale);
    const setWindageStartPx = useCalibrationStore((s) => s.setWindageStartPx);
    const reset = useCalibrationStore((s) => s.resetCalibration);

    const isLandscapeMode = isLandscape(mountOrientation);

    // Phase state
    const [phase, setPhase] = useState<Phase>("instruction");

    // Center point state (for confirm phase)
    const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
    const [stepSize, setStepSize] = useState<StepSize>(1);
    const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);

    // Unexpected behavior modal
    const [showUnexpectedModal, setShowUnexpectedModal] = useState(false);

    // Camera layout (used for micro adjust clamping + magnifier clamping)
    const [cameraLayout, setCameraLayout] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
    if (isLandscapeMode) safeAreaEdges.push("left", "right");

    const bottomPadding = Math.max(insets.bottom, 8);

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
        setElevationEndPx(centerPoint);
        setWindageStartPx(centerPoint);
        calculateElevationScale();
        router.push("/(calibration)/step6");
    };

    // Unexpected behavior handling
    const handleUnexpectedBehavior = () => setShowUnexpectedModal(true);

    const handleUnexpectedDirection = (direction: Direction) => {
        // If user says crosshair moved DOWN when they dialed UP, it's inverted
        if (direction === "down") setElevationInverted(true);
        setShowUnexpectedModal(false);
    };

    const handleBack = () => {
        if (phase === "confirm") {
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
    // Confirm-phase LANDSCAPE layout sizing (Step4-style)
    // ------------------------------------------------------------
    const SIDE_PANEL_W = useMemo(() => {
        const w = Math.round(width * 0.34);
        return clamp(w, 220, 280);
    }, [width]);

    const MAGNIFIER_SIZE = useMemo(() => {
        const base = width * 0.12;
        return clamp(Math.round(base), 84, 120);
    }, [width]);

    const cameraInsets = useMemo(() => {
        return { padRight: SIDE_PANEL_W, padBottom: 0 };
    }, [SIDE_PANEL_W]);

    const magnifierPos = useMemo(() => {
        const margin = 10;

        // push farther from the left edge (scaled + clamped)
        const LEFT_SAFE_PAD = clamp(Math.round(width * 0.06), 24, 44);

        const fallbackW = Math.max(0, width - cameraInsets.padRight);
        const fallbackH = Math.max(0, height);

        const containerW = cameraLayout.width > 0 ? cameraLayout.width : fallbackW;
        const containerH = cameraLayout.height > 0 ? cameraLayout.height : fallbackH;

        const leftMin = LEFT_SAFE_PAD;
        const leftMax = Math.max(leftMin, containerW - MAGNIFIER_SIZE - margin);

        const topMin = insets.top + margin;
        const topMax = Math.max(topMin, containerH - MAGNIFIER_SIZE - margin);

        return {
            left: clamp(LEFT_SAFE_PAD, leftMin, leftMax),
            top: clamp(insets.top + margin, topMin, topMax),
        };
    }, [
        width,
        height,
        insets.top,
        cameraInsets.padRight,
        cameraLayout.width,
        cameraLayout.height,
        MAGNIFIER_SIZE,
    ]);

    const dpBtn = isLandscapeMode ? "size-9" : "size-10";
    const dpIcon = isLandscapeMode ? "w-4 h-4" : "w-5 h-5";

    // ============================================================
    // Unexpected Behavior Modal (shared by all phases)
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
                        isLandscapeMode && styles.modalContentLandscape,
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={styles.modalTitle}>Unexpected behavior</Text>
                    <Text style={styles.modalSubtitle}>
                        When you made that adjustment, the crosshair moved:
                    </Text>

                    <View style={styles.modalButtonContainer}>
                        {(["up", "down"] as Direction[]).map((dir) => (
                            <Pressable
                                key={dir}
                                onPress={() => handleUnexpectedDirection(dir)}
                                style={styles.modalOptionButton}
                            >
                                <Text style={styles.modalOptionText}>{dir.toUpperCase()}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        onPress={() => setShowUnexpectedModal(false)}
                        style={styles.modalCancelButton}
                    >
                        <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );

    // ============================================================
    // Instruction Phase
    // ============================================================
    if (phase === "instruction") {
        return (
            <View className="flex-1 bg-brand-black">
                {shouldRenderCamera && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

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
                                                <Text className="text-brand-greenLight text-2xl font-extrabold mr-2">UP</Text>
                                                <Text className="text-white text-2xl font-extrabold">{CALIBRATION_CLICK_COUNT}</Text>
                                                <Text className="text-white/70 text-sm font-semibold ml-1">clicks</Text>
                                            </View>

                                            <Text className="text-white/50 text-center text-[10px] mt-1">
                                                ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                                            </Text>
                                        </View>

                                        <View className="bg-brand-black/30 rounded-xl px-3 py-2">
                                            <Text className="text-white/70 text-[11px] text-center leading-4">
                                                Elevation is usually on top of the scope.{"\n"}
                                                Follow the arrow marked on your turret.
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
                                                <Text className="text-white/50 text-xs underline">Unexpected behavior?</Text>
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
                                        <Text className="text-brand-greenLight text-center text-4xl font-bold mb-2">UP</Text>
                                        <Text className="text-white text-center text-3xl font-bold">
                                            {CALIBRATION_CLICK_COUNT} clicks
                                        </Text>
                                        <Text className="text-white/50 text-center text-sm mt-2">
                                            ({getClickSizeLabel(scopeUnit, clickSize)} per click)
                                        </Text>
                                    </View>

                                    <View className="bg-brand-black/30 rounded-xl px-4 py-3 mb-4">
                                        <Text className="text-white/70 text-sm text-center">
                                            Elevation is usually on top of the scope.{"\n"}
                                            Follow the arrow marked on your turret.
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={handleDialed}
                                        className="rounded-2xl py-5 items-center bg-brand-greenLight border border-brand-green/60"
                                    >
                                        <Text className="text-white text-xl font-semibold">I've dialed it</Text>
                                    </Pressable>

                                    <Pressable onPress={handleUnexpectedBehavior} className="mt-3 py-3 items-center">
                                        <Text className="text-white/50 text-sm underline">Unexpected behavior?</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>

                        {/* Back / Cancel (PORTRAIT ONLY, landscape handled in-card) */}
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
            </View>
        );
    }

    // ============================================================
    // Confirm Phase
    // - PORTRAIT: keep your existing bottom panel UI
    // - LANDSCAPE: Step4-style (camera left + flush right panel)
    // ============================================================

    if (isLandscapeMode) {
        return (
            <View className="flex-1 bg-brand-black">
                {/* Camera region (left) */}
                <View
                    onLayout={handleCameraLayout}
                    style={[StyleSheet.absoluteFill, { right: cameraInsets.padRight, bottom: cameraInsets.padBottom }]}
                >
                    {shouldRenderCamera && (
                        <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                            <CameraView style={StyleSheet.absoluteFill} facing="back" />

                            {/* Crosshair overlay */}
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

                            {/* Guide text when no point set */}
                            {!centerPoint && (
                                <View style={styles.guideOverlay} pointerEvents="none">
                                    <View style={styles.guideBox}>
                                        <Text style={styles.guideText}>Tap the crosshair center</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    )}

                    {/* Magnifier (responsive + clamped + pushed from left) */}
                    {centerPoint && (
                        <View
                            style={[
                                styles.magnifier,
                                {
                                    width: MAGNIFIER_SIZE,
                                    height: MAGNIFIER_SIZE,
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

                {/* Right panel (flush right) */}
                <SafeAreaView
                    className="absolute top-0 bottom-0 right-0"
                    edges={["top", "bottom", "right"]}
                    style={{ width: SIDE_PANEL_W }}
                >
                    <View className="flex-1 bg-brand-black/95 border-l border-brand-green/30">
                        {/* Header */}
                        <View className="px-3 pt-3 pb-2">
                            <View className="flex-row items-start">
                                <View className="size-8 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                                    <Image source={icons.target} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">Confirm New Crosshair</Text>
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
                                    {/* Step */}
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

                                    {/* D-pad */}
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

                        {/* Back / Cancel */}
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
            </View>
        );
    }

    // ---------------------------
    // PORTRAIT confirm (unchanged)
    // ---------------------------
    const controlPanelHeight = 240;

    return (
        <View className="flex-1 bg-brand-black">
            {/* Camera Feed (tappable area) */}
            <View onLayout={handleCameraLayout} style={[StyleSheet.absoluteFill, { bottom: controlPanelHeight + bottomPadding }]}>
                {shouldRenderCamera && (
                    <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                        <CameraView style={StyleSheet.absoluteFill} facing="back" />

                        {/* Crosshair overlay */}
                        {centerPoint && (
                            <View style={[styles.crosshairContainer, { left: centerPoint.x - 30, top: centerPoint.y - 30 }]} pointerEvents="none">
                                <View style={styles.crosshairVertical} />
                                <View style={styles.crosshairHorizontal} />
                                <View style={styles.crosshairCenter} />
                            </View>
                        )}

                        {/* Guide text when no point set */}
                        {!centerPoint && (
                            <View style={styles.guideOverlay}>
                                <View style={styles.guideBox}>
                                    <Text style={styles.guideText}>Tap the crosshair center</Text>
                                </View>
                            </View>
                        )}
                    </Pressable>
                )}

                {/* Magnifier (portrait original: top-right 120) */}
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

            {/* Control Panel (portrait unchanged) */}
            <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={["bottom"]}>
                <View style={{ paddingBottom: bottomPadding }} className="bg-brand-black/95 border-t border-brand-green/30 px-4 pt-4">
                    {/* Header */}
                    <View className="flex-row items-center mb-3">
                        <View className="size-9 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                            <Image source={icons.target} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-semibold text-base">Confirm New Crosshair Position</Text>
                            <Text className="text-white/60 text-xs">Tap the crosshair center again, then fine-tune.</Text>
                        </View>
                    </View>

                    {centerPoint ? (
                        <View className="flex-row gap-3">
                            {/* D-Pad */}
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

                            {/* Confirm Button */}
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
    // Modal styles (landscape-safe)
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
        maxWidth: 400,
        paddingVertical: 20,
        paddingHorizontal: 28,
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