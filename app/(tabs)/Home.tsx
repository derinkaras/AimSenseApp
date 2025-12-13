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

function lockForMount(o: MountOrientation) {
    switch (o) {
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

async function lockAppOrientation(o: MountOrientation) {
    try {
        await ScreenOrientation.lockAsync(lockForMount(o));
    } catch {
        // no-op
    }
}

async function restoreAppOrientation() {
    try {
        // In a tab app, portrait is usually the default.
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {
        // no-op
    }
}

export default function Home() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const navigation = useNavigation();
    const [step, setStep] = useState<CalibStep>("start");

    // Applied mount orientation (used for sensors + saved calibration)
    const [mountOrientation, setMountOrientation] = useState<MountOrientation>("portrait");

    // Pending selection (Step 1 only)
    const [pendingOrientation, setPendingOrientation] = useState<MountOrientation>("portrait");

    const [calibration, setCalibration] = useState<CalibrationResult | null>(null);

    const { levelDeg, isLevel } = useTiltLevel(mountOrientation, {
        toleranceDeg: 0.5,
        holdMs: 600,
        zeroEnterDeg: 0.12,
        zeroExitDeg: 0.6,
        smoothingAlpha: 0.18,
        flatEnterGz: 0.85,
        flatExitGz: 0.75,
    });

    // Hide/show tab bar based on calibration state
    useEffect(() => {
        const isCalibrating = step === "step1" || step === "step2";

        if (isCalibrating) {
            navigation.setOptions({
                tabBarStyle: { display: 'none' },
            });
        } else {
            // Restore the original tab bar style from _layout.tsx
            navigation.setOptions({
                tabBarStyle: {
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 88,
                    backgroundColor: "#0e2018",
                    borderTopWidth: 1,
                    borderTopColor: "#284a37",
                    paddingTop: 14,
                    paddingBottom: 16,
                },
            });
        }
    }, [step, navigation]);

    useEffect(() => {
        // Always start on "start" screen
        setStep("start");

        // Safety: if Home unmounts mid-calibration, restore portrait
        return () => {
            void restoreAppOrientation();
        };
    }, []);

    // Step 1 should always be portrait, so always restore before entering it
    async function goStep1() {
        await restoreAppOrientation();
        setPendingOrientation(mountOrientation);
        setStep("step1");
    }

    // Only lock the app when they click Continue
    async function applyPendingAndContinue() {
        await lockAppOrientation(pendingOrientation);
        setMountOrientation(pendingOrientation);
        setStep("step2");
    }

    async function finishCalibration() {
        const result: CalibrationResult = {
            mountOrientation,
            levelZeroRollDeg: levelDeg,
            calibratedAtISO: new Date().toISOString(),
        };

        setCalibration(result);

        // Exit calibration => restore portrait and go back to start
        await restoreAppOrientation();
        setStep("start");
    }

    async function cancelCalibration() {
        setPendingOrientation(mountOrientation);
        await restoreAppOrientation();
        setStep("start");
    }

    // Determine safe area edges based on orientation and calibration state
    const isLandscape = mountOrientation.includes("landscape");
    const isCalibrating = step === "start" || step === "step1" || step === "step2";

    let safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top"];

    if (isCalibrating) {
        safeAreaEdges.push("bottom");
    }

    if (isLandscape) {
        safeAreaEdges.push("left", "right");
    }

    return (
        <View className="flex-1 bg-brand-black">
            {cameraEnabled && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

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
                            applyPendingAndContinue={applyPendingAndContinue}
                            goStep1={goStep1}
                            finish={finishCalibration}
                            cancel={cancelCalibration}
                        />
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}