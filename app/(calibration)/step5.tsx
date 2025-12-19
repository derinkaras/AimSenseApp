// ============================================================
// step5.tsx - Align Scope Center (Tap + Micro Adjust)
// ============================================================
// UI rules:
// - PORTRAIT: keep your original UI (bottom panel) unchanged
// - LANDSCAPE: Step5-style (camera left + flush right panel)
// - Magnifier: responsive size + clamped inside visible camera + pushed from left
// ⚠️ CRITICAL: Uses camera layout from store (set in step4)

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
    getMagnifierPosition,
    clampValue,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step5";
type StepSize = 1 | 5 | 10;

// Rotation range in degrees
const MAX_ROTATION = 45;
const MIN_ROTATION = -45;

export default function Step5() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();

    useFocusEffect(
        useCallback(() => {
            console.log(SCREEN_ID)

            setActiveScreen(SCREEN_ID);
            return () => {};
        }, [setActiveScreen])
    );

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const navigation = useNavigation();

    const mountOrientation = useCalibrationStore(selectMountOrientation);
    const cameraZoom = useCalibrationStore(selectCameraZoom);
    const focusPoint = useCalibrationStore(selectFocusPoint);
    const storedRotation = useCalibrationStore(selectScreenRotation);
    const setScopeCenterPx = useCalibrationStore((s) => s.setScopeCenterPx);
    const setElevationStartPx = useCalibrationStore((s) => s.setElevationStartPx);
    const setStoreRotation = useCalibrationStore((s) => s.setScreenRotation);
    const reset = useCalibrationStore((s) => s.resetCalibration);
    const storedCameraLayout = useCalibrationStore(selectCameraLayout); // ⚠️ Read from store

    const isLandscapeMode = isLandscape(mountOrientation);

    // Determine if focus is locked (autofocus should be off)
    const focusLocked = focusPoint !== null;

    // Local rotation state (synced with store)
    const [rotation, setRotation] = useState(storedRotation);

    // Rotation transform style
    const rotationTransform = { transform: [{ rotate: `${rotation}deg` }] };

    // Center point state
    const [centerPoint, setCenterPoint] = useState<ScopeCenterPx | null>(null);
    const [stepSize, setStepSize] = useState<StepSize>(1);
    const [lastTapPoint, setLastTapPoint] = useState<ScopeCenterPx | null>(null);

    // Track camera view bounds
    const cameraViewRef = useRef<View>(null);
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
        console.warn("⚠️ Step5: Camera layout not in store, using local calculation");
        return getCameraLayoutConfig(width, height, isLandscapeMode, insets.bottom);
    }, [storedCameraLayout, width, height, isLandscapeMode, insets.bottom]);

    // Magnifier position using centralized function
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
        if (lastTapPoint) setCenterPoint(lastTapPoint);
    };

    const handleRotationChange = (value: number) => {
        // Round to 0.5 degree increments
        const rounded = Math.round(value * 2) / 2;
        setRotation(rounded);
    };

    const handleResetRotation = () => setRotation(0);

    const handleNext = () => {
        if (!centerPoint) return;
        setScopeCenterPx(centerPoint);
        setElevationStartPx(centerPoint);
        setStoreRotation(rotation); // Save rotation to store
        router.push("/(calibration)/step6");
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

    // Compact sizing for landscape D-pad
    const dpBtn = isLandscapeMode ? "size-9" : "size-10";
    const dpIcon = isLandscapeMode ? "w-4 h-4" : "w-5 h-5";

    // ============================================================
    // LANDSCAPE: Step4-style (camera left + flush right panel)
    // ============================================================
    if (isLandscapeMode) {
        return (
            <View className="flex-1 bg-brand-black">
                {/* Camera Feed (left region) */}
                <View
                    ref={cameraViewRef}
                    onLayout={handleCameraLayout}
                    style={[
                        StyleSheet.absoluteFill,
                        { right: layoutConfig.cameraInsets.padRight, bottom: layoutConfig.cameraInsets.padBottom },
                    ]}
                >
                    {shouldRenderCamera && (
                        <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                            <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                                <CameraView
                                    style={StyleSheet.absoluteFill}
                                    facing="back"
                                    zoom={cameraZoom}
                                    autofocus={focusLocked ? "off" : "on"}
                                />
                            </View>

                            {centerPoint && (
                                <View
                                    style={[
                                        styles.crosshairContainer,
                                        { left: centerPoint.x - 30, top: centerPoint.y - 30 },
                                    ]}
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
                                        <Text style={styles.guideText}>Tap on the crosshair center</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    )}

                    {/* Magnifier (clamped + pushed from left) */}
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

                {/* Right panel (flush right) */}
                <SafeAreaView
                    className="absolute top-0 bottom-0 right-0"
                    edges={["top", "bottom", "right"]}
                    style={{ width: layoutConfig.sidePanelWidth }}
                >
                    <View className="flex-1 bg-brand-black/95 border-l border-brand-green/30">
                        {/* Header - Fixed at top */}
                        <View className="px-3 pt-3 pb-2">
                            <View className="flex-row items-start">
                                <View className="size-8 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                                    <Image
                                        source={icons.target}
                                        className="w-4 h-4"
                                        resizeMode="contain"
                                        tintColor="#0b7f4f"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">
                                        Align Scope Center
                                    </Text>
                                    <Text className="text-white/60 text-[11px]">
                                        Tap, then fine-tune.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Scrollable Content */}
                        <ScrollView
                            className="flex-1 px-3"
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            {/* Rotation Control - always visible */}
                            <View className="mt-2 rounded-xl bg-brand-greenDark/50 border border-brand-green/40 p-2 mb-2">
                                <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-white font-semibold text-[11px]">Rotation</Text>
                                    <Text className={`font-mono text-[11px] ${rotation === 0 ? "text-white/50" : "text-brand-greenLight"}`}>
                                        {rotation > 0 ? "+" : ""}{rotation.toFixed(1)}°
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
                                <View className="flex-row justify-between px-1">
                                    <Text className="text-white/40 text-[9px]">-45°</Text>
                                    <Pressable onPress={handleResetRotation}>
                                        <Text className="text-brand-greenLight/70 text-[9px] font-semibold">Reset</Text>
                                    </Pressable>
                                    <Text className="text-white/40 text-[9px]">+45°</Text>
                                </View>
                            </View>

                            {!centerPoint ? (
                                <View className="p-3 rounded-2xl bg-brand-black/40 border border-brand-green/25">
                                    <Text className="text-white/70 text-[12px] leading-4">
                                        Take your time — this sets your overlay reference.
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
                                            <Image
                                                source={icons.chevronUp}
                                                className={dpIcon}
                                                resizeMode="contain"
                                                tintColor="#0b7f4f"
                                            />
                                        </Pressable>

                                        <View className="flex-row items-center gap-1">
                                            <Pressable
                                                onPress={() => handleMicroAdjust("left")}
                                                className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center`}
                                            >
                                                <Image
                                                    source={icons.chevronLeft}
                                                    className={dpIcon}
                                                    resizeMode="contain"
                                                    tintColor="#0b7f4f"
                                                />
                                            </Pressable>

                                            <View className={`${dpBtn} rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center`}>
                                                <Text className="text-white/50 text-[11px] font-mono">
                                                    {stepSize}px
                                                </Text>
                                            </View>

                                            <Pressable
                                                onPress={() => handleMicroAdjust("right")}
                                                className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center`}
                                            >
                                                <Image
                                                    source={icons.chevronRight}
                                                    className={dpIcon}
                                                    resizeMode="contain"
                                                    tintColor="#0b7f4f"
                                                />
                                            </Pressable>
                                        </View>

                                        <Pressable
                                            onPress={() => handleMicroAdjust("down")}
                                            className={`${dpBtn} rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1`}
                                        >
                                            <Image
                                                source={icons.chevronDown}
                                                className={dpIcon}
                                                resizeMode="contain"
                                                tintColor="#0b7f4f"
                                            />
                                        </Pressable>
                                    </View>

                                    <Pressable
                                        onPress={handleReset}
                                        className="mt-3 py-2 rounded-xl bg-brand-black/40 border border-brand-green/30 items-center"
                                    >
                                        <Text className="text-white/75 text-[12px] font-semibold">
                                            Reset to tap
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleNext}
                                        className="mt-3 w-full py-3 rounded-2xl bg-brand-greenLight border border-brand-green/60 items-center"
                                    >
                                        <Text className="text-white font-semibold text-sm">Save Center</Text>
                                    </Pressable>
                                </>
                            )}
                        </ScrollView>

                        {/* Back / Cancel - Fixed at bottom */}
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

    // ============================================================
    // PORTRAIT: keep your original UI unchanged
    // ============================================================

    // Control panel dimensions based on orientation (portrait uses original bottom panel)
    const controlPanelHeight = 240;

    return (
        <View className="flex-1 bg-brand-black">
            {/* Camera Feed (tappable area) */}
            <View
                ref={cameraViewRef}
                onLayout={handleCameraLayout}
                style={[StyleSheet.absoluteFill, { bottom: controlPanelHeight + layoutConfig.bottomPadding }]}
            >
                {shouldRenderCamera && (
                    <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                        <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                facing="back"
                                zoom={cameraZoom}
                                autofocus={focusLocked ? "off" : "on"}
                            />
                        </View>

                        {/* Crosshair overlay at center point */}
                        {centerPoint && (
                            <View
                                style={[
                                    styles.crosshairContainer,
                                    { left: centerPoint.x - 30, top: centerPoint.y - 30 },
                                ]}
                                pointerEvents="none"
                            >
                                <View style={styles.crosshairVertical} />
                                <View style={styles.crosshairHorizontal} />
                                <View style={styles.crosshairCenter} />
                            </View>
                        )}

                        {/* Guide text when no point set */}
                        {!centerPoint && (
                            <View style={styles.guideOverlay}>
                                <View style={styles.guideBox}>
                                    <Text style={styles.guideText}>Tap on the crosshair center</Text>
                                </View>
                            </View>
                        )}
                    </Pressable>
                )}

                {/* Magnifier (portrait original: top-right) */}
                {centerPoint && (
                    <View
                        style={[
                            styles.magnifier,
                            { width: 120, height: 120, top: insets.top + 10, right: 10 },
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

            {/* Control Panel (portrait original) */}
            <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={["bottom"]} style={{ maxHeight: height * 0.6 }}>
                <View
                    style={{ paddingBottom: layoutConfig.bottomPadding }}
                    className="bg-brand-black/95 border-t border-brand-green/30"
                >
                    {/* Scrollable Content */}
                    <ScrollView
                        className="px-4 pt-4"
                        showsVerticalScrollIndicator={true}
                        bounces={false}
                        style={{ maxHeight: height * 0.42 }}
                    >
                        {/* Header */}
                        <View className="flex-row items-center mb-3">
                            <View className="size-9 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                                <Image
                                    source={icons.target}
                                    className="w-5 h-5"
                                    resizeMode="contain"
                                    tintColor="#0b7f4f"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-semibold text-base">Align Scope Center</Text>
                                <Text className="text-white/60 text-xs">Tap the crosshair center, then fine-tune.</Text>
                            </View>
                        </View>

                        {/* Rotation Control - always visible */}
                        <View className="rounded-xl bg-brand-greenDark/50 border border-brand-green/40 p-3 mb-3">
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className="text-white font-semibold text-sm">Rotation</Text>
                                <Text className={`font-mono text-sm ${rotation === 0 ? "text-white/50" : "text-brand-greenLight"}`}>
                                    {rotation > 0 ? "+" : ""}{rotation.toFixed(1)}°
                                </Text>
                            </View>
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
                            <View className="flex-row justify-between px-1">
                                <Text className="text-white/40 text-[10px]">-45°</Text>
                                <Pressable onPress={handleResetRotation}>
                                    <Text className="text-brand-greenLight/70 text-[10px] font-semibold">Reset</Text>
                                </Pressable>
                                <Text className="text-white/40 text-[10px]">+45°</Text>
                            </View>
                        </View>

                        {centerPoint ? (
                            <>
                                {/* Micro Adjust Controls */}
                                <View className="flex-row gap-3 pb-2">
                                    {/* D-Pad */}
                                    <View className="flex-1 items-center">
                                        <View className="items-center">
                                            {/* Up */}
                                            <Pressable
                                                onPress={() => handleMicroAdjust("up")}
                                                className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mb-1"
                                            >
                                                <Image
                                                    source={icons.chevronUp}
                                                    className="w-5 h-5"
                                                    resizeMode="contain"
                                                    tintColor="#0b7f4f"
                                                />
                                            </Pressable>

                                            {/* Left / Center / Right */}
                                            <View className="flex-row items-center gap-1">
                                                <Pressable
                                                    onPress={() => handleMicroAdjust("left")}
                                                    className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                                                >
                                                    <Image
                                                        source={icons.chevronLeft}
                                                        className="w-5 h-5"
                                                        resizeMode="contain"
                                                        tintColor="#0b7f4f"
                                                    />
                                                </Pressable>

                                                <View className="size-10 rounded-xl bg-brand-black/50 border border-brand-green/20 items-center justify-center">
                                                    <Text className="text-white/50 text-xs font-mono">{stepSize}px</Text>
                                                </View>

                                                <Pressable
                                                    onPress={() => handleMicroAdjust("right")}
                                                    className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center"
                                                >
                                                    <Image
                                                        source={icons.chevronRight}
                                                        className="w-5 h-5"
                                                        resizeMode="contain"
                                                        tintColor="#0b7f4f"
                                                    />
                                                </Pressable>
                                            </View>

                                            {/* Down */}
                                            <Pressable
                                                onPress={() => handleMicroAdjust("down")}
                                                className="size-10 rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mt-1"
                                            >
                                                <Image
                                                    source={icons.chevronDown}
                                                    className="w-5 h-5"
                                                    resizeMode="contain"
                                                    tintColor="#0b7f4f"
                                                />
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
                    </ScrollView>

                    {/* Back / Cancel - Fixed at bottom, outside ScrollView */}
                    <View className="flex-row px-4 pt-3 gap-3">
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