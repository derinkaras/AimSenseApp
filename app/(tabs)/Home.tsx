import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation } from "@react-navigation/native";

import { CameraPermissionBanner } from "@/app/components/CameraPermissionBanner";
import { CalibrationOverlay, CalibStep } from "@/app/components/calibration/CalibrationOverlay";
import { MountOrientation, CalibrationResult } from "@/app/calibration/types";
import { useTiltLevel } from "@/app/hooks/useTiltLevel";

// ==================== ORIENTATION HELPERS ====================
function getLockForOrientation(orientation: MountOrientation) {
    switch (orientation) {
        case "portrait":
            return ScreenOrientation.OrientationLock.PORTRAIT_UP;
        case "portrait-upside-down":
            return ScreenOrientation.OrientationLock.PORTRAIT_DOWN;
        case "landscape-left":
            return ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
        case "landscape-right":
            return ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;
        default:
            return ScreenOrientation.OrientationLock.PORTRAIT_UP;
    }
}

async function lockOrientation(orientation: MountOrientation) {
    try {
        await ScreenOrientation.lockAsync(getLockForOrientation(orientation));
    } catch (err) {
        console.warn("Failed to lock orientation:", err);
    }
}

async function unlockOrientation() {
    try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (err) {
        console.warn("Failed to unlock orientation:", err);
    }
}

// ==================== TAB BAR STYLE ====================
const TAB_BAR_STYLE = {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: "#0e2018",
    borderTopWidth: 1,
    borderTopColor: "#284a37",
    paddingTop: 14,
    paddingBottom: 16,
};

// ==================== MAIN COMPONENT ====================
export default function Home() {
    const [permission] = useCameraPermissions();
    const navigation = useNavigation(); // This connects to the stack

    // Calibration state
    const [step, setStep] = useState<CalibStep>("start");
    const [mountOrientation, setMountOrientation] = useState<MountOrientation>("portrait");
    const [pendingOrientation, setPendingOrientation] = useState<MountOrientation>("portrait");
    const [calibration, setCalibration] = useState<CalibrationResult | null>(null);

    // Sensor data
    const { levelDeg, isLevel } = useTiltLevel(mountOrientation, {
        toleranceDeg: 0.5,
        holdMs: 600,
        zeroEnterDeg: 0.12,
        zeroExitDeg: 0.6,
        smoothingAlpha: 0.18,
        flatEnterGz: 0.85,
        flatExitGz: 0.75,
    });

    // ==================== TAB BAR VISIBILITY ====================
    useEffect(() => {
        const isCalibrating = step === "step1" || step === "step2";

        navigation.setOptions({
            tabBarStyle: isCalibrating ? { display: "none" } : TAB_BAR_STYLE,
        });
    }, [step, navigation]);

    // ==================== CLEANUP ON UNMOUNT ====================
    useEffect(() => {
        return () => {
            void unlockOrientation();
        };
    }, []);

    // ==================== NAVIGATION HANDLERS ====================
    async function handleStartCalibration() {
        await unlockOrientation();
        setPendingOrientation(mountOrientation);
        setStep("step1");
    }

    async function handleContinueToStep2() {
        await lockOrientation(pendingOrientation);
        setMountOrientation(pendingOrientation);
        setStep("step2");
    }

    async function handleFinishCalibration() {
        const result: CalibrationResult = {
            mountOrientation,
            levelZeroRollDeg: levelDeg,
            calibratedAtISO: new Date().toISOString(),
        };

        setCalibration(result);
        await unlockOrientation();
        setStep("start");
    }

    async function handleCancelCalibration() {
        await unlockOrientation();
        setMountOrientation("portrait");
        setPendingOrientation("portrait");
        setStep("start");
    }

    // ==================== SAFE AREA EDGES ====================
    const isLandscape = mountOrientation.includes("landscape");
    const isCalibrating = step === "start" || step === "step1" || step === "step2";

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top"];
    if (isCalibrating) safeAreaEdges.push("bottom");
    if (isLandscape) safeAreaEdges.push("left", "right");

    // ==================== RENDER ====================
    const cameraEnabled = !!permission?.granted;

    return (
        <View className="flex-1 bg-brand-black">
            {/* Background Camera */}
            {cameraEnabled && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

            {/* UI Overlay */}
            <SafeAreaView className="flex-1" edges={safeAreaEdges}>
                {!cameraEnabled ? (
                    <View className="flex-1 justify-center items-center px-6">
                        <CameraPermissionBanner />
                    </View>
                ) : (
                    <View className={`flex-1 pt-4 ${isLandscape ? "px-4" : "px-6"}`}>
                        <CalibrationOverlay
                            step={step}
                            mountOrientation={mountOrientation}
                            pendingOrientation={pendingOrientation}
                            levelDeg={levelDeg}
                            isLevel={isLevel}
                            onSelectPendingOrientation={setPendingOrientation}
                            applyPendingAndContinue={handleContinueToStep2}
                            goStep1={handleStartCalibration}
                            finish={handleFinishCalibration}
                            cancel={handleCancelCalibration}
                        />
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}