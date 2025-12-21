// ============================================================
// app/(hunt)/_layout.tsx - Hunt Mode Layout
// ============================================================
// Manages camera context for hunt mode screens.
// Ensures camera configuration matches calibration invariants.

import React, { createContext, useContext, useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";

import { useHuntStore, selectCameraInvariants, selectHuntStatus } from "@/app/hunt/store";
import { useCalibrationStore, selectSavedResult, lockOrientation } from "@/app/calibration/exports";

// ==================== CAMERA CONTEXT ====================

type CameraContextType = {
    activeScreen: string | null;
    setActiveScreen: (screen: string | null) => void;
};

const CameraContext = createContext<CameraContextType>({
    activeScreen: null,
    setActiveScreen: () => {},
});

export const useCameraContext = () => useContext(CameraContext);

// ==================== LAYOUT COMPONENT ====================

export default function HuntLayout() {
    const router = useRouter();
    const [activeScreen, setActiveScreen] = useState<string | null>("select-gun");
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);

    // Get calibration result and hunt store
    const savedCalibration = useCalibrationStore(selectSavedResult);
    const huntStatus = useHuntStore(selectHuntStatus);
    const initializeHunt = useHuntStore((s) => s.initializeHunt);

    // Initialize hunt mode with calibration data
    useEffect(() => {
        const initHunt = async () => {
            try {
                // Verify we have calibration data
                if (!savedCalibration) {
                    setInitError("No calibration data found. Please complete calibration first.");
                    setIsInitializing(false);
                    return;
                }

                // Lock screen to calibrated orientation
                await lockOrientation(savedCalibration.mountOrientation);

                // Initialize hunt store with calibration data
                if (huntStatus === "idle") {
                    initializeHunt(savedCalibration);
                }

                console.log("🎯 Hunt mode initialized:", {
                    orientation: savedCalibration.mountOrientation,
                    zoom: savedCalibration.cameraZoom,
                    rotation: savedCalibration.screenRotation,
                });

                setIsInitializing(false);
            } catch (error) {
                console.error("Failed to initialize hunt mode:", error);
                setInitError("Failed to initialize hunt mode. Please try again.");
                setIsInitializing(false);
            }
        };

        initHunt();
    }, [savedCalibration, huntStatus, initializeHunt]);

    // Show loading state during initialization
    if (isInitializing) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#22c55e" />
                <Text className="text-white mt-4 text-lg">Initializing Hunt Mode...</Text>
                <Text className="text-gray-500 mt-2 text-sm">Preparing camera and sensors</Text>
            </View>
        );
    }

    // Show error state if initialization failed
    if (initError) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center px-8">
                <View className="size-16 rounded-full bg-red-900/30 items-center justify-center mb-4">
                    <Text className="text-red-400 text-2xl">!</Text>
                </View>
                <Text className="text-white text-xl font-semibold text-center mb-2">
                    Cannot Start Hunt
                </Text>
                <Text className="text-gray-400 text-center mb-6">{initError}</Text>
                <View className="flex-row gap-4">
                    <View
                        className="px-6 py-3 rounded-xl bg-zinc-800 border border-zinc-700"
                        onTouchEnd={() => router.replace("/(tabs)/Home")}
                    >
                        <Text className="text-white font-semibold">Go Back</Text>
                    </View>
                    <View
                        className="px-6 py-3 rounded-xl bg-brand-greenLight border border-brand-green/60"
                        onTouchEnd={() => router.replace("/(calibration)/step1")}
                    >
                        <Text className="text-white font-semibold">Recalibrate</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <CameraContext.Provider value={{ activeScreen, setActiveScreen }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                    gestureEnabled: false,
                }}
            />
        </CameraContext.Provider>
    );
}
