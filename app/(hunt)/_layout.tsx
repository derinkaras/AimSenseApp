// ============================================================
// app/(hunt)/_layout.tsx - Hunt Mode Layout
// ============================================================
// Manages camera context for hunt mode screens.
// Ensures camera configuration matches calibration invariants.
//
// IMPORTANT: This layout does NOT initialize the hunt store.
// Initialization happens in step8.tsx via beginHunt().
// This layout only verifies the hunt store has valid data.

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";

import { useHuntStore, selectCalibrationResult, selectHuntStatus } from "@/app/hunt/store";
import { lockOrientation } from "@/app/calibration/exports";

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
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInitialized = useRef(false);

    // Get calibration result from HUNT STORE (not calibration store!)
    // This was set by beginHunt() in step8.tsx via initializeHunt()
    const huntCalibration = useHuntStore(selectCalibrationResult);
    const huntStatus = useHuntStore(selectHuntStatus);

    // Verify hunt store has valid data and lock orientation
    useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // If we already successfully initialized, don't do anything
        if (hasInitialized.current) {
            return;
        }

        const verifyHunt = async () => {
            // If we have valid data, proceed
            if (huntCalibration && huntStatus !== "idle") {
                try {
                    // Lock screen to calibrated orientation
                    await lockOrientation(huntCalibration.mountOrientation);

                    console.log("🎯 Hunt layout verified:", {
                        status: huntStatus,
                        orientation: huntCalibration.mountOrientation,
                        zoom: huntCalibration.cameraZoom,
                        rotation: huntCalibration.screenRotation,
                    });

                    hasInitialized.current = true;
                    setIsInitializing(false);
                } catch (error) {
                    console.error("Failed to lock orientation:", error);
                    setInitError("Failed to initialize hunt mode. Please try again.");
                    setIsInitializing(false);
                }
                return;
            }

            // Data not available yet - this is expected on first render
            // The useEffect will re-run when huntCalibration/huntStatus change
            console.log("Hunt layout: Waiting for hunt store data...", {
                hasCalibration: !!huntCalibration,
                status: huntStatus,
            });
        };

        verifyHunt();

        // Set a timeout to show error if data never arrives (e.g., user navigated directly)
        timeoutRef.current = setTimeout(() => {
            if (!hasInitialized.current && !huntCalibration) {
                console.error("Hunt layout: Timeout - no calibration data received");
                setInitError("No calibration data found. Please complete calibration first.");
                setIsInitializing(false);
            }
        }, 2000); // 2 second timeout

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [huntCalibration, huntStatus]);

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