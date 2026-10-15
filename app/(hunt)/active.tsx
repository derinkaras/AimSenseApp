// ============================================================
// app/(hunt)/active.tsx - Active Hunt Screen
// ============================================================
// Full hunt mode with:
// - G1 ballistics engine
// - Rangefinder mode (LOS vs Angle-Compensated)
// - Locked pitch for angle correction
// - Live cant rotation
// - Proper IMU mapping for portrait AND landscape
//
// All calculations live in src/hunt (aim.ts, ballistics.ts, units.ts);
// this file only wires sensor readings and UI state into them.

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
    Keyboard,
    type LayoutChangeEvent,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import { ScopeCamera } from "@/calibration/components";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useNavigation, useIsFocused } from "expo-router/react-navigation";
import * as ScreenOrientation from "expo-screen-orientation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    useCalibrationStore,
    clearCalibration,
    isLandscape,
    lockOrientation,
    DEFAULT_TILT_CONFIG,
    type MountOrientation,
} from "@/calibration";
import {
    useHuntStore,
    selectSelectedGun,
    selectCalibrationResult,
    computeDropSolution,
    computeAimSolution,
    filterCant,
    formatDrop,
    mapIMUToRifleAxes,
    rifleCantDeg,
    riflePitchDeg,
    isHoldoverOffScreen,
    toSolverConditions,
    describeConditions,
    NO_CONDITIONS,
    type ShotConditions,
    type RangefinderMode,
} from "@/hunt";
import { useTiltLevel } from "@/hooks/useTiltLevel";
import icons from "@/constants/icons";
import { useCameraContext } from "./_layout";
import { crosshairStyles } from "@/calibration/calibrationStyles";
import ShotSetupModal from "@/hunt/ShotSetupModal";
import HelpButton from "@/help/HelpButton";
import GuideSheet from "@/help/GuideSheet";
import AppSheet, { OptionCard, SheetButton } from "@/components/AppSheet";
import { MAX_FONT_SCALE } from "@/constants/fontScale";
import { loadSavedConditions, saveConditions } from "@/hunt/conditionsStorage";

