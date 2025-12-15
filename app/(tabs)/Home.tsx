import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation } from "@react-navigation/native";

import { CameraPermissionBanner } from "@/app/components/CameraPermissionBanner";
import { CalibrationOverlay } from "@/app/components/calibration/CalibrationOverlay";
import {MountOrientation, CalibrationResult, CalibStep, CALIBRATING_STEPS} from "@/app/calibration/types";
import { useTiltLevel } from '@/app/hooks/useTiltLevel';
import {lockOrientation, lockToPortrait, TAB_BAR_STYLE} from "../calibration/services";



// ==================== MAIN COMPONENT ====================
export default function Home() {

    const [permission] = useCameraPermissions();
    const navigation = useNavigation(); // This connects to the stack

    // Calibration state
    const [step, setStep] = useState<CalibStep>("start");
    const [mountOrientation, setMountOrientation] = useState<MountOrientation>("portrait");
    const [pendingOrientation, setPendingOrientation] = useState<MountOrientation>("portrait");
    const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
    const [startScreenKey, setStartScreenKey] = useState(0);

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
        const isCalibrating = CALIBRATING_STEPS.includes(step);
        navigation.setOptions({
            tabBarStyle: isCalibrating ? { display: "none" } : TAB_BAR_STYLE,
        });
    }, [step, navigation]);


    // ==================== INITIAL ORIENTATION LOCK ====================
    useEffect(() => {
        // Lock to portrait on mount
        const initOrientation = async () => {
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (err) {
                console.warn("Failed to lock orientation on mount:", err);
            }
        };

        void initOrientation();
    }, []);

    // ==================== CLEANUP ON UNMOUNT ====================
    useEffect(() => {
        return () => {
            void lockToPortrait();
        };
    }, []);

    // ==================== NAVIGATION HANDLERS ====================
    async function handleStartCalibration() {
        // Stay locked to portrait during Step 1 (just selecting)
        setPendingOrientation(mountOrientation);
        setStep("step1");
    }

    async function goToStep2() {
        await lockOrientation(pendingOrientation);
        setMountOrientation(pendingOrientation);
        setStep("step2");
    }

    async function handleBackToStep1() {
        // Lock back to portrait when returning to Step 1
        await lockToPortrait();
        setMountOrientation("portrait");
        setPendingOrientation("portrait");
        setStep("step1");
    }

    async function goToStep3() {
        setStep("step3");
    }

    async function handleBackToStep2() {
        setStep("step2");
    }




    async function handleFinishCalibration() {
        const result: CalibrationResult = {
            mountOrientation,
            levelZeroRollDeg: levelDeg,
        };

        setCalibration(result);
        await lockToPortrait();
        setStartScreenKey(prev => prev + 1);
        setStep("start");
    }

    async function handleCancelCalibration() {
        await lockToPortrait();
        setMountOrientation("portrait");
        setPendingOrientation("portrait");
        setStartScreenKey(prev => prev + 1);
        setStep("start");
    }

    // ==================== SAFE AREA EDGES ====================
    const isLandscape = mountOrientation.includes("landscape");
    const isCalibrating = step === "start" || step === "step1" || step === "step2" || step === "step3";

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
                            startScreenKey={startScreenKey}
                            mountOrientation={mountOrientation}
                            pendingOrientation={pendingOrientation}
                            levelDeg={levelDeg}
                            isLevel={isLevel}

                            // Steps
                            onSelectPendingOrientation={setPendingOrientation}

                            goStep1={handleStartCalibration}
                            goToStep2={goToStep2}
                            backToStep1={handleBackToStep1}
                            goToStep3={goToStep3}
                            backToStep2={handleBackToStep2}

                            finish={handleFinishCalibration}
                            cancel={handleCancelCalibration}
                        />
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}