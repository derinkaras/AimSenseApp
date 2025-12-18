// ============================================================
// step5.tsx - Align Scope Center (Tap + Micro Adjust)
// ============================================================
// UI rules:
// - PORTRAIT: keep your original UI (bottom panel) unchanged
// - LANDSCAPE: Step5-style (camera left + flush right panel)
// - Magnifier: responsive size + clamped inside visible camera + pushed from left

import React, { useCallback, useMemo, useRef, useState } from "react";
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
    selectCameraZoom,
    selectFocusPoint,
    isLandscape,
    ScopeCenterPx,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step5";
type StepSize = 1 | 5 | 10;

const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

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
    const setScopeCenterPx = useCalibrationStore((s) => s.setScopeCenterPx);
    const setElevationStartPx = useCalibrationStore((s) => s.setElevationStartPx);
    const reset = useCalibrationStore((s) => s.resetCalibration);

    const isLandscapeMode = isLandscape(mountOrientation);

    // Determine if focus is locked (autofocus should be off)
    const focusLocked = focusPoint !== null;

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

    const bottomPadding = Math.max(insets.bottom, 8);

    // ---------------------------
    // Responsive sizing (landscape)
    // ---------------------------
    const SIDE_PANEL_W = useMemo(() => {
        const w = Math.round(width * 0.34);
        return clamp(w, 220, 280);
    }, [width]);

    const MAGNIFIER_SIZE = useMemo(() => {
        const base = isLandscapeMode ? width * 0.12 : width * 0.22;
        return clamp(Math.round(base), isLandscapeMode ? 84 : 100, isLandscapeMode ? 120 : 140);
    }, [width, isLandscapeMode]);

    const bottomPanelHeight = 240;

    const cameraInsets = useMemo(() => {
        if (isLandscapeMode) {
            return { padRight: SIDE_PANEL_W, padBottom: 0 };
        }
        return { padRight: 0, padBottom: bottomPanelHeight + bottomPadding };
    }, [isLandscapeMode, SIDE_PANEL_W, bottomPanelHeight, bottomPadding]);

    // Magnifier clamped to visible camera area.
    // Also "push farther from left" to avoid edge hugs and small-phone clipping.
    const magnifierPos = useMemo(() => {
        const margin = 10;

        // stronger push from left (scales with device; clamps)
        const LEFT_SAFE_PAD = clamp(Math.round(width * 0.06), 24, 44);

        const fallbackW = Math.max(0, width - cameraInsets.padRight);
        const fallbackH = Math.max(0, height - cameraInsets.padBottom);

        // Prefer measured camera layout, fallback to effective screen region.
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
        cameraInsets.padBottom,
        cameraLayout.width,
        cameraLayout.height,
        MAGNIFIER_SIZE,
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

    const handleNext = () => {
        if (!centerPoint) return;
        setScopeCenterPx(centerPoint);
        setElevationStartPx(centerPoint);
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
                        { right: cameraInsets.padRight, bottom: cameraInsets.padBottom },
                    ]}
                >
                    {shouldRenderCamera && (
                        <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                facing="back"
                                zoom={cameraZoom}
                                autofocus={focusLocked ? "off" : "on"}
                            />

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

                        <View className="flex-1 px-3">
                            {!centerPoint ? (
                                <View className="mt-2 p-3 rounded-2xl bg-brand-black/40 border border-brand-green/25">
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
                style={[StyleSheet.absoluteFill, { bottom: controlPanelHeight + bottomPadding }]}
            >
                {shouldRenderCamera && (
                    <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            zoom={cameraZoom}
                            autofocus={focusLocked ? "off" : "on"}
                        />

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
            <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={["bottom"]}>
                <View
                    style={{ paddingBottom: bottomPadding }}
                    className="bg-brand-black/95 border-t border-brand-green/30 px-4 pt-4"
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

                    {centerPoint ? (
                        <>
                            {/* Micro Adjust Controls */}
                            <View className="flex-row gap-3">
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