const SCREEN_ID = "active";
const STORAGE_KEY_RANGEFINDER_MODE = "aimsense.hunt.rangefinderMode";

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
    const [showGuide, setShowGuide] = useState(false);

    // Rangefinder mode - critical for angle correction
    const [rangefinderMode, setRangefinderMode] = useState<RangefinderMode | null>(null);

    // Animation refs (stable)
    const crosshairOpacity = useRef(new Animated.Value(0)).current;
    const holdoverOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(1)).current;

    // Shot State
    const [targetDistance, setTargetDistance] = useState<number | null>(null);
    // Optional wind + air conditions entered with the distance (wind is per shot, the rest is remembered)
    const [conditions, setConditions] = useState<ShotConditions>(NO_CONDITIONS);
    const [isTargetConfirmed, setIsTargetConfirmed] = useState(false);
    const [pitchLocked, setPitchLocked] = useState<number | null>(null);

    // Cant warning
    const [cantLevel, setCantLevel] = useState<"ok" | "warn" | "bad">("ok");

    // Stores
    const selectedGun = useHuntStore(selectSelectedGun);
    const calibrationResult = useHuntStore(selectCalibrationResult);
    const endHunt = useHuntStore((s) => s.endHunt);
    const validateCameraInvariants = useHuntStore((s) => s.validateCameraInvariants);
    const resetCalibration = useCalibrationStore((s) => s.resetCalibration);

    // Extract calibration values (memoized)
    const calibrationData = useMemo(() => ({
        mountOrientation: calibrationResult?.mountOrientation ?? "portrait",
        cameraZoom: calibrationResult?.cameraZoom ?? 0,
        screenRotation: calibrationResult?.screenRotation ?? 0,
        focusPoint: calibrationResult?.focusPoint ?? null,
        scopeCenterPx: calibrationResult?.scopeCenterPx ?? null,
        pxPerUnit: calibrationResult?.pxPerUnit ?? 0,
        upAxis: calibrationResult?.upAxis ?? { x: 0, y: -1 },
        cameraViewSize: calibrationResult?.cameraViewSize ?? null,
        scopeUnit: calibrationResult?.scopeUnit ?? "MOA",
        scopeMagnification: calibrationResult?.scopeMagnification ?? null,
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
    const { cantNow, elevationNow } = mapIMUToRifleAxes(imuRoll ?? 0, imuPitch ?? 0);

    // ==================== BALLISTICS COMPUTATION ====================
    // Split into two memos for performance:
    // 1. dropSolution: Heavy G1 integration, only recalcs when distance/pitch/mode changes
    // 2. aimSolution: Light cant rotation, runs at IMU rate (20Hz)

    // Smoothed cant ref for stable crosshair
    const cantFilteredRef = useRef(0);

    // Reset filter ONLY when confirmation state changes (not every IMU tick)
    // This seeds the filter at the moment of confirm so it doesn't jump
    useEffect(() => {
        if (!isTargetConfirmed) {
            cantFilteredRef.current = 0;
        } else {
            // Seed with current raw cant at moment of confirmation
            cantFilteredRef.current = rifleCantDeg(cantNow, calibrationData.pitch0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTargetConfirmed, calibrationData.pitch0]);

    // Update filtered cant value (only when confirmed)
    useEffect(() => {
        if (!isTargetConfirmed) return;
        const rawCant = rifleCantDeg(cantNow, calibrationData.pitch0);
        cantFilteredRef.current = filterCant(cantFilteredRef.current, rawCant);
    }, [cantNow, calibrationData.pitch0, isTargetConfirmed]);

    // MEMO 1: Ballistics drop calculation (heavy, runs rarely)
    const dropSolution = useMemo(() => {
        if (!isTargetConfirmed || !targetDistance) {
            return null;
        }

        // Block if calibration incomplete
        if (!(calibrationData.pxPerUnit > 0)) {
            console.warn("Calibration incomplete: pxPerUnit is 0");
            return null;
        }

        const { wind, atmosphere } = toSolverConditions(conditions, gunData.isImperial);

        return computeDropSolution({
            targetDistance,
            isImperial: gunData.isImperial,
            zeroDistance: gunData.zeroDistance,
            scopeHeight: gunData.scopeHeight,
            muzzleVelocityFps: gunData.muzzleVelocityFps,
            ballisticCoefficient: gunData.ballisticCoefficient,
            rangefinderMode,
            pitchLockedDeg: pitchLocked,
            scopeUnit: calibrationData.scopeUnit,
            wind,
            atmosphere,
        });
    }, [
        isTargetConfirmed,
        targetDistance,
        pitchLocked,
        rangefinderMode,
        gunData.isImperial,
        gunData.muzzleVelocityFps,
        gunData.ballisticCoefficient,
        gunData.zeroDistance,
        gunData.scopeHeight,
        calibrationData.scopeUnit,
        calibrationData.pxPerUnit,
        conditions,
    ]);

    // MEMO 2: Cant rotation + pixel positioning (light, runs at IMU rate)
    const aimSolution = useMemo(() => {
        if (!dropSolution || !calibrationData.scopeCenterPx) {
            return null;
        }

        // Rotation uses FILTERED cant (smooth crosshair movement)
        // Warnings use UNFILTERED cant (instant feedback)
        return computeAimSolution({
            D: dropSolution.D,
            W: dropSolution.W,
            cantDegFiltered: cantFilteredRef.current,
            cantDegUnfiltered: rifleCantDeg(cantNow, calibrationData.pitch0),
            pxPerUnit: calibrationData.pxPerUnit,
            scopeCenter: calibrationData.scopeCenterPx,
            upAxis: calibrationData.upAxis,
        });
    }, [
        dropSolution,
        cantNow,
        calibrationData.pitch0,
        calibrationData.pxPerUnit,
        calibrationData.upAxis,
        calibrationData.scopeCenterPx?.x,
        calibrationData.scopeCenterPx?.y,
    ]);

    // Combined ballistics data for consumers
    const ballisticsData = useMemo(() => {
        if (!dropSolution || !aimSolution) return null;
        return {
            ...dropSolution,
            ...aimSolution,
        };
    }, [dropSolution, aimSolution]);

    // Update cant level state
    useEffect(() => {
        if (ballisticsData) {
            setCantLevel(ballisticsData.cantWarning);
        } else {
            setCantLevel("ok");
        }
    }, [ballisticsData?.cantWarning]);

    // ==================== INITIALIZATION ====================

    // Load saved preferences on page load
    useEffect(() => {
        // Always show the zero info card on page load (user can dismiss each session)
        setShowCalibrationTip(true);

        // Rangefinder type doesn't change mid-hunt, so only ask when nothing is saved yet.
        // Once set, trust it every time the hunt screen reopens (the row below still lets
        // the shooter change it manually if they ever need to).
        AsyncStorage.getItem(STORAGE_KEY_RANGEFINDER_MODE).then((val) => {
            if (val === "LOS" || val === "COMPENSATED") {
                setRangefinderMode(val);
            } else {
                setShowRangefinderModal(true);
            }
        });
    }, []);

    // Altitude / temperature / pressure rarely change between shots, so they are remembered (wind is not)
    useEffect(() => {
        loadSavedConditions(gunData.isImperial).then((saved) =>
            setConditions((c) => ({
                ...c,
                altitude: saved.altitude,
                temperature: saved.temperature,
                pressure: saved.pressure,
            }))
        );
    }, [gunData.isImperial]);

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

    const handleDismissTip = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCalibrationTip(false);
        // Don't persist - we want it to show again next session
    }, []);

    const handleToggleCrosshair = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCrosshair((v) => !v);
    }, []);

    const handleOpenDistanceInput = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowDistanceInput(true);
    }, []);

    // Submitting the distance sheet is what actually starts tracking (shows the holdover) --
    // but only once the aim has been locked in first. If the sheet is opened directly (e.g.
    // to tweak the distance while already tracking), it just updates the numbers in place.
    const handleConfirmDistance = useCallback((distance: number, entered: ShotConditions) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTargetDistance(distance);
        setConditions(entered);
        saveConditions(gunData.isImperial, entered);
        setShowDistanceInput(false);
        if (pitchLocked !== null) {
            setIsTargetConfirmed(true);
        }
    }, [gunData.isImperial, pitchLocked]);

    const handleCancelDistance = useCallback(() => {
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowDistanceInput(false);
        // Backing out before ever confirming a distance means the confirm was never completed --
        // require aiming again rather than leaving a stale pitch lock sitting around.
        if (!isTargetConfirmed) {
            setPitchLocked(null);
        }
    }, [isTargetConfirmed]);

    // Step 1 of confirming a target: aim the scope's crosshair on it, then tap Confirm. That
    // locks the rifle's current elevation (pitch) right at the moment of aiming -- the one
    // thing that has to happen while the phone is actually pointed at the target -- and only
    // then asks for the distance, which can be typed in at leisure afterwards.
    const handleConfirmAim = useCallback(() => {
        if (!rangefinderMode) {
            setShowRangefinderModal(true);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Lock current elevation (pitch) at confirmation
        // elevationNow = up/down angle of rifle (from IMU roll after mapping)
        // Subtract roll0 baseline to get true rifle pitch angle
        // Cant is NOT locked - it uses calibration baseline (pitch0) continuously
        setPitchLocked(riflePitchDeg(elevationNow, calibrationData.roll0));
        setShowDistanceInput(true);
    }, [rangefinderMode, elevationNow, calibrationData.roll0]);

    // A new target needs a fresh aim (and pitch lock), so send the shooter back to Step 1.
    // Wind is per-shot and cleared; altitude/temperature/pressure are environment and stay.
    // The old distance is kept as a pre-fill so re-ranging the SAME target is a one-tap confirm.
    const handleNewTarget = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsTargetConfirmed(false);
        setPitchLocked(null);
        setCantLevel("ok");
        setConditions((c) => ({ ...c, windSpeed: null, windClock: null }));
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

    // ==================== CAMERA MATCH ====================
    // Calibration pixels only line up if the camera area is the same size as when it was
    // calibrated (spec 14.2). Zoom, rotation and orientation are restored from the calibration
    // itself; the area size is the one thing the screen can change, so it is checked on layout.
    const [cameraMismatch, setCameraMismatch] = useState(false);
    const handleCameraAreaLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        const check = validateCameraInvariants(
            calibrationData.cameraZoom,
            calibrationData.screenRotation,
            calibrationData.mountOrientation,
            { width, height }
        );
        if (!check.valid) console.warn("Camera does not match calibration:", check.errors);
        setCameraMismatch(!check.valid);
    }, [validateCameraInvariants, calibrationData.cameraZoom, calibrationData.screenRotation, calibrationData.mountOrientation]);

    // The saved calibration does not fit this screen any more: forget it and set the rifle up again
    const handleRecalibrate = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const gunId = calibrationResult?.gunId;
        endHunt();
        if (gunId) await clearCalibration(gunId);
        await resetCalibration();
        router.replace(gunId ? { pathname: "/(calibration)/rifle", params: { setup: gunId } } : "/(calibration)/rifle");
    }, [calibrationResult?.gunId, endHunt, resetCalibration]);

    // ==================== GUIDED FLOW ====================
    // This screen is a repeating loop, not a one-time wizard: aim & confirm -> enter distance ->
    // holdover shows -> shoot -> next target. The aim has to be confirmed FIRST (that's the one
    // moment the phone must actually be pointed at the target, to lock the pitch angle); only
    // then does it ask for the distance, which can be typed in without staying perfectly aimed.
    const awaitingDistance = pitchLocked !== null && !isTargetConfirmed;
    const canConfirmAim = !!rangefinderMode;

    const primaryActionLabel = isTargetConfirmed
        ? "NEW TARGET"
        : awaitingDistance
            ? "ENTER DISTANCE"
            : "CONFIRM TARGET";
    const primaryActionLabelCompact = isTargetConfirmed
        ? "NEW TARGET"
        : awaitingDistance
            ? "DISTANCE"
            : "CONFIRM";

    const guidanceText = isTargetConfirmed
        ? ""
        : awaitingDistance
            ? "Enter the target distance to continue"
            : "Aim your scope crosshair on the target, then tap Confirm";

    const ctaColorClasses = isTargetConfirmed
        ? "bg-orange-600 border-orange-500"
        : !awaitingDistance && canConfirmAim
            ? "bg-brand-green border-brand-greenLight/50"
            : "bg-brand-greenDark border-brand-green/50";

    const handlePrimaryAction = isTargetConfirmed
        ? handleNewTarget
        : awaitingDistance
            ? handleOpenDistanceInput
            : handleConfirmAim;

    // The distance pill only makes sense once an aim has been confirmed at least once --
    // before that, tapping it would skip the "aim first" step entirely.
    const distancePillEnabled = pitchLocked !== null;

    // Format display values
    const holdoverText = ballisticsData
        ? (calibrationData.scopeUnit === "MOA"
            ? `${ballisticsData.dropMOA.toFixed(1)} MOA`
            : `${ballisticsData.dropMIL.toFixed(2)} MIL`)
        : "—";
    const dropText = ballisticsData ? formatDrop(ballisticsData.dropInches, gunData.isImperial) : "—";

    // Wind / air conditions applied to this shot (shown so the shooter can double-check them)
    const conditionsText = describeConditions(conditions, gunData.isImperial);
    const windDrift = ballisticsData
        ? (calibrationData.scopeUnit === "MOA" ? ballisticsData.driftMOA : ballisticsData.driftMIL)
        : 0;
    const windText = windDrift !== 0
        ? `${Math.abs(windDrift).toFixed(calibrationData.scopeUnit === "MOA" ? 1 : 2)} ${calibrationData.scopeUnit} ${windDrift > 0 ? "right" : "left"}`
        : null;

    // The holdover crosshair is drawn wherever the math puts it; warn if that is beyond the camera view
    const holdoverOffScreen =
        ballisticsData !== null &&
        calibrationData.cameraViewSize !== null &&
        isHoldoverOffScreen(ballisticsData.holdoverX, ballisticsData.holdoverY, calibrationData.cameraViewSize);

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
                            borderColor: isTargetConfirmed ? "#f97316" : "#0b7f4f"
                        },
                        { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }
                    ]}
                />
                <View
                    style={{
                        width: compact ? 6 : 8,
                        height: compact ? 6 : 8,
                        borderRadius: compact ? 3 : 4,
                        backgroundColor: isTargetConfirmed ? "#f97316" : "#0b7f4f"
                    }}
                />
            </View>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${isTargetConfirmed ? "text-orange-500" : "text-brand-greenLight"}`}>
                {isTargetConfirmed ? "TRACKING" : "READY"}
            </Text>
        </View>
    ), [isTargetConfirmed, pulseAnim, pulseOpacity]);

    // Holdover crosshair (orange) - same style as calibration crosshair
    const HoldoverCrosshair = useMemo(() => {
        if (!ballisticsData || !isTargetConfirmed || cameraMismatch) return null;

        return (
            <Animated.View
                style={[
                    styles.holdoverContainer,
                    {
                        left: ballisticsData.holdoverX - 60,
                        top: ballisticsData.holdoverY - 60,
                        opacity: holdoverOpacity
                    }
                ]}
                pointerEvents="none"
            >
                <View style={styles.holdoverTop} />
                <View style={styles.holdoverBottom} />
                <View style={styles.holdoverLeft} />
                <View style={styles.holdoverRight} />
                <View style={styles.holdoverInnerTop} />
                <View style={styles.holdoverInnerBottom} />
                <View style={styles.holdoverInnerLeft} />
                <View style={styles.holdoverInnerRight} />
                <View style={styles.holdoverCenter} />
            </Animated.View>
        );
    }, [ballisticsData, isTargetConfirmed, holdoverOpacity, cameraMismatch]);

    // Cant warning banner
    const CantWarningBanner = useMemo(() => {
        if (cantLevel === "ok" || !isTargetConfirmed || !ballisticsData) return null;

        const isRed = cantLevel === "bad";
        const bgColor = isRed ? "rgba(127, 29, 29, 0.95)" : "rgba(113, 63, 18, 0.95)";
        const textColor = isRed ? "#fca5a5" : "#fde047";
        const borderColor = isRed ? "#dc2626" : "#ca8a04";
        const cantDegrees = Math.abs(ballisticsData.cantDegUnfiltered).toFixed(1);

        return (
            <View style={[styles.cantBanner, { top: insets.top + 8, left: isLandscapeMode ? 48 : 16, backgroundColor: bgColor, borderColor }]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cantBannerText, { color: textColor }]}>
                    {isRed ? `⚠ LEVEL RIFLE! (${cantDegrees}°)` : `⚠ CHECK CANT (${cantDegrees}°)`}
                </Text>
            </View>
        );
    }, [cantLevel, isTargetConfirmed, ballisticsData, insets.top, isLandscapeMode]);

    // Camera area differs from calibration: block the holdover and offer a recalibration
    const CameraMismatchBanner = useMemo(() => {
        if (!cameraMismatch) return null;

        return (
            <View style={[styles.cantBanner, styles.mismatchBanner, { top: insets.top + 8, left: isLandscapeMode ? 48 : 16 }]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cantBannerText, { color: "#fca5a5", textAlign: "center" }]}>
                    The camera view has changed since you calibrated, so holdovers would be wrong.
                </Text>
                <Pressable onPress={handleRecalibrate} accessibilityRole="button" style={styles.mismatchButton}>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.mismatchButtonText}>Recalibrate</Text>
                </Pressable>
            </View>
        );
    }, [cameraMismatch, insets.top, isLandscapeMode, handleRecalibrate]);

    // Reminder of the magnification the pixel scale is valid for
    const MagnificationBadge = useMemo(() => {
        if (!calibrationData.scopeMagnification || cameraMismatch) return null;

        return (
            <View style={[styles.magnificationBadge, { top: insets.top + 8 }]} pointerEvents="none">
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.magnificationBadgeText}>{`SCOPE ${calibrationData.scopeMagnification}×`}</Text>
            </View>
        );
    }, [calibrationData.scopeMagnification, cameraMismatch, insets.top]);

    // Holdover off-screen banner
    const OffScreenBanner = useMemo(() => {
        if (!holdoverOffScreen || !isTargetConfirmed || cameraMismatch) return null;

        return (
            <View style={[styles.cantBanner, { bottom: 12, left: isLandscapeMode ? 48 : 16, backgroundColor: "rgba(127, 29, 29, 0.95)", borderColor: "#dc2626" }]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cantBannerText, { color: "#fca5a5" }]}>
                    {`⚠ HOLDOVER OFF SCREEN (${holdoverText})`}
                </Text>
            </View>
        );
    }, [holdoverOffScreen, isTargetConfirmed, isLandscapeMode, holdoverText, cameraMismatch]);

    // Zero verification info card - shows in center of camera view
    const ZeroInfoCard = useMemo(() => {
        if (!showCalibrationTip) return null;

        return (
            <View style={styles.zeroInfoOverlay}>
                <View style={styles.zeroInfoCard}>
                    <View style={styles.zeroInfoHeader}>
                        <View style={styles.zeroInfoIconWrap}>
                            <Image source={icons.target} style={styles.zeroInfoIcon} resizeMode="contain" />
                        </View>
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.zeroInfoTitle}>Verify Zero Button</Text>
                        <Pressable onPress={handleDismissTip} style={styles.zeroInfoClose} hitSlop={12}>
                            <Image source={icons.cancel} style={styles.zeroInfoCloseIcon} resizeMode="contain" />
                        </Pressable>
                    </View>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.zeroInfoText}>
                        Tap the <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.zeroInfoHighlight}>crosshair button</Text> in the control panel to show your calibrated scope center. Use this to verify alignment hasn't drifted during your hunt.
                    </Text>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.zeroInfoSubtext}>
                        Minor drift is normal — only recalibrate if significantly off target.
                    </Text>
                </View>
            </View>
        );
    }, [showCalibrationTip, handleDismissTip]);

    // ==================== MODALS ====================

    // Rangefinder Mode Selection Modal
    const RangefinderModal = useMemo(() => (
        <AppSheet
            visible={showRangefinderModal}
            // A first-time choice is required; once one is saved, the sheet can just be closed
            onClose={rangefinderMode ? () => setShowRangefinderModal(false) : undefined}
            eyebrow="Rangefinder"
            title="How does it show distance?"
        >
            <View className="gap-3">
                <OptionCard
                    title="Line of sight"
                    description="The straight-line distance. Most basic rangefinders. AimSense corrects for the shot angle."
                    selected={rangefinderMode === "LOS"}
                    onPress={() => handleSelectRangefinderMode("LOS")}
                />
                <OptionCard
                    title="Angle-compensated"
                    description="A shoot-to distance that already corrects for the angle."
                    selected={rangefinderMode === "COMPENSATED"}
                    onPress={() => handleSelectRangefinderMode("COMPENSATED")}
                />
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/45 text-xs leading-5 mt-1">
                    Not sure? Check your rangefinder&apos;s manual. The wrong choice can cause misses on steep uphill or downhill shots.
                </Text>
            </View>
        </AppSheet>
    ), [showRangefinderModal, rangefinderMode, handleSelectRangefinderMode]);

    const EndHuntModal = useMemo(() => (
        <AppSheet
            visible={showEndConfirm}
            onClose={handleCancelEndHunt}
            eyebrow="End hunt"
            title="Finish this hunt?"
            footer={
                <>
                    <SheetButton label="End hunt" variant="danger" onPress={handleConfirmEndHunt} />
                    <SheetButton label="Keep hunting" variant="secondary" onPress={handleCancelEndHunt} />
                </>
            }
        >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/65 text-[15px] leading-[22px]">
                Your rifle stays calibrated. Next time, pick it and do a quick crosshair check.
            </Text>
        </AppSheet>
    ), [showEndConfirm, handleCancelEndHunt, handleConfirmEndHunt]);

    // The full "How it works & limits" guide
    const GuideModal = <GuideSheet visible={showGuide} onClose={() => setShowGuide(false)} />;

    // Distance + optional wind and air conditions
    const DistanceModal = (
        <ShotSetupModal
            visible={showDistanceInput}
            isImperial={gunData.isImperial}
            initialDistance={targetDistance}
            initialConditions={conditions}
            onCancel={handleCancelDistance}
            onConfirm={handleConfirmDistance}
        />
    );

    // ==================== RENDER ====================

    const rotationTransform = { transform: [{ rotate: `${calibrationData.screenRotation}deg` }] };

    // Camera view content (shared)
    const CameraContent = (
        <>
            {shouldRenderCamera && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={handleCameraAreaLayout}>
                    <View style={[StyleSheet.absoluteFill, rotationTransform]} pointerEvents="none">
                        <ScopeCamera zoom={calibrationData.cameraZoom} focusLocked={focusLocked} />
                    </View>

                    {/* Zero Crosshair (green) */}
                    {calibrationData.scopeCenterPx && showCrosshair && (
                        <Animated.View
                            style={[
                                crosshairStyles.container,
                                {
                                    left: calibrationData.scopeCenterPx.x - 60,
                                    top: calibrationData.scopeCenterPx.y - 60,
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
                    {MagnificationBadge}
                    {CantWarningBanner}
                    {OffScreenBanner}
                    {CameraMismatchBanner}
                    {ZeroInfoCard}
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
                    <View className="flex-1 bg-brand-black border-l border-brand-green/40">
                        <View className="px-3 pt-3 pb-2 border-b border-brand-green/30">
                            <View className="flex-row items-center justify-between">
                                <StatusIndicator compact />
                                <Pressable
                                    onPress={handleOpenDistanceInput}
                                    disabled={!distancePillEnabled}
                                    className={`flex-row items-center bg-brand-greenDark/60 rounded-lg px-3 py-1.5 border border-brand-green/50 ${distancePillEnabled ? "" : "opacity-40"}`}
                                >
                                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white font-bold text-lg mr-1">{targetDistance ?? "—"}</Text>
                                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-400 text-sm">{distanceUnit}</Text>
                                </Pressable>
                            </View>
                        </View>

                        {isTargetConfirmed ? (
                            <View className="px-3 py-3 border-b border-brand-green/30">
                                <View className="bg-orange-950/40 rounded-xl p-3 border border-orange-900/40">
                                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/70 text-[10px] uppercase tracking-wider mb-1">Holdover</Text>
                                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400 font-bold text-2xl">{holdoverText}</Text>
                                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/60 text-xs mt-1">{dropText} drop</Text>
                                    {windText && <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/60 text-xs mt-0.5">Wind drift {windText}</Text>}
                                    {conditionsText !== "" && <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/40 text-[10px] mt-0.5">{conditionsText}</Text>}
                                </View>
                            </View>
                        ) : (
                            <View className="px-3 py-3 border-b border-brand-green/30">
                                <View className="bg-brand-greenDark/40 rounded-xl p-3 border border-brand-green/30">
                                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-500 text-xs text-center">{guidanceText}</Text>
                                </View>
                            </View>
                        )}

                        <View className="px-3 py-2">
                            <Pressable
                                onPress={handlePrimaryAction}
                                className={`rounded-xl py-3 items-center border ${ctaColorClasses}`}
                            >
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white font-bold text-sm">{primaryActionLabelCompact}</Text>
                            </Pressable>
                        </View>

                        <View className="flex-1" />

                        <View className="px-3 pb-3 pt-2 border-t border-brand-green/30">
                            <Pressable
                                onPress={() => setShowRangefinderModal(true)}
                                className="rounded-xl py-2 mb-2 flex-row items-center justify-center border bg-brand-greenDark/60 border-brand-green/50"
                            >
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-400 text-xs">
                                    RF: {rangefinderMode === "LOS" ? "Line-of-Sight" : rangefinderMode === "COMPENSATED" ? "Angle-Comp" : "Not Set"}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleToggleCrosshair}
                                className={`rounded-xl py-2.5 mb-2 flex-row items-center justify-center border ${showCrosshair ? "bg-brand-greenDark border-brand-greenLight" : "bg-brand-greenDark/60 border-brand-green/50"}`}
                            >
                                <Image source={icons.target} className="w-4 h-4 mr-2" resizeMode="contain" style={{ tintColor: showCrosshair ? "#0b7f4f" : "#9ca3af" }} />
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className={`text-xs font-semibold ${showCrosshair ? "text-brand-greenLight" : "text-zinc-400"}`}>
                                    {showCrosshair ? "Hide Zero" : "Verify Zero"}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setShowGuide(true)}
                                className="rounded-xl py-2 mb-2 flex-row items-center justify-center border bg-brand-greenDark/60 border-brand-green/50"
                            >
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-400 text-xs">How it works & limits</Text>
                            </Pressable>
                            <Pressable onPress={handleEndHuntPress} className="rounded-xl py-2.5 bg-red-950/60 border border-red-900/40 items-center">
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-red-400 font-semibold text-xs">End Hunt</Text>
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>

                {RangefinderModal}
                {EndHuntModal}
                {DistanceModal}
                {GuideModal}
            </View>
        );
    }

    // ==================== PORTRAIT LAYOUT ====================
    return (
        <View className="flex-1 bg-brand-black">
            <View style={[StyleSheet.absoluteFill, { bottom: calibrationData.cameraLayout.bottomPanelTotalHeight }]}>
                {CameraContent}
            </View>

            <SafeAreaView className="absolute bottom-0 left-0 right-0 bg-brand-black border-t border-brand-green/40" edges={["bottom"]} style={{ height: calibrationData.cameraLayout.bottomPanelTotalHeight }}>
                <View className="flex-1 px-4 pt-3" style={{ paddingBottom: calibrationData.cameraLayout.bottomPadding }}>
                    <View className="flex-row items-center mb-3">
                        <StatusIndicator />
                        <View className="mr-2">
                            <HelpButton onPress={() => setShowGuide(true)} />
                        </View>
                        <Pressable
                            onPress={handleOpenDistanceInput}
                            disabled={!distancePillEnabled}
                            className={`flex-row items-center bg-brand-greenDark/60 rounded-xl px-4 py-2 border border-brand-green/50 ${distancePillEnabled ? "" : "opacity-40"}`}
                        >
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white font-bold text-xl mr-1.5">{targetDistance ?? "—"}</Text>
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-400 text-base">{distanceUnit}</Text>
                        </Pressable>
                    </View>

                    {isTargetConfirmed ? (
                        <View className="bg-orange-950/40 rounded-xl p-3 mb-3 border border-orange-900/40 flex-row items-center">
                            <View className="flex-1">
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/70 text-[10px] uppercase tracking-wider">Holdover</Text>
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400 font-bold text-2xl">{holdoverText}</Text>
                                {conditionsText !== "" && <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/40 text-[10px]" numberOfLines={1}>{conditionsText}</Text>}
                            </View>
                            <View className="items-end">
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/60 text-sm">{dropText}</Text>
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/40 text-xs">drop</Text>
                                {windText && <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-orange-400/60 text-xs">wind {windText}</Text>}
                            </View>
                        </View>
                    ) : (
                        <View className="bg-brand-greenDark/40 rounded-xl p-3 mb-3 border border-brand-green/30">
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-500 text-sm text-center">{guidanceText}</Text>
                        </View>
                    )}

                    {/* Rangefinder Mode Indicator */}
                    <Pressable
                        onPress={() => setShowRangefinderModal(true)}
                        className="bg-brand-greenDark/40 rounded-lg px-3 py-2 mb-3 border border-brand-green/30 flex-row items-center justify-between"
                    >
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-500 text-xs">Rangefinder Mode</Text>
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-zinc-300 text-xs font-medium">
                            {rangefinderMode === "LOS" ? "Line-of-Sight" : rangefinderMode === "COMPENSATED" ? "Angle-Compensated" : "Tap to Set"}
                        </Text>
                    </Pressable>

                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={handlePrimaryAction}
                            className={`flex-1 rounded-xl py-3.5 items-center justify-center border ${ctaColorClasses}`}
                        >
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white font-bold text-base">{primaryActionLabel}</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleToggleCrosshair}
                            className={`rounded-xl py-3.5 px-4 items-center justify-center border ${showCrosshair ? "bg-brand-greenDark border-brand-greenLight" : "bg-brand-greenDark/60 border-brand-green/50"}`}
                        >
                            <Image source={icons.target} className="w-6 h-6" resizeMode="contain" style={{ tintColor: showCrosshair ? "#0b7f4f" : "#9ca3af" }} />
                        </Pressable>
                        <Pressable onPress={handleEndHuntPress} className="rounded-xl py-3.5 px-4 bg-red-950/60 border border-red-900/40 items-center justify-center">
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-red-400 font-bold text-sm">END</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>

            {RangefinderModal}
            {EndHuntModal}
            {DistanceModal}
                {GuideModal}
        </View>
    );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
    // Holdover crosshair - same style as calibration crosshair but orange
    holdoverContainer: {
        position: "absolute",
        width: 120,
        height: 120,
        alignItems: "center",
        justifyContent: "center",
    },
    // Outer lines - longer, thinner for precise alignment
    holdoverTop: {
        position: "absolute",
        width: 1,
        height: 50,
        top: 0,
        backgroundColor: "#f97316",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 2,
    },
    holdoverBottom: {
        position: "absolute",
        width: 1,
        height: 50,
        bottom: 0,
        backgroundColor: "#f97316",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 2,
    },
    holdoverLeft: {
        position: "absolute",
        width: 50,
        height: 1,
        left: 0,
        backgroundColor: "#f97316",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 2,
    },
    holdoverRight: {
        position: "absolute",
        width: 50,
        height: 1,
        right: 0,
        backgroundColor: "#f97316",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 2,
    },
    // Center dot - tiny 2x2 pixel for exact center indication (red for visibility like calibration)
    holdoverCenter: {
        position: "absolute",
        width: 2,
        height: 2,
        borderRadius: 0,
        backgroundColor: "#ff0000",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 1,
        elevation: 3,
    },
    // Inner crosshair lines - short lines near center for fine alignment
    holdoverInnerTop: {
        position: "absolute",
        width: 1,
        height: 8,
        top: 52,
        backgroundColor: "#f97316",
    },
    holdoverInnerBottom: {
        position: "absolute",
        width: 1,
        height: 8,
        bottom: 52,
        backgroundColor: "#f97316",
    },
    holdoverInnerLeft: {
        position: "absolute",
        width: 8,
        height: 1,
        left: 52,
        backgroundColor: "#f97316",
    },
    holdoverInnerRight: {
        position: "absolute",
        width: 8,
        height: 1,
        right: 52,
        backgroundColor: "#f97316",
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
    mismatchBanner: {
        backgroundColor: "rgba(127, 29, 29, 0.97)",
        borderColor: "#dc2626",
        gap: 10,
    },
    mismatchButton: {
        backgroundColor: "#284a37", // brand-green
        borderWidth: 1,
        borderColor: "rgba(11, 127, 79, 0.5)",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    mismatchButtonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "700",
    },
    magnificationBadge: {
        position: "absolute",
        right: 12,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        borderColor: "rgba(11, 127, 79, 0.6)",
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    magnificationBadgeText: {
        color: "#0b7f4f", // brand-greenLight
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
    },

    // Zero Info Card - centered in camera view
    zeroInfoOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    zeroInfoCard: {
        backgroundColor: "rgba(14, 32, 24, 0.97)",
        borderRadius: 16,
        padding: 16,
        maxWidth: 320,
        width: "100%",
        borderWidth: 1,
        borderColor: "rgba(40, 74, 55, 0.6)", // brand-green/60
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    zeroInfoHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    zeroInfoIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(11, 127, 79, 0.15)", // brand-greenLight/15
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    zeroInfoIcon: {
        width: 20,
        height: 20,
        tintColor: "#0b7f4f",
    },
    zeroInfoTitle: {
        flex: 1,
        color: "#0b7f4f",
        fontSize: 16,
        fontWeight: "700",
    },
    zeroInfoClose: {
        padding: 4,
    },
    zeroInfoCloseIcon: {
        width: 16,
        height: 16,
        tintColor: "rgba(255, 255, 255, 0.5)",
    },
    zeroInfoText: {
        color: "rgba(255, 255, 255, 0.85)",
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    zeroInfoHighlight: {
        color: "#0b7f4f",
        fontWeight: "600",
    },
    zeroInfoSubtext: {
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 12,
        lineHeight: 16,
        fontStyle: "italic",
    },
});
