// ============================================================
// app/(hunt)/active.tsx - Active Hunt Screen
// ============================================================
// Full hunt mode with:
// - G1 ballistics engine
// - Rangefinder mode (LOS vs Angle-Compensated)
// - Locked pitch for angle correction
// - Live cant rotation
// - Proper IMU mapping for portrait AND landscape

import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    StyleSheet,
    Modal,
    Animated,
    Easing,
    TextInput,
    Keyboard,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useNavigation, useIsFocused } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    useCalibrationStore,
    isLandscape,
    lockOrientation,
    DEFAULT_TILT_CONFIG,
    type MountOrientation,
} from "@/app/calibration/exports";
import {
    useHuntStore,
    selectSelectedGun,
    selectCalibrationResult,
} from "@/app/hunt/store";
import { useTiltLevel } from "@/app/hooks/useTiltLevel";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import { crosshairStyles } from "@/app/calibration/exports/calibrationStyles";

const SCREEN_ID = "active";
const STORAGE_KEY_TIP_DISMISSED = "aimsense.hunt.tipDismissed.v1";
const STORAGE_KEY_RANGEFINDER_MODE = "aimsense.hunt.rangefinderMode";

// Rangefinder mode types
type RangefinderMode = "LOS" | "COMPENSATED";

// ============================================================
// UNIT CONVERSIONS
// ============================================================

const YARDS_PER_METER = 1.0936133;
const INCHES_PER_CM = 0.393701;

function toYards(distance: number, isImperial: boolean): number {
    return isImperial ? distance : distance * YARDS_PER_METER;
}

function toInches(height: number, isImperial: boolean): number {
    return isImperial ? height : height * INCHES_PER_CM;
}

function formatDrop(dropInches: number, isImperial: boolean): string {
    if (isImperial) {
        return `${Math.round(dropInches)}"`;
    }
    return `${Math.round(dropInches / INCHES_PER_CM)} cm`;
}

// ============================================================
// BALLISTICS ENGINE - G1 Drag Model
// ============================================================

interface BallisticsResult {
    dropMOA: number;
    dropMIL: number;
    dropInches: number;
}

function computeBallistics(
    rangeYards: number,
    muzzleVelocityFps: number,
    ballisticCoefficient: number,
    scopeHeightInches: number,
    zeroRangeYards: number
): BallisticsResult {
    if (rangeYards <= 0) {
        return { dropMOA: 0, dropMIL: 0, dropInches: 0 };
    }

    const GRAVITY = 32.174; // ft/s²
    const rangeFt = rangeYards * 3;
    const zeroRangeFt = zeroRangeYards * 3;
    const scopeHeightFt = scopeHeightInches / 12;
    const bc = Math.max(0.1, ballisticCoefficient);

    // G1 drag coefficient by Mach number
    const getG1Cd = (v: number): number => {
        const mach = v / 1116; // Speed of sound ~1116 fps
        if (mach < 0.7) return 0.12 + 0.08 * mach;
        if (mach < 0.9) return 0.17 + 0.25 * (mach - 0.7);
        if (mach < 1.0) return 0.22 + 0.50 * (mach - 0.9);
        if (mach < 1.1) return 0.72 - 0.30 * (mach - 1.0);
        return 0.42 - 0.02 * Math.min(mach - 1.1, 1);
    };

    const dt = 0.0005; // Time step for integration

    // Find launch angle that zeros at zeroRange
    let launchAngle = 0;
    const avgVel = muzzleVelocityFps * 0.9;
    const timeToZero = zeroRangeFt / avgVel;
    const dropNoAngle = 0.5 * GRAVITY * timeToZero * timeToZero;
    launchAngle = Math.atan((dropNoAngle + scopeHeightFt) / zeroRangeFt);

    // Iterative refinement of launch angle
    for (let iter = 0; iter < 5; iter++) {
        let x = 0, y = scopeHeightFt, t = 0;
        let vx = muzzleVelocityFps * Math.cos(launchAngle);
        let vy = muzzleVelocityFps * Math.sin(launchAngle);

        while (x < zeroRangeFt && t < 3) {
            const v = Math.sqrt(vx * vx + vy * vy);
            const cd = getG1Cd(v);
            const drag = (cd / bc) * v * v * 0.00003;
            vx -= drag * (vx / v) * dt;
            vy -= (GRAVITY + drag * (vy / v)) * dt;
            x += vx * dt;
            y += vy * dt;
            t += dt;
        }
        launchAngle += (y / zeroRangeFt) * 0.5;
    }

    // Simulate trajectory to target range
    let x = 0, y = scopeHeightFt, t = 0;
    let vx = muzzleVelocityFps * Math.cos(launchAngle);
    let vy = muzzleVelocityFps * Math.sin(launchAngle);

    while (x < rangeFt && t < 5) {
        const v = Math.sqrt(vx * vx + vy * vy);
        const cd = getG1Cd(v);
        const drag = (cd / bc) * v * v * 0.00003;
        vx -= drag * (vx / v) * dt;
        vy -= (GRAVITY + drag * (vy / v)) * dt;
        x += vx * dt;
        y += vy * dt;
        t += dt;
    }

    // Convert drop to angular units
    const dropInches = Math.max(0, -y * 12);
    const dropMOA = rangeYards > 0 ? (dropInches / rangeYards) * (100 / 1.047) : 0;
    const dropMIL = rangeYards > 0 ? dropInches / (rangeYards * 0.036) : 0;

    return { dropMOA, dropMIL, dropInches };
}

