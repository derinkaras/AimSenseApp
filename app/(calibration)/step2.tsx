// ============================================================
// step2.tsx - Scope Setup (Units + Click Size)
// ============================================================
// User selects their scope's unit system (MOA/MIL) and click size.

import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
    useCalibrationStore,
    selectScopeUnit,
    selectClickSize,
    selectMountOrientation,
    isLandscape,
    ScopeUnit,
    MOA_CLICK_OPTIONS,
    MIL_CLICK_OPTIONS,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step2";

export default function Step2() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();

    useFocusEffect(
        useCallback(() => {
            console.log(SCREEN_ID)

            setActiveScreen(SCREEN_ID);
            return () => {};
        }, [setActiveScreen])
    );

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    const insets = useSafeAreaInsets();
    // const bottomPadding = Math.max(insets.bottom, 8);
    const navigation = useNavigation();

    const mountOrientation = useCalibrationStore(selectMountOrientation);
    const scopeUnit = useCalibrationStore(selectScopeUnit);
    const clickSize = useCalibrationStore(selectClickSize);
    const setScopeUnit = useCalibrationStore((s) => s.setScopeUnit);
    const setClickSize = useCalibrationStore((s) => s.setClickSize);
    const reset = useCalibrationStore((s) => s.resetCalibration);

    const isLandscapeMode = isLandscape(mountOrientation);
    const clickOptions = scopeUnit === "MOA" ? MOA_CLICK_OPTIONS : MIL_CLICK_OPTIONS;

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
    if (isLandscapeMode) safeAreaEdges.push("left", "right");

    // Layout tuning
    const headerPadding = isLandscapeMode ? "p-3" : "p-5";
    const titleSize = isLandscapeMode ? "text-xl" : "text-2xl";
    const subtitleSize = isLandscapeMode ? "text-sm" : "text-base";
    const subtitleMargin = isLandscapeMode ? "mt-1" : "mt-2";

    const handleNext = () => {
        router.push("/(calibration)/step3");
    };

    const handleBack = () => {
        router.back();
    };

    const handleCancel = async () => {
        await reset();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            })
        );
    };

    const handleUnitSelect = (unit: ScopeUnit) => {
        setScopeUnit(unit);
    };

    return (
        <View className="flex-1 bg-brand-black">
            {shouldRenderCamera && (
                <CameraView style={StyleSheet.absoluteFill} facing="back" />
            )}

            <SafeAreaView className="flex-1" edges={safeAreaEdges}>
                <View className={`flex-1 ${isLandscapeMode ? "px-4" : "px-6"} pt-4`}>
                    {/* Content */}
                    <ScrollView
                        className="mt-5"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 16, paddingBottom: 200 }}
                    >
                        {/* Header */}
                        <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                            <View className="flex-row items-center">
                                <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                                    <Image source={icons.scope} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-white ${titleSize} font-semibold`}>Scope Setup</Text>
                                    <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                                        AimSense will guide your scope adjustments.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Unit Selection */}
                        <View className="rounded-3xl bg-brand-greenDark/50 border border-brand-green/40 p-4">
                            <Text className="text-white font-semibold text-lg mb-3">Unit System</Text>

                            <View className="flex-row gap-3">
                                {(["MOA", "MIL"] as ScopeUnit[]).map((unit) => {
                                    const selected = scopeUnit === unit;
                                    return (
                                        <Pressable
                                            key={unit}
                                            onPress={() => handleUnitSelect(unit)}
                                            className={[
                                                "flex-1 rounded-2xl py-4 items-center border",
                                                selected
                                                    ? "bg-brand-greenLight/20 border-brand-greenLight"
                                                    : "bg-brand-black/40 border-brand-green/30",
                                            ].join(" ")}
                                        >
                                            <Text
                                                className={[
                                                    "text-lg font-semibold",
                                                    selected ? "text-white" : "text-white/70",
                                                ].join(" ")}
                                            >
                                                {unit === "MOA" ? "MOA" : "MIL / MRAD"}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Click Size Selection */}
                        <View className="rounded-3xl bg-brand-greenDark/50 border border-brand-green/40 p-4">
                            <Text className="text-white font-semibold text-lg mb-1">Click Size</Text>
                            <Text className="text-white/60 text-sm mb-4">
                                Check your turret markings or manual.
                            </Text>

                            <View className="gap-3">
                                {clickOptions.map((option) => {
                                    const selected = clickSize === option.value;
                                    return (
                                        <Pressable
                                            key={option.value}
                                            onPress={() => setClickSize(option.value)}
                                            className={[
                                                "rounded-2xl px-4 py-4 flex-row items-center border",
                                                selected
                                                    ? "bg-brand-greenLight/15 border-brand-greenLight"
                                                    : "bg-brand-black/40 border-brand-green/30",
                                            ].join(" ")}
                                        >
                                            <View className="flex-1">
                                                <Text
                                                    className={[
                                                        "text-lg font-semibold",
                                                        selected ? "text-white" : "text-white/70",
                                                    ].join(" ")}
                                                >
                                                    {option.label}
                                                </Text>
                                                <Text className="text-white/50 text-sm mt-0.5">
                                                    {option.value} {scopeUnit.toLowerCase()} per click
                                                </Text>
                                            </View>

                                            <View
                                                className={[
                                                    "size-6 rounded-full border items-center justify-center",
                                                    selected
                                                        ? "border-brand-greenLight bg-brand-greenLight/15"
                                                        : "border-brand-green/40 bg-transparent",
                                                ].join(" ")}
                                            >
                                                {selected && (
                                                    <Image
                                                        source={icons.check}
                                                        className="w-4 h-4"
                                                        resizeMode="contain"
                                                        tintColor="#0b7f4f"
                                                    />
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Helper Tip */}
                        <View className="rounded-3xl bg-brand-black/40 border border-brand-green/25 px-4 py-4">
                            <View className="flex-row items-start">
                                <View className="size-10 rounded-2xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center mr-3">
                                    <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">AimSense handles the math</Text>
                                    <Text className="text-white/70 mt-1 text-sm">
                                        Just follow the steps — we'll tell you exactly how many clicks to dial.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    {/* CTAs - Icon Buttons */}
                    <View className="py-2">
                        <View className="flex-row items-center justify-center gap-4">
                            <Pressable
                                onPress={handleBack}
                                className={`rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35 ${isLandscapeMode ? "size-11" : "size-14"}`}
                            >
                                <Image source={icons.chevronLeft} className={isLandscapeMode ? "w-5 h-5" : "w-6 h-6"} resizeMode="contain" tintColor="#e5e5e5" />
                            </Pressable>

                            <Pressable
                                onPress={handleNext}
                                className={`rounded-xl items-center justify-center bg-brand-greenLight border border-brand-green/60 ${isLandscapeMode ? "size-11" : "size-14"}`}
                            >
                                <Image source={icons.chevronRight} className={isLandscapeMode ? "w-5 h-5" : "w-6 h-6"} resizeMode="contain" tintColor="#ffffff" />
                            </Pressable>

                            <Pressable
                                onPress={handleCancel}
                                className={`rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35 ${isLandscapeMode ? "size-11" : "size-14"}`}
                            >
                                <Image source={icons.cancel} className={isLandscapeMode ? "w-5 h-5" : "w-6 h-6"} resizeMode="contain" tintColor="#e5e5e5" />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}