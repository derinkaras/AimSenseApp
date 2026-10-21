import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Image, StyleSheet, AppState, TouchableOpacity } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions, Camera } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { useIsFocused } from "expo-router/react-navigation";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import { CameraPermissionBanner } from "@/components/CameraPermissionBanner";
import { lockToPortrait } from "@/calibration";
import icons from "@/constants/icons";
import { SlideToStartCalibration } from "@/components/SlideToStartCalibration";

const STORAGE_KEYS = {
    DISMISS_HARDWARE_BANNER: "aimsense.dismissBanner.hardware.v1",
};

const PRE_HUNT_STEPS = [
    { title: "Rifle profile ready", detail: "Check the profile for the rifle you're using." },
    { title: "Phone clamped", detail: "Phone secure on both ends, adapter clamped onto the scope." },
    { title: "Calibrate", detail: "Takes about 2 minutes." },
    { title: "Choose a rifle & hunt", detail: "Pick the rifle profile and begin." },
];

// Viewfinder corner brackets framing the middle of the camera view
const BRACKET = 28;
const BRACKET_STROKE = 2;
const BRACKET_COLOR = "rgba(11, 127, 79, 0.8)"; // brand-greenLight

export default function Home() {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraEnabled, setCameraEnabled] = useState(!!permission?.granted);

    // ============================================================
    // Hardware banner - shows once for new users
    // ============================================================
    const [showHardwareBanner, setShowHardwareBanner] = useState(false);

    useEffect(() => {
        const checkBannerStatus = async () => {
            try {
                const dismissed = await AsyncStorage.getItem(STORAGE_KEYS.DISMISS_HARDWARE_BANNER);
                setShowHardwareBanner(dismissed !== "1");
            } catch {
                setShowHardwareBanner(true);
            }
        };
        checkBannerStatus();
    }, []);

    const dismissHardwareBanner = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowHardwareBanner(false);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DISMISS_HARDWARE_BANNER, "1");
        } catch {}
    }, []);

    const handleGoToStore = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowHardwareBanner(false);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DISMISS_HARDWARE_BANNER, "1");
        } catch {}
        router.push("/(tabs)/Store");
    }, []);

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

    const handleStart = () => router.push("/(calibration)/rifle");

    return (
        <View className="flex-1 bg-brand-black">
            {/* Only render AND activate the camera when permission is granted and this tab is
                focused; `active` pauses the hardware without unmounting, saving battery. */}
            {cameraEnabled && (
                <>
                    <CameraView
                        key={`camera-${cameraKey}`}
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        active={isFocused}
                    />
                    {/* Darken top and bottom so the text reads over any scene */}
                    <LinearGradient
                        colors={["rgba(18,18,18,0.92)", "rgba(14,32,24,0.25)", "rgba(14,32,24,0.35)", "rgba(18,18,18,0.97)"]}
                        locations={[0, 0.3, 0.5, 0.78]}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />
                </>
            )}

            <SafeAreaView className="flex-1" edges={["top"]}>
                {!cameraEnabled ? (
                    <View className="flex-1 justify-center items-center px-6 pb-24">
                        <CameraPermissionBanner onPermissionGranted={handlePermissionGranted} />
                    </View>
                ) : (
                    <View className="flex-1 pt-4 px-6">
                        {/* ===================== HEADER ===================== */}
                        <View className="flex-row items-center">
                            <View className="size-11 rounded-2xl bg-brand-greenDark/80 border border-brand-green/60 items-center justify-center mr-3">
                                <Image source={icons.target} className="size-6" resizeMode="contain" tintColor="#0b7f4f" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-brand-greenLight text-[11px] font-bold tracking-[0.2em]">AIMSENSE</Text>
                                <Text className="text-white text-2xl font-bold">Ready to hunt?</Text>
                            </View>
                        </View>

                        {/* ===================== HARDWARE BANNER (First-time only) ===================== */}
                        {showHardwareBanner && (
                            <View className="mt-4 rounded-2xl bg-brand-greenDark/90 border border-brand-greenLight/40 p-3.5 flex-row items-center">
                                <View className="size-9 rounded-xl bg-brand-green/60 items-center justify-center mr-3 self-start">
                                    <Image source={icons.store} className="size-5" resizeMode="contain" tintColor="#0b7f4f" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-sm font-semibold">Hardware required</Text>
                                    <Text className="text-white/60 text-xs leading-4 mt-0.5">
                                        You&apos;ll need the AimSense adapter and phone mount for your scope.
                                    </Text>
                                    <TouchableOpacity onPress={handleGoToStore} activeOpacity={0.8} className="mt-2 self-start flex-row items-center">
                                        <Text className="text-brand-greenLight text-sm font-semibold mr-1">Visit Store</Text>
                                        <Image source={icons.chevronRight} className="size-3" resizeMode="contain" tintColor="#0b7f4f" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={dismissHardwareBanner}
                                    hitSlop={8}
                                    className="size-7 rounded-full bg-brand-black/60 items-center justify-center ml-2 self-start"
                                >
                                    <Image source={icons.cancel} className="size-3" resizeMode="contain" tintColor="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ===================== VIEWFINDER ===================== */}
                        <View className="flex-1 items-center justify-center" pointerEvents="none">
                            <View style={styles.viewfinder}>
                                <View style={[styles.bracket, styles.bracketTL]} />
                                <View style={[styles.bracket, styles.bracketTR]} />
                                <View style={[styles.bracket, styles.bracketBL]} />
                                <View style={[styles.bracket, styles.bracketBR]} />
                                <View style={styles.centerDot} />
                            </View>
                        </View>

                        {/* ===================== PRE-HUNT CHECKLIST ===================== */}
                        <View className="rounded-3xl bg-brand-black/85 border border-brand-green/50 px-5 py-4">
                            <Text className="text-white/50 text-[11px] font-bold tracking-[0.16em] mb-3">BEFORE YOU BEGIN</Text>
                            {PRE_HUNT_STEPS.map((step, i) => {
                                const last = i === PRE_HUNT_STEPS.length - 1;
                                return (
                                    <View key={step.title} className="flex-row">
                                        {/* Number + line down to the next step */}
                                        <View className="items-center mr-3">
                                            <View className="size-7 rounded-full bg-brand-greenDark border border-brand-greenLight/60 items-center justify-center">
                                                <Text className="text-brand-greenLight text-xs font-bold">{i + 1}</Text>
                                            </View>
                                            {!last && <View className="flex-1 w-px bg-brand-green my-1" />}
                                        </View>
                                        <View className={`flex-1 ${last ? "" : "pb-3"}`}>
                                            <Text className="text-white text-[15px] font-semibold">{step.title}</Text>
                                            <Text className="text-white/55 text-xs leading-4 mt-0.5">{step.detail}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* ===================== CTA ===================== */}
                        <View style={{ paddingBottom: bottomPadding, width: "100%" }} className="mt-4">
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

const styles = StyleSheet.create({
    viewfinder: {
        width: 150,
        height: 150,
        alignItems: "center",
        justifyContent: "center",
    },
    bracket: {
        position: "absolute",
        width: BRACKET,
        height: BRACKET,
        borderColor: BRACKET_COLOR,
    },
    bracketTL: { top: 0, left: 0, borderTopWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE, borderTopLeftRadius: 8 },
    bracketTR: { top: 0, right: 0, borderTopWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE, borderTopRightRadius: 8 },
    bracketBL: { bottom: 0, left: 0, borderBottomWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE, borderBottomLeftRadius: 8 },
    bracketBR: { bottom: 0, right: 0, borderBottomWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE, borderBottomRightRadius: 8 },
    centerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: BRACKET_COLOR,
    },
});
