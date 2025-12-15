import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ScreenOrientation from "expo-screen-orientation";
import { CameraPermissionBanner } from "@/app/components/CameraPermissionBanner";
import {
    useCalibrationStore,
    selectIsCalibrated,
    selectSavedResult,
    lockToPortrait,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import {SlideToStartCalibration} from "@/app/components/SlideToStartCalibration";

export default function Home() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const bottomPadding = tabBarHeight + insets.bottom + 12;

    // Key to force slider reset when returning to this screen
    const [sliderKey, setSliderKey] = useState(0);

    // Store
    const isCalibrated = useCalibrationStore(selectIsCalibrated);
    const savedResult = useCalibrationStore(selectSavedResult);
    const hydrate = useCalibrationStore((s) => s.hydrate);
    const isHydrated = useCalibrationStore((s) => s.isHydrated);
    const clearSaved = useCalibrationStore((s) => s.clearSavedCalibration);

    // Reset slider and re-hydrate whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            setSliderKey(prev => prev + 1);
            hydrate();
        }, [hydrate])
    );

    // Lock to portrait on mount
    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => { lockToPortrait(); };
    }, []);

    const handleStart = () => router.push("/(calibration)/step1");

    const handleRecalibrate = async () => {
        await clearSaved();
        router.push("/(calibration)/step1");
    };

    return (
        <View className="flex-1 bg-brand-black">
            {cameraEnabled && <CameraView style={StyleSheet.absoluteFill} facing="back" />}

            <SafeAreaView className="flex-1" edges={["top"]}>
                {!cameraEnabled ? (
                    <View className="flex-1 justify-center items-center px-6 pb-24">
                        <CameraPermissionBanner />
                    </View>
                ) : !isHydrated ? (
                    <View className="flex-1 justify-center items-center pb-24">
                        <Text className="text-white text-lg">Loading...</Text>
                    </View>
                ) : (
                    <View className="flex-1 pt-4 px-6">
                        {/* Main Message */}
                        <View className="rounded-3xl bg-brand-greenDark/70 border border-brand-green/60 p-6">
                            <View className="flex-row items-center">
                                <View className="size-14 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                                    <Image source={icons.target} className="w-8 h-8" resizeMode="contain" tintColor="#0b7f4f" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-3xl font-bold">
                                        {isCalibrated ? "Ready to Hunt" : "Ready to Hunt?"}
                                    </Text>
                                    <Text className="text-white/80 mt-1 text-base">
                                        {isCalibrated ? "Calibration complete" : "Quick setup to get you zeroed in"}
                                    </Text>
                                </View>
                            </View>

                            {/* Calibration Steps or Status */}
                            {isCalibrated && savedResult ? (
                                <View className="mt-5 gap-2">
                                    <View className="flex-row items-center">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Image source={icons.check} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />
                                        </View>
                                        <Text className="text-white/90 text-base flex-1">
                                            Orientation: {savedResult.mountOrientation}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Image source={icons.check} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />
                                        </View>
                                        <Text className="text-white/90 text-base flex-1">
                                            Calibrated: {new Date(savedResult.calibratedAt).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View className="mt-5 gap-2">
                                    <View className="flex-row items-center">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Text className="text-brand-greenLight text-sm font-bold">1</Text>
                                        </View>
                                        <Text className="text-white/90 text-base flex-1">Phone orientation</Text>
                                    </View>

                                    <View className="flex-row items-center">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Text className="text-brand-greenLight text-sm font-bold">2</Text>
                                        </View>
                                        <Text className="text-white/90 text-base flex-1">Level calibration</Text>
                                    </View>

                                    <View className="flex-row items-center">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Text className="text-brand-greenLight text-sm font-bold">3</Text>
                                        </View>
                                        <Text className="text-white/90 text-base flex-1">Phone to scope reference</Text>
                                    </View>

                                    <View className="flex-row items-center">
                                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                                            <Text className="text-brand-greenLight text-sm font-bold">4</Text>
                                        </View>
                                        <Text className="text-white/90 text-base flex-1">Confirm & begin</Text>
                                    </View>
                                </View>
                            )}

                            <View className="mt-4 rounded-2xl bg-brand-black/35 border border-brand-green/25 px-4 py-3">
                                <Text className="text-white/70 text-sm text-center">
                                    {isCalibrated ? "Tap below to recalibrate" : "Takes about 90 seconds • Guarantees Accuracy"}
                                </Text>
                            </View>
                        </View>

                        {/* CTA - Full width slider */}
                        <View style={{ paddingBottom: bottomPadding, width: '100%' }} className="mt-auto">
                            <SlideToStartCalibration
                                key={`slide-${sliderKey}`}
                                onComplete={isCalibrated ? handleRecalibrate : handleStart}
                                label={isCalibrated ? "Recalibrate" : "Calibrate"}
                            />
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}