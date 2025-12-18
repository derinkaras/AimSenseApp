// ============================================================
// step8.tsx - Confirm & Save
// ============================================================
// Final review screen before saving calibration.

import React, { useCallback } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    StyleSheet,
    ScrollView,
    useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
    useCalibrationStore,
    selectMountOrientation,
    selectScopeUnit,
    selectScopeCenterPx,
    selectCameraZoom,
    selectFocusPoint,
    selectScreenRotation,
    selectRoll0,
    selectPitch0,
    selectPxPerUnitX,
    selectPxPerUnitY,
    getOrientationLabel,
    getUnitLabel,
    isLandscape,
} from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "step8";

export default function Step8() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();

    useFocusEffect(
        useCallback(() => {
            setActiveScreen(SCREEN_ID);
            return () => {};
        }, [setActiveScreen])
    );

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { width } = useWindowDimensions();

    const mountOrientation = useCalibrationStore(selectMountOrientation);
    const scopeUnit = useCalibrationStore(selectScopeUnit);
    const scopeCenterPx = useCalibrationStore(selectScopeCenterPx);
    const cameraZoom = useCalibrationStore(selectCameraZoom);
    const focusPoint = useCalibrationStore(selectFocusPoint);
    const screenRotation = useCalibrationStore(selectScreenRotation);
    const roll0 = useCalibrationStore(selectRoll0);
    const pitch0 = useCalibrationStore(selectPitch0);
    const pxPerUnitX = useCalibrationStore(selectPxPerUnitX);
    const pxPerUnitY = useCalibrationStore(selectPxPerUnitY);

    // Determine if focus is locked (autofocus should be off)
    const focusLocked = focusPoint !== null;

    // Rotation transform style
    const rotationTransform = { transform: [{ rotate: `${screenRotation}deg` }] };

    const finishCalibration = useCalibrationStore((s) => s.finishCalibration);
    const reset = useCalibrationStore((s) => s.resetCalibration);

    const isLandscapeMode = isLandscape(mountOrientation);

    const handleConfirm = async () => {
        await finishCalibration();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            })
        );
    };

    const handleBack = () => router.back();

    const handleCancel = async () => {
        await reset();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            })
        );
    };

    // Check if all required data is present
    const hasScopeCenter = scopeCenterPx !== null;
    const hasPixelScale = pxPerUnitX > 0 && pxPerUnitY > 0;
    const hasReference = Number.isFinite(roll0) && Number.isFinite(pitch0);
    const isComplete = hasScopeCenter && hasPixelScale && hasReference;

    // Layout adjustments
    const headerPadding = isLandscapeMode ? "p-3" : "p-5";
    const titleSize = isLandscapeMode ? "text-xl" : "text-2xl";
    const subtitleSize = isLandscapeMode ? "text-sm" : "text-base";
    const subtitleMargin = isLandscapeMode ? "mt-1" : "mt-2";

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
    if (isLandscapeMode) safeAreaEdges.push("left", "right");

    const sideCtaWidth = isLandscapeMode
        ? Math.min(320, Math.max(240, Math.floor(width * 0.34)))
        : 0;

    const bottomPadding = Math.max(insets.bottom, 8);

    const SummaryCards = ({ compact = false }: { compact?: boolean }) => (
        <View className={compact ? "gap-3" : "gap-4"}>
            {/* Scope Center Card */}
            <View className={`rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 ${compact ? "p-4" : "p-5"}`}>
                <View className="flex-row items-center">
                    <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                        <Image source={icons.target} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white/70 text-sm">Scope Center</Text>
                        <Text className={`text-white ${compact ? "text-lg" : "text-xl"} font-semibold mt-1`}>
                            {hasScopeCenter ? "Captured ✓" : "Not captured"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Scope Adjustments Card */}
            <View className={`rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 ${compact ? "p-4" : "p-5"}`}>
                <View className="flex-row items-center">
                    <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                        <Image source={icons.scope} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white/70 text-sm">Scope Adjustments</Text>
                        <Text className={`text-white ${compact ? "text-lg" : "text-xl"} font-semibold mt-1`}>
                            {hasPixelScale ? `Calibrated ✓ (${getUnitLabel(scopeUnit)})` : "Not calibrated"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Reference Card */}
            <View className={`rounded-3xl bg-brand-greenDark/65 border border-brand-green/45 ${compact ? "p-4" : "p-5"}`}>
                <View className="flex-row items-center">
                    <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                        <Image source={icons.compass} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white/70 text-sm">Reference</Text>
                        <Text className={`text-white ${compact ? "text-lg" : "text-xl"} font-semibold mt-1`}>
                            {hasReference ? "Captured ✓" : "Not captured"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Ready to Save Card */}
            {isComplete && (
                <View className="rounded-3xl bg-brand-greenLight/15 border border-brand-greenLight/50 px-4 py-4">
                    <View className="flex-row items-start">
                        <View className="size-10 rounded-2xl bg-brand-greenLight/20 border border-brand-greenLight/40 items-center justify-center mr-3">
                            <Image source={icons.check} className="w-5 h-5" resizeMode="contain" tintColor="#22c55e" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-semibold text-sm">Ready to save</Text>
                            <Text className="text-white/70 mt-1 text-sm">
                                All set. AimSense is ready when you are.
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Incomplete Warning */}
            {!isComplete && (
                <View className="rounded-3xl bg-red-500/15 border border-red-500/30 px-4 py-4">
                    <View className="flex-row items-start">
                        <View className="size-10 rounded-2xl bg-red-500/20 border border-red-500/30 items-center justify-center mr-3">
                            <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#ef4444" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-red-400 font-semibold text-sm">Calibration incomplete</Text>
                            <Text className="text-white/70 mt-1 text-sm">
                                Please go back and complete all steps before saving.
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-brand-black">
            {shouldRenderCamera && (
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                    <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                </View>
            )}

            <SafeAreaView className="flex-1" edges={safeAreaEdges}>
                {!isLandscapeMode ? (
                    <View className="flex-1 px-6 pt-4">
                        <ScrollView
                            className="flex-1"
                            contentContainerStyle={{ paddingBottom: 170 + bottomPadding }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                                <View className="flex-row items-center">
                                    <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                                        <Image source={icons.check} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-white ${titleSize} font-semibold`}>Confirm Calibration</Text>
                                        <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                                            Review your setup before saving.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View className="mt-6">
                                <SummaryCards />
                            </View>
                        </ScrollView>

                        <View style={{ paddingBottom: bottomPadding }} className="absolute bottom-0 left-0 right-0 px-6">
                            <View className="bg-brand-black/55 border border-brand-green/20 rounded-3xl p-3">
                                <Pressable
                                    onPress={handleConfirm}
                                    disabled={!isComplete}
                                    className={[
                                        "rounded-2xl items-center border py-5",
                                        isComplete
                                            ? "bg-brand-greenLight border-brand-green/60"
                                            : "bg-brand-black/50 border-brand-green/30",
                                    ].join(" ")}
                                >
                                    <Text className="text-white font-semibold text-xl">
                                        {isComplete ? "Save Calibration" : "Complete all steps"}
                                    </Text>
                                </Pressable>

                                <View className="flex-row mt-3 gap-3">
                                    <Pressable
                                        onPress={handleBack}
                                        className="flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-4"
                                    >
                                        <Text className="text-white/90 font-semibold text-base">Back</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleCancel}
                                        className="flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-4"
                                    >
                                        <Text className="text-red-400 font-semibold text-base">Cancel</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1 flex-row pt-3">
                        <ScrollView
                            className="flex-1"
                            contentContainerStyle={{ paddingLeft: 16, paddingRight: 12, paddingTop: 8, paddingBottom: 16 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                                <View className="flex-row items-center">
                                    <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                                        <Image source={icons.check} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-white ${titleSize} font-semibold`}>Confirm Calibration</Text>
                                        <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                                            Review your setup before saving.
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View className="mt-4">
                                <SummaryCards compact />
                            </View>
                        </ScrollView>

                        <View
                            style={{
                                width: sideCtaWidth,
                                paddingRight: 16,
                                paddingLeft: 8,
                                paddingBottom: bottomPadding,
                            }}
                        >
                            <View className="bg-brand-black/55 border border-brand-green/20 rounded-3xl p-3">
                                <Text className="text-white/70 text-xs mb-2">Actions</Text>

                                <Pressable
                                    onPress={handleConfirm}
                                    disabled={!isComplete}
                                    className={[
                                        "rounded-2xl items-center border py-4",
                                        isComplete
                                            ? "bg-brand-greenLight border-brand-green/60"
                                            : "bg-brand-black/50 border-brand-green/30",
                                    ].join(" ")}
                                >
                                    <Text className="text-white font-semibold text-lg">
                                        {isComplete ? "Save" : "Incomplete"}
                                    </Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleBack}
                                    className="mt-3 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-3"
                                >
                                    <Text className="text-white/90 font-semibold text-sm">Back</Text>
                                </Pressable>

                                <Pressable
                                    onPress={handleCancel}
                                    className="mt-3 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35 py-3"
                                >
                                    <Text className="text-red-400 font-semibold text-sm">Cancel</Text>
                                </Pressable>

                                <View className="items-center">
                                    <Text className="text-white/50 text-xs mt-3 text-center">
                                        Tip: You can recalibrate anytime from settings.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}