// ============================================================
// IMU AXIS MAPPING
// ============================================================
// The useTiltLevel hook returns rollNow and pitchNow based on phone orientation.
// However, when the phone is mounted on a rifle scope, we need to map these
// to "cant" (side-to-side rifle tilt) and "elevation" (up/down aim).
//
// The hook's remapGravityToPortrait() transforms raw accelerometer data
// so that the OUTPUT is always in a "portrait-like" coordinate frame.
// This means:
//   - After remapping, rollNow = rotation around phone's long axis
//   - After remapping, pitchNow = tilt forward/backward of phone screen
//
// But for a SCOPE-MOUNTED phone (screen facing shooter's eye):
//   - CANT (rifle tilts left/right) = what the hook reports as pitchNow
//   - ELEVATION (rifle aims up/down) = what the hook reports as rollNow
//
// This is TRUE FOR ALL ORIENTATIONS because the hook already normalizes
// the coordinate frame via remapGravityToPortrait().

function mapIMUToRifleAxes(
    imuRoll: number,
    imuPitch: number,
    _mountOrientation: MountOrientation
): { cantNow: number; elevationNow: number } {
    // The hook's remapGravityToPortrait already normalizes coordinates.
    // For a scope-mounted phone (screen toward shooter):
    //   - Side-to-side rifle tilt (cant) affects imuPitch
    //   - Up/down rifle aim (elevation) affects imuRoll
    // This mapping is consistent across all orientations after the hook's remap.
    return {
        cantNow: imuPitch,
        elevationNow: imuRoll,
    };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ActiveHunt() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;
    const { activeScreen, setActiveScreen } = useCameraContext();
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();

    // UI State
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showCrosshair, setShowCrosshair] = useState(false);
    const [showDistanceInput, setShowDistanceInput] = useState(false);
    const [showCalibrationTip, setShowCalibrationTip] = useState(true);
    const [showRangefinderModal, setShowRangefinderModal] = useState(false);

    // Rangefinder mode - critical for angle correction
    const [rangefinderMode, setRangefinderMode] = useState<RangefinderMode | null>(null);

    // Animation refs (stable)
    const crosshairOpacity = useRef(new Animated.Value(0)).current;
    const holdoverOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(1)).current;

    // Shot State
    const [targetDistance, setTargetDistance] = useState<number | null>(null);
    const [distanceInputText, setDistanceInputText] = useState("");
    const [isTargetConfirmed, setIsTargetConfirmed] = useState(false);
    const [pitchLocked, setPitchLocked] = useState<number | null>(null);
    const [cantLocked, setCantLocked] = useState<number | null>(null);

    // Cant warning
    const [cantLevel, setCantLevel] = useState<"ok" | "warn" | "bad">("ok");

    // Stores
    const selectedGun = useHuntStore(selectSelectedGun);
    const calibrationResult = useHuntStore(selectCalibrationResult);
    const endHunt = useHuntStore((s) => s.endHunt);
    const resetCalibration = useCalibrationStore((s) => s.resetCalibration);

    // Extract calibration values (memoized)
    const calibrationData = useMemo(() => ({
        mountOrientation: calibrationResult?.mountOrientation ?? "portrait",
        cameraZoom: calibrationResult?.cameraZoom ?? 0,
        screenRotation: calibrationResult?.screenRotation ?? 0,
        focusPoint: calibrationResult?.focusPoint ?? null,
        scopeCenterPx: calibrationResult?.scopeCenterPx ?? null,
        pxPerUnitX: calibrationResult?.pxPerUnitX ?? 0,
        pxPerUnitY: calibrationResult?.pxPerUnitY ?? 0,
        scopeUnit: calibrationResult?.scopeUnit ?? "MOA",
        roll0: calibrationResult?.roll0 ?? 0,
        pitch0: calibrationResult?.pitch0 ?? 0,
        cameraLayout: calibrationResult?.cameraLayout ?? {
            sidePanelWidth: 200,
            bottomPanelHeight: 240,
            bottomPanelTotalHeight: 240,
            bottomPadding: 0,
            cameraInsets: { padRight: 200, padBottom: 240 },
        },
    }), [calibrationResult]);

    const isLandscapeMode = isLandscape(calibrationData.mountOrientation);
    const focusLocked = calibrationData.focusPoint !== null;

    // Gun profile data (memoized)
    const gunData = useMemo(() => ({
        isImperial: selectedGun?.unitSystem === "IMPERIAL",
        muzzleVelocityFps: selectedGun?.muzzleVelocityFps ?? 2700,
        ballisticCoefficient: selectedGun?.ballisticCoefficient ?? 0.4,
        zeroDistance: selectedGun?.zeroDistance ?? 100,
        scopeHeight: selectedGun?.scopeHeight ?? 1.5,
    }), [selectedGun]);

    const distanceUnit = gunData.isImperial ? "yd" : "m";

    // IMU - always enabled when focused
    const { rollNow: imuRoll, pitchNow: imuPitch } = useTiltLevel(
        calibrationData.mountOrientation as MountOrientation,
        DEFAULT_TILT_CONFIG,
        { enabled: isFocused, updateIntervalMs: 50 }
    );

    // Map IMU axes to rifle-meaningful values
    const { cantNow, elevationNow } = mapIMUToRifleAxes(
        imuRoll ?? 0,
        imuPitch ?? 0,
        calibrationData.mountOrientation as MountOrientation
    );

    // ==================== BALLISTICS COMPUTATION ====================

    const ballisticsData = useMemo(() => {
        if (!isTargetConfirmed || !targetDistance || !calibrationData.scopeCenterPx) {
            return null;
        }

        // Convert distance to yards
        let rangeYards = toYards(targetDistance, gunData.isImperial);
        const zeroYards = toYards(gunData.zeroDistance, gunData.isImperial);
        const scopeHeightIn = toInches(gunData.scopeHeight, gunData.isImperial);

        // Apply angle correction ONLY if rangefinder gives LOS distance
        // If rangefinder already compensates, skip this to avoid double-correction
        let rangeHorizontal = rangeYards;
        if (rangefinderMode === "LOS" && pitchLocked !== null) {
            const pitchRad = (pitchLocked * Math.PI) / 180;
            rangeHorizontal = rangeYards * Math.cos(pitchRad);
        }
        // If rangefinderMode === "COMPENSATED", rangeHorizontal = rangeYards (no cosine)

        // Compute ballistics
        const result = computeBallistics(
            rangeHorizontal,
            gunData.muzzleVelocityFps,
            gunData.ballisticCoefficient,
            scopeHeightIn,
            zeroYards
        );

        // Get drop in scope units (D = vertical correction)
        const D = calibrationData.scopeUnit === "MOA" ? result.dropMOA : result.dropMIL;
        const W = 0; // Wind correction (not implemented yet)

        // Calculate current cant relative to locked position
        // When cantLocked is null (before target confirmation), use 0 as baseline
        // After confirmation, cantLocked holds the cant angle at confirmation time
        const currentCant = cantNow - (cantLocked ?? 0);
        const cantRad = (currentCant * Math.PI) / 180;

        // Rotate correction vector by cant angle (Spec Section 7, Step 4)
        // xRot = W·cos(cant) + D·sin(cant)
        // yRot = D·cos(cant) − W·sin(cant)
        const xRot = W * Math.cos(cantRad) + D * Math.sin(cantRad);
        const yRot = D * Math.cos(cantRad) - W * Math.sin(cantRad);

        // Convert to pixels (Spec Section 7, Step 5)
        const offsetPxX = xRot * calibrationData.pxPerUnitX;
        const offsetPxY = yRot * calibrationData.pxPerUnitY;

        // Compute aim point (Spec Section 7, Step 6)
        // aimY = cy - offsetPxY (subtract because screen Y increases downward)
        const aimX = calibrationData.scopeCenterPx.x + offsetPxX;
        const aimY = calibrationData.scopeCenterPx.y - offsetPxY;

        // Cant warning zones (Spec Section 8.2)
        const absCant = Math.abs(currentCant);
        let cantWarning: "ok" | "warn" | "bad" = "ok";
        if (absCant > 6) cantWarning = "bad";      // Red: > 6°
        else if (absCant > 3) cantWarning = "warn"; // Yellow: 3-6°

        return {
            dropMOA: result.dropMOA,
            dropMIL: result.dropMIL,
            dropInches: result.dropInches,
            holdoverX: aimX,
            holdoverY: aimY,
            currentCant,
            cantWarning,
        };
    }, [isTargetConfirmed, targetDistance, pitchLocked, cantLocked, cantNow, rangefinderMode, gunData, calibrationData]);

    // Update cant level state
    useEffect(() => {
        if (ballisticsData) {
            setCantLevel(ballisticsData.cantWarning);
        } else {
            setCantLevel("ok");
        }
    }, [ballisticsData?.cantWarning]);

    // ==================== INITIALIZATION ====================

    // Load saved preferences
    useEffect(() => {
        // Load tip dismissed state
        AsyncStorage.getItem(STORAGE_KEY_TIP_DISMISSED).then((val) => {
            if (val === "1") setShowCalibrationTip(false);
        });

        // Load rangefinder mode
        AsyncStorage.getItem(STORAGE_KEY_RANGEFINDER_MODE).then((val) => {
            if (val === "LOS" || val === "COMPENSATED") {
                setRangefinderMode(val);
            } else {
                // First time - show modal to select
                setShowRangefinderModal(true);
            }
        });
    }, []);

    // Lock orientation on focus
    useFocusEffect(
        useCallback(() => {
            setActiveScreen(SCREEN_ID);
            lockOrientation(calibrationData.mountOrientation);
            return () => {};
        }, [setActiveScreen, calibrationData.mountOrientation])
    );

    // Pulse animation
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 0, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 1, duration: 0, useNativeDriver: true }),
                ]),
                Animated.delay(400),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [pulseAnim, pulseOpacity]);

    // Crosshair opacity animation
    useEffect(() => {
        Animated.timing(crosshairOpacity, {
            toValue: showCrosshair ? 1 : 0,
            duration: 200,
            useNativeDriver: true
        }).start();
    }, [showCrosshair, crosshairOpacity]);

    // Holdover opacity animation
    useEffect(() => {
        Animated.timing(holdoverOpacity, {
            toValue: (isTargetConfirmed && ballisticsData) ? 1 : 0,
            duration: 150,
            useNativeDriver: true
        }).start();
    }, [isTargetConfirmed, ballisticsData, holdoverOpacity]);

    // ==================== HANDLERS ====================

    const handleSelectRangefinderMode = useCallback(async (mode: RangefinderMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRangefinderMode(mode);
        await AsyncStorage.setItem(STORAGE_KEY_RANGEFINDER_MODE, mode);
        setShowRangefinderModal(false);
    }, []);

    const handleDismissTip = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCalibrationTip(false);
        await AsyncStorage.setItem(STORAGE_KEY_TIP_DISMISSED, "1");
    }, []);

    const handleToggleCrosshair = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCrosshair((v) => !v);
    }, []);

    const handleOpenDistanceInput = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDistanceInputText(targetDistance ? String(targetDistance) : "");
        setShowDistanceInput(true);
    }, [targetDistance]);

    const handleConfirmDistance = useCallback(() => {
        Keyboard.dismiss();
        const dist = parseFloat(distanceInputText);
        if (!isNaN(dist) && dist > 0 && dist < 3000) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTargetDistance(dist);
            setShowDistanceInput(false);
        }
    }, [distanceInputText]);

    const handleCancelDistance = useCallback(() => {
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowDistanceInput(false);
    }, []);

    const handleConfirmTarget = useCallback(() => {
        if (!targetDistance) {
            handleOpenDistanceInput();
            return;
        }
        if (!rangefinderMode) {
            setShowRangefinderModal(true);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Lock current elevation (pitch) and cant at confirmation
        // elevationNow = up/down angle of rifle
        // cantNow = side-to-side tilt of rifle
        setPitchLocked(elevationNow - calibrationData.roll0);
        setCantLocked(cantNow);
        setIsTargetConfirmed(true);
    }, [targetDistance, rangefinderMode, elevationNow, cantNow, calibrationData.roll0, handleOpenDistanceInput]);

    const handleUnlockTarget = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsTargetConfirmed(false);
        setPitchLocked(null);
        setCantLocked(null);
        setCantLevel("ok");
    }, []);

    const handleEndHuntPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEndConfirm(true);
    }, []);

    const handleConfirmEndHunt = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowEndConfirm(false);
        endHunt();
        await resetCalibration();
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "(tabs)" }] }));
    }, [endHunt, resetCalibration, navigation]);

    const handleCancelEndHunt = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEndConfirm(false);
    }, []);

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    // Format display values
    const holdoverText = ballisticsData
        ? (calibrationData.scopeUnit === "MOA"
            ? `${ballisticsData.dropMOA.toFixed(1)} MOA`
            : `${ballisticsData.dropMIL.toFixed(2)} MIL`)
        : "—";
    const dropText = ballisticsData ? formatDrop(ballisticsData.dropInches, gunData.isImperial) : "—";

    // ==================== SUB-COMPONENTS ====================

    const StatusIndicator = useCallback(({ compact = false }: { compact?: boolean }) => (
        <View className={`flex-row items-center ${compact ? "" : "flex-1"}`}>
            <View className={`${compact ? "size-3" : "size-4"} items-center justify-center mr-1.5`}>
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            width: compact ? 10 : 14,
                            height: compact ? 10 : 14,
                            borderRadius: compact ? 5 : 7,
                            borderWidth: 2,
                            borderColor: isTargetConfirmed ? "#f97316" : "#22c55e"
                        },
                        { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }
                    ]}
                />
                <View
                    style={{
                        width: compact ? 6 : 8,
                        height: compact ? 6 : 8,
                        borderRadius: compact ? 3 : 4,
                        backgroundColor: isTargetConfirmed ? "#f97316" : "#22c55e"
                    }}
                />
            </View>
            <Text className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${isTargetConfirmed ? "text-orange-500" : "text-green-500"}`}>
                {isTargetConfirmed ? "TRACKING" : "READY"}
            </Text>
        </View>
    ), [isTargetConfirmed, pulseAnim, pulseOpacity]);

    // Holdover crosshair (orange)
    const HoldoverCrosshair = useMemo(() => {
        if (!ballisticsData || !isTargetConfirmed) return null;

        return (
            <Animated.View
                style={[
                    styles.holdoverContainer,
                    {
                        left: ballisticsData.holdoverX - 30,
                        top: ballisticsData.holdoverY - 30,
                        opacity: holdoverOpacity
                    }
                ]}
                pointerEvents="none"
            >
                <View style={styles.holdoverRing} />
                <View style={styles.holdoverCenter} />
                <View style={styles.holdoverTop} />
                <View style={styles.holdoverBottom} />
                <View style={styles.holdoverLeft} />
                <View style={styles.holdoverRight} />
            </Animated.View>
        );
    }, [ballisticsData, isTargetConfirmed, holdoverOpacity]);

    // Cant warning banner
    const CantWarningBanner = useMemo(() => {
        if (cantLevel === "ok" || !isTargetConfirmed || !ballisticsData) return null;

        const isRed = cantLevel === "bad";
        const bgColor = isRed ? "rgba(127, 29, 29, 0.95)" : "rgba(113, 63, 18, 0.95)";
        const textColor = isRed ? "#fca5a5" : "#fde047";
        const borderColor = isRed ? "#dc2626" : "#ca8a04";
        const cantDegrees = Math.abs(ballisticsData.currentCant).toFixed(1);

        return (
            <View style={[styles.cantBanner, { top: insets.top + 8, backgroundColor: bgColor, borderColor }]}>
                <Text style={[styles.cantBannerText, { color: textColor }]}>
                    {isRed ? `⚠ LEVEL RIFLE! (${cantDegrees}°)` : `⚠ CHECK CANT (${cantDegrees}°)`}
                </Text>
            </View>
        );
    }, [cantLevel, isTargetConfirmed, ballisticsData, insets.top]);

    // Calibration tip overlay
    const CalibrationTip = useMemo(() => {
        if (!showCalibrationTip) return null;

        return (
            <View style={styles.tipContainer}>
                <View style={styles.tipBox}>
                    <Image source={icons.info} style={styles.tipIcon} resizeMode="contain" />
                    <View style={styles.tipTextWrap}>
                        <Text style={styles.tipTitle}>Verify Zero Regularly</Text>
                        <Text style={styles.tipText}>
                            Tap the crosshair button to check scope alignment. Minor drift is normal — recalibrate only if significantly off.
                        </Text>
                    </View>
                    <Pressable onPress={handleDismissTip} style={styles.tipClose} hitSlop={12}>
                        <Image source={icons.cancel} style={styles.tipCloseIcon} resizeMode="contain" />
                    </Pressable>
                </View>
            </View>
        );
    }, [showCalibrationTip, handleDismissTip]);

    // ==================== MODALS ====================

    // Rangefinder Mode Selection Modal
    const RangefinderModal = useMemo(() => (
        <Modal
            visible={showRangefinderModal}
            animationType="fade"
            transparent
            onRequestClose={() => {}}
            supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isLandscapeMode ? styles.rangefinderModalLandscape : { maxWidth: 380 }]}>
                    <View style={[styles.modalIconCircle, { backgroundColor: "rgba(34, 197, 94, 0.15)", width: isLandscapeMode ? 40 : 56, height: isLandscapeMode ? 40 : 56, borderRadius: isLandscapeMode ? 20 : 28, marginBottom: isLandscapeMode ? 10 : 16 }]}>
                        <Image source={icons.distance} style={[styles.modalIcon, { tintColor: "#22c55e", width: isLandscapeMode ? 18 : 24, height: isLandscapeMode ? 18 : 24 }]} resizeMode="contain" />
                    </View>
                    <Text style={[styles.modalTitle, isLandscapeMode && { fontSize: 15, marginBottom: 4 }]}>Rangefinder Type</Text>
                    <Text style={[styles.modalMessage, { marginBottom: isLandscapeMode ? 10 : 16 }, isLandscapeMode && { fontSize: 11 }]}>
                        How does your rangefinder display distance?
                    </Text>

                    <View style={isLandscapeMode ? styles.rangefinderOptionsRow : undefined}>
                        <Pressable
                            onPress={() => handleSelectRangefinderMode("LOS")}
                            style={[styles.rangefinderOption, rangefinderMode === "LOS" && styles.rangefinderOptionSelected, isLandscapeMode && styles.rangefinderOptionLandscape]}
                        >
                            <View style={styles.rangefinderOptionHeader}>
                                <Text style={[styles.rangefinderOptionTitle, isLandscapeMode && { fontSize: 13 }]}>Line-of-Sight (LOS)</Text>
                                {rangefinderMode === "LOS" && <Text style={styles.rangefinderCheckmark}>✓</Text>}
                            </View>
                            <Text style={[styles.rangefinderOptionDesc, isLandscapeMode && { fontSize: 10 }]}>
                                Straight-line distance. Most basic rangefinders.
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => handleSelectRangefinderMode("COMPENSATED")}
                            style={[styles.rangefinderOption, rangefinderMode === "COMPENSATED" && styles.rangefinderOptionSelected, isLandscapeMode && styles.rangefinderOptionLandscape]}
                        >
                            <View style={styles.rangefinderOptionHeader}>
                                <Text style={[styles.rangefinderOptionTitle, isLandscapeMode && { fontSize: 13 }]}>Angle-Compensated</Text>
                                {rangefinderMode === "COMPENSATED" && <Text style={styles.rangefinderCheckmark}>✓</Text>}
                            </View>
                            <Text style={[styles.rangefinderOptionDesc, isLandscapeMode && { fontSize: 10 }]}>
                                "Shoot-to" distance. Already corrects for angles.
                            </Text>
                        </Pressable>
                    </View>

                    {!isLandscapeMode && (
                        <Text style={styles.rangefinderHelp}>
                            Check your rangefinder manual if unsure. Using the wrong setting can cause missed shots on angled terrain.
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    ), [showRangefinderModal, rangefinderMode, handleSelectRangefinderMode, isLandscapeMode]);

    const EndHuntModal = useMemo(() => (
        <Modal visible={showEndConfirm} animationType="fade" transparent onRequestClose={handleCancelEndHunt} supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalIconCircle}>
                        <Image source={icons.cancel} style={styles.modalIcon} resizeMode="contain" />
                    </View>
                    <Text style={styles.modalTitle}>End Hunt?</Text>
                    <Text style={styles.modalMessage}>You'll need to recalibrate to start a new hunt.</Text>
                    <View style={styles.modalButtonRow}>
                        <Pressable onPress={handleCancelEndHunt} style={styles.modalCancelBtn}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleConfirmEndHunt} style={styles.modalConfirmBtn}>
                            <Text style={styles.modalConfirmText}>End Hunt</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    ), [showEndConfirm, handleCancelEndHunt, handleConfirmEndHunt]);

    const DistanceModal = useMemo(() => (
        <Modal visible={showDistanceInput} animationType="fade" transparent onRequestClose={handleCancelDistance} supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}>
            <Pressable style={styles.modalOverlay} onPress={handleCancelDistance}>
                <Pressable style={styles.distanceModal} onPress={() => Keyboard.dismiss()}>
                    <Text style={styles.distanceTitle}>Target Distance</Text>
                    <View style={styles.distanceInputRow}>
                        <TextInput
                            style={styles.distanceInput}
                            value={distanceInputText}
                            onChangeText={setDistanceInputText}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#6b7280"
                            autoFocus
                            selectTextOnFocus
                            returnKeyType="done"
                            onSubmitEditing={handleConfirmDistance}
                        />
                        <View style={styles.distanceUnitBox}>
                            <Text style={styles.distanceUnitText}>{distanceUnit}</Text>
                        </View>
                    </View>
                    <View style={styles.distanceButtonRow}>
                        <Pressable onPress={handleCancelDistance} style={styles.distanceCancelBtn}>
                            <Text style={styles.distanceCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleConfirmDistance} style={styles.distanceConfirmBtn}>
                            <Text style={styles.distanceConfirmText}>Confirm</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    ), [showDistanceInput, distanceInputText, distanceUnit, handleCancelDistance, handleConfirmDistance]);

    // ==================== RENDER ====================

    const rotationTransform = { transform: [{ rotate: `${calibrationData.screenRotation}deg` }] };

    // Camera view content (shared)
    const CameraContent = (
        <>
            {shouldRenderCamera && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <View style={[StyleSheet.absoluteFill, rotationTransform]} pointerEvents="none">
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            zoom={calibrationData.cameraZoom}
                            autofocus={focusLocked ? "off" : "on"}
                        />
                    </View>

                    {/* Zero Crosshair (green) */}
                    {calibrationData.scopeCenterPx && showCrosshair && (
                        <Animated.View
                            style={[
                                crosshairStyles.container,
                                {
                                    left: calibrationData.scopeCenterPx.x - 40,
                                    top: calibrationData.scopeCenterPx.y - 40,
                                    opacity: crosshairOpacity
                                }
                            ]}
                            pointerEvents="none"
                        >
                            <View style={crosshairStyles.top} />
                            <View style={crosshairStyles.bottom} />
                            <View style={crosshairStyles.left} />
                            <View style={crosshairStyles.right} />
                            <View style={crosshairStyles.center} />
                        </Animated.View>
                    )}

                    {HoldoverCrosshair}
                    {CantWarningBanner}
                    {CalibrationTip}
                </View>
            )}
        </>
    );

    // ==================== LANDSCAPE LAYOUT ====================
    if (isLandscapeMode) {
        return (
            <View className="flex-1 bg-brand-black">
                <View style={[StyleSheet.absoluteFill, { right: calibrationData.cameraLayout.cameraInsets.padRight }]}>
                    {CameraContent}
                </View>

                <SafeAreaView className="absolute top-0 bottom-0 right-0" edges={["top", "bottom", "right"]} style={{ width: calibrationData.cameraLayout.sidePanelWidth }}>
                    <View className="flex-1 bg-brand-black border-l border-zinc-800">
                        <View className="px-3 pt-3 pb-2 border-b border-zinc-800/50">
                            <View className="flex-row items-center justify-between">
                                <StatusIndicator compact />
                                <Pressable onPress={handleOpenDistanceInput} className="flex-row items-center bg-zinc-900 rounded-lg px-3 py-1.5 border border-zinc-700">
                                    <Text className="text-white font-bold text-lg mr-1">{targetDistance ?? "—"}</Text>
                                    <Text className="text-zinc-400 text-sm">{distanceUnit}</Text>
                                </Pressable>
                            </View>
                        </View>

                        {isTargetConfirmed ? (
                            <View className="px-3 py-3 border-b border-zinc-800/50">
                                <View className="bg-orange-950/40 rounded-xl p-3 border border-orange-900/40">
                                    <Text className="text-orange-400/70 text-[10px] uppercase tracking-wider mb-1">Holdover</Text>
                                    <Text className="text-orange-400 font-bold text-2xl">{holdoverText}</Text>
                                    <Text className="text-orange-400/60 text-xs mt-1">{dropText} drop</Text>
                                </View>
                            </View>
                        ) : (
                            <View className="px-3 py-3 border-b border-zinc-800/50">
                                <View className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-700/40">
                                    <Text className="text-zinc-500 text-xs text-center">
                                        {targetDistance ? "Tap Confirm to track" : "Set distance to begin"}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View className="px-3 py-2">
                            <Pressable
                                onPress={isTargetConfirmed ? handleUnlockTarget : handleConfirmTarget}
                                className={`rounded-xl py-3 items-center border ${isTargetConfirmed ? "bg-orange-600 border-orange-500" : targetDistance ? "bg-green-600 border-green-500" : "bg-zinc-800 border-zinc-700"}`}
                            >
                                <Text className="text-white font-bold text-sm">{isTargetConfirmed ? "UNLOCK" : "CONFIRM"}</Text>
                            </Pressable>
                        </View>

                        <View className="flex-1" />

                        <View className="px-3 pb-3 pt-2 border-t border-zinc-800/50">
                            <Pressable
                                onPress={() => setShowRangefinderModal(true)}
                                className="rounded-xl py-2 mb-2 flex-row items-center justify-center border bg-zinc-900 border-zinc-700"
                            >
                                <Text className="text-zinc-400 text-xs">
                                    RF: {rangefinderMode === "LOS" ? "Line-of-Sight" : rangefinderMode === "COMPENSATED" ? "Angle-Comp" : "Not Set"}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleToggleCrosshair}
                                className={`rounded-xl py-2.5 mb-2 flex-row items-center justify-center border ${showCrosshair ? "bg-green-900/50 border-green-700" : "bg-zinc-900 border-zinc-700"}`}
                            >
                                <Image source={icons.target} className="w-4 h-4 mr-2" resizeMode="contain" style={{ tintColor: showCrosshair ? "#22c55e" : "#9ca3af" }} />
                                <Text className={`text-xs font-semibold ${showCrosshair ? "text-green-400" : "text-zinc-400"}`}>
                                    {showCrosshair ? "Hide Zero" : "Verify Zero"}
                                </Text>
                            </Pressable>
                            <Pressable onPress={handleEndHuntPress} className="rounded-xl py-2.5 bg-red-950/60 border border-red-900/40 items-center">
                                <Text className="text-red-400 font-semibold text-xs">End Hunt</Text>
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>

                {RangefinderModal}
                {EndHuntModal}
                {DistanceModal}
            </View>
        );
    }

    // ==================== PORTRAIT LAYOUT ====================
    return (
        <View className="flex-1 bg-brand-black">
            <View style={[StyleSheet.absoluteFill, { bottom: calibrationData.cameraLayout.bottomPanelTotalHeight }]}>
                {CameraContent}
            </View>

            <SafeAreaView className="absolute bottom-0 left-0 right-0 bg-brand-black border-t border-zinc-800" edges={["bottom"]} style={{ height: calibrationData.cameraLayout.bottomPanelTotalHeight }}>
                <View className="flex-1 px-4 pt-3" style={{ paddingBottom: calibrationData.cameraLayout.bottomPadding }}>
                    <View className="flex-row items-center mb-3">
                        <StatusIndicator />
                        <Pressable onPress={handleOpenDistanceInput} className="flex-row items-center bg-zinc-900 rounded-xl px-4 py-2 border border-zinc-700">
                            <Text className="text-white font-bold text-xl mr-1.5">{targetDistance ?? "—"}</Text>
                            <Text className="text-zinc-400 text-base">{distanceUnit}</Text>
                        </Pressable>
                    </View>

                    {isTargetConfirmed ? (
                        <View className="bg-orange-950/40 rounded-xl p-3 mb-3 border border-orange-900/40 flex-row items-center">
                            <View className="flex-1">
                                <Text className="text-orange-400/70 text-[10px] uppercase tracking-wider">Holdover</Text>
                                <Text className="text-orange-400 font-bold text-2xl">{holdoverText}</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-orange-400/60 text-sm">{dropText}</Text>
                                <Text className="text-orange-400/40 text-xs">drop</Text>
                            </View>
                        </View>
                    ) : (
                        <View className="bg-zinc-900/60 rounded-xl p-3 mb-3 border border-zinc-700/40">
                            <Text className="text-zinc-500 text-sm text-center">
                                {targetDistance ? "Tap Confirm Target to begin tracking" : "Set distance, then confirm target"}
                            </Text>
                        </View>
                    )}

                    {/* Rangefinder Mode Indicator */}
                    <Pressable
                        onPress={() => setShowRangefinderModal(true)}
                        className="bg-zinc-900/60 rounded-lg px-3 py-2 mb-3 border border-zinc-700/40 flex-row items-center justify-between"
                    >
                        <Text className="text-zinc-500 text-xs">Rangefinder Mode</Text>
                        <Text className="text-zinc-300 text-xs font-medium">
                            {rangefinderMode === "LOS" ? "Line-of-Sight" : rangefinderMode === "COMPENSATED" ? "Angle-Compensated" : "Tap to Set"}
                        </Text>
                    </Pressable>

                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={isTargetConfirmed ? handleUnlockTarget : handleConfirmTarget}
                            className={`flex-1 rounded-xl py-3.5 items-center justify-center border ${isTargetConfirmed ? "bg-orange-600 border-orange-500" : targetDistance ? "bg-green-600 border-green-500" : "bg-zinc-800 border-zinc-700"}`}
                        >
                            <Text className="text-white font-bold text-base">{isTargetConfirmed ? "UNLOCK" : "CONFIRM TARGET"}</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleToggleCrosshair}
                            className={`rounded-xl py-3.5 px-4 items-center justify-center border ${showCrosshair ? "bg-green-900/50 border-green-700" : "bg-zinc-900 border-zinc-700"}`}
                        >
                            <Image source={icons.target} className="w-6 h-6" resizeMode="contain" style={{ tintColor: showCrosshair ? "#22c55e" : "#9ca3af" }} />
                        </Pressable>
                        <Pressable onPress={handleEndHuntPress} className="rounded-xl py-3.5 px-4 bg-red-950/60 border border-red-900/40 items-center justify-center">
                            <Text className="text-red-400 font-bold text-sm">END</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>

            {RangefinderModal}
            {EndHuntModal}
            {DistanceModal}
        </View>
    );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
    holdoverContainer: {
        position: "absolute",
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center"
    },
    holdoverRing: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2.5,
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.08)"
    },
    holdoverCenter: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#f97316"
    },
    holdoverTop: {
        position: "absolute",
        top: 4,
        width: 2,
        height: 10,
        backgroundColor: "#f97316",
        borderRadius: 1
    },
    holdoverBottom: {
        position: "absolute",
        bottom: 4,
        width: 2,
        height: 10,
        backgroundColor: "#f97316",
        borderRadius: 1
    },
    holdoverLeft: {
        position: "absolute",
        left: 4,
        width: 10,
        height: 2,
        backgroundColor: "#f97316",
        borderRadius: 1
    },
    holdoverRight: {
        position: "absolute",
        right: 4,
        width: 10,
        height: 2,
        backgroundColor: "#f97316",
        borderRadius: 1
    },

    cantBanner: {
        position: "absolute",
        left: 16,
        right: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
    },
    cantBannerText: {
        fontSize: 14,
        fontWeight: "700",
    },

    tipContainer: {
        position: "absolute",
        bottom: 12,
        left: 12,
        right: 12,
    },
    tipBox: {
        backgroundColor: "rgba(39, 39, 42, 0.95)",
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        borderWidth: 1,
        borderColor: "rgba(34, 197, 94, 0.4)",
    },
    tipIcon: {
        width: 18,
        height: 18,
        tintColor: "#22c55e",
        marginRight: 10,
        marginTop: 2,
    },
    tipTextWrap: {
        flex: 1,
    },
    tipTitle: {
        color: "#22c55e",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 3,
    },
    tipText: {
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 11,
        lineHeight: 15,
    },
    tipClose: {
        padding: 4,
        marginLeft: 6,
    },
    tipCloseIcon: {
        width: 14,
        height: 14,
        tintColor: "rgba(255, 255, 255, 0.5)",
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24
    },
    modalContent: {
        backgroundColor: "#1c1c1e",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        maxWidth: 320,
        alignItems: "center",
    },
    modalIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16
    },
    modalIcon: {
        width: 24,
        height: 24,
        tintColor: "#ef4444"
    },
    modalTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8
    },
    modalMessage: {
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 24
    },
    modalButtonRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%"
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#2c2c2e",
        alignItems: "center"
    },
    modalCancelText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#ef4444",
        alignItems: "center"
    },
    modalConfirmText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15
    },

    // Rangefinder modal
    rangefinderOption: {
        width: "100%",
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#2c2c2e",
        marginBottom: 12,
        borderWidth: 2,
        borderColor: "transparent",
    },
    rangefinderOptionSelected: {
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
    },
    rangefinderOptionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    rangefinderOptionTitle: {
        color: "white",
        fontSize: 15,
        fontWeight: "600",
    },
    rangefinderCheckmark: {
        color: "#22c55e",
        fontSize: 18,
        fontWeight: "700",
    },
    rangefinderOptionDesc: {
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 12,
        lineHeight: 16,
    },
    rangefinderHelp: {
        color: "rgba(255, 255, 255, 0.4)",
        fontSize: 11,
        textAlign: "center",
        marginTop: 8,
        lineHeight: 15,
    },
    rangefinderModalLandscape: {
        maxWidth: 500,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    rangefinderOptionsRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    rangefinderOptionLandscape: {
        flex: 1,
        padding: 12,
        marginBottom: 0,
    },

    distanceModal: {
        backgroundColor: "#1c1c1e",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        maxWidth: 300
    },
    distanceTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 20
    },
    distanceInputRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20
    },
    distanceInput: {
        flex: 1,
        backgroundColor: "#2c2c2e",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 28,
        fontWeight: "700",
        color: "white",
        textAlign: "center"
    },
    distanceUnitBox: {
        marginLeft: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        backgroundColor: "#2c2c2e",
        borderRadius: 14
    },
    distanceUnitText: {
        color: "#9ca3af",
        fontSize: 16,
        fontWeight: "600"
    },
    distanceButtonRow: {
        flexDirection: "row",
        gap: 12
    },
    distanceCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#2c2c2e",
        alignItems: "center"
    },
    distanceCancelText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15
    },
    distanceConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#22c55e",
        alignItems: "center"
    },
    distanceConfirmText: {
        color: "white",
        fontWeight: "700",
        fontSize: 15
    },
});