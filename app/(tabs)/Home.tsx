import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet, AppState } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions, Camera } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";

import { CameraPermissionBanner } from "@/app/components/CameraPermissionBanner";
import { lockToPortrait } from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { SlideToStartCalibration } from "@/app/components/SlideToStartCalibration";

export default function Home() {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraEnabled, setCameraEnabled] = useState(!!permission?.granted);

    // ============================================================
    // KEY OPTIMIZATION: Track if this screen is focused
    // ============================================================
    const isFocused = useIsFocused();

    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const bottomPadding = tabBarHeight + insets.bottom + 12;

    // Key to force slider reset when returning to this screen
    const [sliderKey, setSliderKey] = useState(0);

    // Key to force camera remount when permission changes
    const [cameraKey, setCameraKey] = useState(0);

    // ============================================================
    // OPTION 1: Callback for when permission is granted via banner
    // ============================================================
    const handlePermissionGranted = useCallback(() => {
        setCameraEnabled(true);
        setCameraKey(prev => prev + 1);
    }, []);

    // ============================================================
    // OPTION 2: AppState listener for when user returns from Settings
    // ============================================================
    useEffect(() => {
        const subscription = AppState.addEventListener("change", async (nextAppState) => {
            if (nextAppState === "active") {
                // User returned to app - check if they granted permission in Settings
                const { granted } = await Camera.getCameraPermissionsAsync();
                if (granted && !cameraEnabled) {
                    setCameraEnabled(true);
                    setCameraKey(prev => prev + 1);
                }
            }
        });

        return () => subscription.remove();
    }, [cameraEnabled]);

    // Update cameraEnabled when permission changes
    useEffect(() => {
        setCameraEnabled(!!permission?.granted);
        if (permission?.granted) {
            setCameraKey(prev => prev + 1);
        }
    }, [permission?.granted]);

    // Re-check permissions when screen comes into focus
    // This handles the case where user grants permission in system settings
    useFocusEffect(
        useCallback(() => {
            const checkPermission = async () => {
                const { granted } = await Camera.getCameraPermissionsAsync();
                if (granted && !cameraEnabled) {
                    setCameraEnabled(true);
                    setCameraKey(prev => prev + 1);
                }
            };
            checkPermission();
            setSliderKey((prev) => prev + 1);
        }, [cameraEnabled])
    );

    // Lock to portrait on mount
    useEffect(() => {
        ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            lockToPortrait();
        };
    }, []);

    const handleStart = () => router.push("/(calibration)/step1");

    return (
        <View className="flex-1 bg-brand-black">
            {/* ============================================================
          KEY OPTIMIZATION: Only render AND activate camera when:
          1. Permission granted
          2. Screen is focused (user is viewing this tab)

          The isActive prop pauses camera hardware without unmounting,
          saving significant battery when user switches tabs.
          ============================================================ */}
            {cameraEnabled && (
                <CameraView
                    key={`camera-${cameraKey}`}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    active={isFocused}  // ← PAUSES when tab switches!
                />
            )}

            <SafeAreaView className="flex-1" edges={["top"]}>
                {!cameraEnabled ? (
                    <View className="flex-1 justify-center items-center px-6 pb-24">
                        <CameraPermissionBanner onPermissionGranted={handlePermissionGranted} />
                    </View>
                ) : (
                    <View className="flex-1 pt-4 px-6">
                        {/* ===================== MAIN CARD ===================== */}
                        <View className="rounded-3xl bg-brand-greenDark/70 border border-brand-green/60 p-6">
                            <View className="flex-row items-center">
                                <View className="size-14 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                                    <Image
                                        source={icons.target}
                                        className="w-8 h-8"
                                        resizeMode="contain"
                                        tintColor="#0b7f4f"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-3xl font-bold">
                                        Start Hunt
                                    </Text>
                                </View>
                            </View>

                            {/* ===================== PRE-HUNT STEPS ===================== */}
                            <View className="mt-5 gap-4">
                                {/* Header */}
                                <Text className="text-white/80 text-lg font-semibold">
                                    Before you begin:
                                </Text>

                                {/* Step 1 */}
                                <View className="flex-row">
                                    <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                        <Text className="text-brand-greenLight text-sm font-bold">
                                            1
                                        </Text>
                                    </View>
                                    <Text className="text-white/90 text-base flex-1 mr-11">
                                        Make sure the profile for the gun you want to use is ready.
                                    </Text>
                                </View>

                                {/* Step 2 - Clamping */}
                                <View className="flex-row">
                                    <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                        <Text className="text-brand-greenLight text-sm font-bold">
                                            2
                                        </Text>
                                    </View>
                                    <Text className="text-white/90 text-base flex-1 mr-11">
                                        Make sure the phone is securely clamped on both ends of the adapter and that the adapter itself is clamped onto the scope.
                                    </Text>
                                </View>

                                {/* Step 3 - Calibration */}
                                <View>
                                    <View className="flex-row">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Text className="text-brand-greenLight text-sm font-bold">
                                                3
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-center items-center gap-2">
                                            <Text className="text-white/90 text-base">
                                                Calibration
                                            </Text>
                                            {/* Sub-step */}
                                            <Text className="text-white/70 text-sm text-center">(takes ~2 minutes)</Text>

                                        </View>
                                    </View>

                                </View>

                                {/* Step 4 */}
                                <View className="flex-row">
                                    <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                        <Text className="text-brand-greenLight text-sm font-bold">
                                            4
                                        </Text>
                                    </View>
                                    <Text className="text-white/90 text-base flex-1 mr-11">
                                        Choose a rifle profile & begin your hunt
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* ===================== CTA ===================== */}
                        <View
                            style={{ paddingBottom: bottomPadding, width: "100%" }}
                            className="mt-auto"
                        >
                            <SlideToStartCalibration
                                key={`slide-${sliderKey}`}
                                onComplete={handleStart}
                                label="Start Hunt"
                            />
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}