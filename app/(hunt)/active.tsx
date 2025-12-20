// ============================================================
// app/(hunt)/active.tsx - Active Hunt Screen
// ============================================================
// Live hunting experience with:
// - Camera view with calibrated settings
// - Toggle crosshair to verify calibration alignment
// - Clean minimal HUD with pulsing "Live" indicator

import React, { useCallback, useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    StyleSheet,
    Modal,
    Animated,
    Easing,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useCalibrationStore } from "@/app/calibration/exports";
import {
    useHuntStore,
    selectSelectedGun,
    selectCalibrationResult,
    selectIsHuntActive,
} from "@/app/hunt/store";
import { isLandscape } from "@/app/calibration/exports";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";
import * as ScreenOrientation from "expo-screen-orientation";
const SCREEN_ID = "active";

export default function ActiveHunt() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();
    const insets = useSafeAreaInsets();

    // UI State
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showCrosshair, setShowCrosshair] = useState(false);
    const crosshairOpacity = useRef(new Animated.Value(0)).current;
    
    // Pulsing animation for Live indicator
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(1)).current;

    // Hunt store
    const selectedGun = useHuntStore(selectSelectedGun);
    const calibrationResult = useHuntStore(selectCalibrationResult);
    const isHuntActive = useHuntStore(selectIsHuntActive);
    const endHunt = useHuntStore((s) => s.endHunt);
    const resetCalibration = useCalibrationStore((s) => s.resetCalibration);
    useFocusEffect(
        useCallback(() => {
            console.log(SCREEN_ID);
            setActiveScreen(SCREEN_ID);
            return () => {};
        }, [setActiveScreen])
    );

    // Start pulsing animation on mount
    useEffect(() => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 1.4,
                        duration: 600,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseOpacity, {
                        toValue: 0.3,
                        duration: 600,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseOpacity, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        
        pulseAnimation.start();
        
        return () => pulseAnimation.stop();
    }, []);

    // Animate crosshair visibility
    useEffect(() => {
        Animated.timing(crosshairOpacity, {
            toValue: showCrosshair ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showCrosshair]);

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    // Get calibration settings
    const mountOrientation = calibrationResult?.mountOrientation ?? "portrait";
    const cameraZoom = calibrationResult?.cameraZoom ?? 0;
    const screenRotation = calibrationResult?.screenRotation ?? 0;
    const focusPoint = calibrationResult?.focusPoint;
    const scopeCenterPx = calibrationResult?.scopeCenterPx;
    const focusLocked = focusPoint !== null;

    const isLandscapeMode = isLandscape(mountOrientation);
    const rotationTransform = { transform: [{ rotate: `${screenRotation}deg` }] };

    const bottomPadding = Math.max(insets.bottom, 16);

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
    if (isLandscapeMode) safeAreaEdges.push("left", "right");

    // Get unit info
    const isImperial = selectedGun?.unitSystem === "IMPERIAL";

    // Handlers
    const handleToggleCrosshair = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowCrosshair(!showCrosshair);
    };

    const handleEndHuntPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEndConfirm(true);
    };

    const handleConfirmEndHunt = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowEndConfirm(false);
        endHunt();
        resetCalibration();

        // Unlock orientation before navigating back
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        setTimeout(() => {
            router.replace("/(tabs)/Home");
        }, 100);
    };

    const handleCancelEndHunt = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEndConfirm(false);
    };

    // Pulsing Live Indicator Component
    const PulsingLiveIndicator = () => (
        <View style={styles.liveIndicatorRow}>
            <View style={styles.pulseContainer}>
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseOpacity,
                        },
                    ]}
                />
                <View style={styles.liveDot} />
            </View>
            <Text style={styles.liveText}>Live</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-brand-black">
            {/* Camera with calibrated settings */}
            {shouldRenderCamera && (
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        zoom={cameraZoom}
                        autofocus={focusLocked ? "off" : "on"}
                    />
                </View>
            )}

            {/* Scope Center Crosshair - conditionally visible with animation */}
            {scopeCenterPx && (
                <Animated.View
                    style={[
                        styles.crosshairContainer,
                        {
                            left: scopeCenterPx.x - 50,
                            top: scopeCenterPx.y - 50,
                            opacity: crosshairOpacity,
                        },
                    ]}
                    pointerEvents="none"
                >
                    <View style={styles.crosshairRing} />
                    <View style={styles.crosshairV} />
                    <View style={styles.crosshairH} />
                    <View style={styles.crosshairDot} />
                    <View style={styles.crosshairLabel}>
                        <Text style={styles.crosshairLabelText}>ZERO</Text>
                    </View>
                </Animated.View>
            )}

            <SafeAreaView className="flex-1" edges={safeAreaEdges}>
                <View className={`flex-1 ${isLandscapeMode ? "px-4" : "px-6"}`}>

                    {/* TOP HUD */}
                    <View className="flex-row items-center justify-between mt-2">
                        {/* Selected Gun Badge */}
                        <View className="px-3 py-2 rounded-xl bg-black/60 backdrop-blur border border-zinc-700/50 flex-1 mr-2">
                            <Text className="text-zinc-500 text-[10px] uppercase tracking-wider">Rifle</Text>
                            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                                {selectedGun?.name ?? "Unknown"}
                            </Text>
                        </View>

                        {/* End Hunt Button */}
                        <Pressable
                            onPress={handleEndHuntPress}
                            className="px-3 py-2.5 rounded-xl bg-red-950/70 border border-red-900/50"
                        >
                            <Text className="text-red-400 font-semibold text-xs">
                                End
                            </Text>
                        </Pressable>

                        {/* Status Badge with Pulsing Indicator */}
                        <View className="px-3 py-2 rounded-xl bg-brand-greenDark/70 border border-brand-green/50 flex-1 ml-2">
                            <PulsingLiveIndicator />
                        </View>
                    </View>

                    {/* BOTTOM CONTROLS */}
                    <View
                        className="absolute bottom-0 left-0 right-0"
                        style={{ paddingBottom: bottomPadding, paddingHorizontal: isLandscapeMode ? 16 : 24 }}
                    >
                        {/* Check Calibration Button */}
                        <Pressable
                            onPress={handleToggleCrosshair}
                            className={`rounded-2xl py-4 flex-row items-center justify-center border ${
                                showCrosshair
                                    ? "bg-brand-greenDark/90 border-brand-green"
                                    : "bg-black/70 border-zinc-700/50"
                            }`}
                            style={styles.calibrationButton}
                        >
                            <Image
                                source={icons.target}
                                className="w-5 h-5 mr-2.5"
                                resizeMode="contain"
                                tintColor={showCrosshair ? "#22c55e" : "#9ca3af"}
                            />
                            <Text className={`font-semibold ${showCrosshair ? "text-white" : "text-zinc-400"}`}>
                                {showCrosshair ? "Hide Crosshair" : "Confirm Calibration"}
                            </Text>

                            <View className={`ml-3 px-2 py-0.5 rounded-full ${showCrosshair ? "bg-green-500/20" : "bg-zinc-700/50"}`}>
                                <Text className={`text-[10px] font-medium ${showCrosshair ? "text-green-400" : "text-zinc-500"}`}>
                                    {showCrosshair ? "ON" : "OFF"}
                                </Text>
                            </View>
                        </Pressable>

                        <Text className="text-zinc-600 text-[11px] text-center mt-2.5">
                            {showCrosshair
                                ? "Align your scope reticle with the green crosshair to make sure you're still calibrated"
                                : "Tap to verify your scope is still aligned"
                            }
                        </Text>
                    </View>
                </View>
            </SafeAreaView>

            {/* End Hunt Confirmation Modal */}
            <Modal
                visible={showEndConfirm}
                animationType="fade"
                transparent={true}
                onRequestClose={handleCancelEndHunt}
                supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Icon */}
                        <View style={styles.modalIconContainer}>
                            <View style={styles.modalIconCircle}>
                                <Image
                                    source={icons.cancel}
                                    style={styles.modalIcon}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>

                        {/* Title & Message */}
                        <Text style={styles.modalTitle}>End Hunt?</Text>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to end this hunting session? You'll need to recalibrate to start a new hunt.
                        </Text>

                        {/* Buttons */}
                        <View style={styles.modalButtonRow}>
                            <Pressable
                                onPress={handleCancelEndHunt}
                                style={styles.modalCancelButton}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleConfirmEndHunt}
                                style={styles.modalConfirmButton}
                            >
                                <Text style={styles.modalButtonText}>End Hunt</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    // Crosshair styles
    crosshairContainer: {
        position: "absolute",
        width: 100,
        height: 100,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    crosshairRing: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1.5,
        borderColor: "rgba(34, 197, 94, 0.4)",
    },
    crosshairV: {
        position: "absolute",
        width: 2,
        height: 100,
        backgroundColor: "#22c55e",
    },
    crosshairH: {
        position: "absolute",
        width: 100,
        height: 2,
        backgroundColor: "#22c55e",
    },
    crosshairDot: {
        position: "absolute",
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#22c55e",
        borderWidth: 2,
        borderColor: "rgba(0, 0, 0, 0.5)",
    },
    crosshairLabel: {
        position: "absolute",
        bottom: -18,
        backgroundColor: "rgba(34, 197, 94, 0.9)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    crosshairLabelText: {
        color: "#000",
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 1,
    },
    calibrationButton: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    
    // Pulsing indicator styles
    liveIndicatorRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    pulseContainer: {
        width: 12,
        height: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    pulseRing: {
        position: "absolute",
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#4ade80",
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#4ade80",
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 4,
    },
    liveText: {
        color: "#86efac",
        fontWeight: "600",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginLeft: 6,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    modalContent: {
        backgroundColor: "#18181b",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#3f3f46",
        padding: 24,
        width: "100%",
        maxWidth: 320,
    },
    modalIconContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    modalIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(127, 29, 29, 0.3)",
        borderWidth: 1,
        borderColor: "rgba(220, 38, 38, 0.4)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalIcon: {
        width: 28,
        height: 28,
        tintColor: "#ef4444",
    },
    modalTitle: {
        color: "#ffffff",
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 8,
    },
    modalMessage: {
        color: "#9ca3af",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 20,
    },
    modalButtonRow: {
        flexDirection: "row",
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#27272a",
        borderWidth: 1,
        borderColor: "#3f3f46",
        alignItems: "center",
    },
    modalConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "rgba(127, 29, 29, 0.8)",
        borderWidth: 1,
        borderColor: "rgba(220, 38, 38, 0.6)",
        alignItems: "center",
    },
    modalButtonText: {
        color: "#ffffff",
        fontWeight: "600",
        fontSize: 15,
    },
});
