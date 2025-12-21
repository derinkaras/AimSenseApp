// ============================================================
// app/(hunt)/active.tsx - Active Hunt Screen
// ============================================================
// Live hunting experience with:
// - Camera view with calibrated settings
// - EXACT SAME LAYOUT as step6/step7 for pixel-perfect calibration accuracy
// - Toggle crosshair to verify calibration alignment
// - Camera invariant validation (spec 14.2)
// - Zoom gesture prevention

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
    useWindowDimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useNavigation } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCalibrationStore, isLandscape, lockOrientation } from "@/app/calibration/exports";
import {
    useHuntStore,
    selectSelectedGun,
    selectCalibrationResult,
    selectIsHuntActive,
    selectCameraInvariants,
} from "@/app/hunt/store";
import icons from "@/app/constants/icons";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "active";

export default function ActiveHunt() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const router = useRouter();
    const { width, height } = useWindowDimensions();

    // UI State
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showCrosshair, setShowCrosshair] = useState(false);
    const crosshairOpacity = useRef(new Animated.Value(0)).current;

    // Camera validation state (spec 14.2)
    const [cameraLayout, setCameraLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [cameraValidated, setCameraValidated] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Pulsing animation for Live indicator
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(1)).current;

    // Hunt store
    const selectedGun = useHuntStore(selectSelectedGun);
    const calibrationResult = useHuntStore(selectCalibrationResult);
    const isHuntActive = useHuntStore(selectIsHuntActive);
    const cameraInvariants = useHuntStore(selectCameraInvariants);
    const validateCameraInvariants = useHuntStore((s) => s.validateCameraInvariants);
    const endHunt = useHuntStore((s) => s.endHunt);

    // Calibration store
    const resetCalibration = useCalibrationStore((s) => s.resetCalibration);

    // Lock orientation on focus (redundant safety)
    useFocusEffect(
        useCallback(() => {
            console.log(SCREEN_ID);
            setActiveScreen(SCREEN_ID);

            // Ensure orientation is still locked to calibrated orientation
            if (calibrationResult?.mountOrientation) {
                lockOrientation(calibrationResult.mountOrientation);
            }

            return () => {};
        }, [setActiveScreen, calibrationResult])
    );

    // Validate camera when layout changes (spec 14.2)
    useEffect(() => {
        if (cameraLayout.width > 0 && cameraLayout.height > 0 && calibrationResult) {
            const currentResolution = {
                width: cameraLayout.width,
                height: cameraLayout.height,
            };

            const result = validateCameraInvariants(
                calibrationResult.cameraZoom,
                calibrationResult.screenRotation,
                calibrationResult.mountOrientation,
                currentResolution
            );

            setCameraValidated(result.valid);
            setValidationErrors(result.errors);

            if (!result.valid) {
                console.warn("⚠️ Camera validation failed:", result.errors);
            }
        }
    }, [cameraLayout, calibrationResult, validateCameraInvariants]);

    // Handle camera layout for validation
    const handleCameraLayout = (e: any) => {
        setCameraLayout(e.nativeEvent.layout);
    };

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
                        toValue: 0,
                        duration: 600,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseOpacity, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(400),
            ])
        );
        pulseAnimation.start();
        return () => pulseAnimation.stop();
    }, []);

    // Crosshair visibility animation
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

    // ⚠️ CRITICAL: Use the EXACT stored cameraLayout from calibration - ZERO TOLERANCE
    // This ensures scopeCenterPx and all pixel coordinates map to the correct physical positions
    // DO NOT recalculate with getCameraLayoutConfig() - that could produce different values
    const layoutConfig = calibrationResult?.cameraLayout ?? {
        sidePanelWidth: 0,
        bottomPanelHeight: 240,
        bottomPanelTotalHeight: 240,
        bottomPadding: 0,
        cameraInsets: { padRight: 0, padBottom: 240 },
        magnifierSize: 100,
        isLandscapeMode: false,
    };

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
        await resetCalibration();

        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            })
        );
    };

    const handleCancelEndHunt = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEndConfirm(false);
    };

    // Pulsing Live Indicator Component
    const PulsingLiveIndicator = ({ large = false }: { large?: boolean }) => (
        <View className="flex-row items-center">
            <View className={`${large ? "size-5" : "size-4"} items-center justify-center mr-1.5`}>
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            width: large ? 18 : 14,
                            height: large ? 18 : 14,
                            borderRadius: large ? 9 : 7,
                            borderWidth: 2,
                            borderColor: "#22c55e",
                        },
                        {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseOpacity,
                        },
                    ]}
                />
                <View
                    style={{
                        width: large ? 10 : 8,
                        height: large ? 10 : 8,
                        borderRadius: large ? 5 : 4,
                        backgroundColor: "#22c55e",
                    }}
                />
            </View>
            <Text className={`text-green-500 font-semibold ${large ? "text-base" : "text-sm"}`}>Live</Text>
        </View>
    );

    // Modal renderer
    const renderEndHuntModal = () => (
        <Modal
            visible={showEndConfirm}
            animationType="fade"
            transparent={true}
            onRequestClose={handleCancelEndHunt}
            supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalIconContainer}>
                        <View style={styles.modalIconCircle}>
                            <Image source={icons.cancel} style={styles.modalIcon} resizeMode="contain" />
                        </View>
                    </View>
                    <Text style={styles.modalTitle}>End Hunt?</Text>
                    <Text style={styles.modalMessage}>
                        Are you sure you want to end this hunting session? You'll need to recalibrate to start a new hunt.
                    </Text>
                    <View style={styles.modalButtonRow}>
                        <Pressable onPress={handleCancelEndHunt} style={styles.modalCancelButton}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleConfirmEndHunt} style={styles.modalConfirmButton}>
                            <Text style={styles.modalConfirmText}>End Hunt</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // ============================================================
    // LANDSCAPE LAYOUT - EXACT SAME AS STEP6/STEP7
    // ============================================================
    if (isLandscapeMode) {
        return (
            <View className="flex-1 bg-brand-black">
                {/* Camera region (left) - EXACT same as step6/step7 */}
                {/* Wrapped in View that captures gestures to prevent zoom (spec 14.2) */}
                <View
                    onLayout={handleCameraLayout}
                    style={[
                        StyleSheet.absoluteFill,
                        { right: layoutConfig.cameraInsets.padRight }
                    ]}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                >
                    {shouldRenderCamera && (
                        <View style={StyleSheet.absoluteFill} pointerEvents="box-only">
                            <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                                <CameraView
                                    style={StyleSheet.absoluteFill}
                                    facing="back"
                                    zoom={cameraZoom}
                                    autofocus={focusLocked ? "off" : "on"}
                                />
                            </View>

                            {/* Scope Center Crosshair - same style as step6/step7 */}
                            {scopeCenterPx && (
                                <Animated.View
                                    style={[
                                        styles.crosshairWrapper,
                                        {
                                            left: scopeCenterPx.x - 50,
                                            top: scopeCenterPx.y - 50,
                                            opacity: crosshairOpacity,
                                        },
                                    ]}
                                    pointerEvents="none"
                                >
                                    <View style={styles.crosshairRing} />
                                    <View style={styles.crosshairContainer}>
                                        <View style={styles.crosshairTop} />
                                        <View style={styles.crosshairBottom} />
                                        <View style={styles.crosshairLeft} />
                                        <View style={styles.crosshairRight} />
                                        <View style={styles.crosshairCenter} />
                                    </View>
                                    <View style={styles.crosshairLabel}>
                                        <Text style={styles.crosshairLabelText}>ZERO</Text>
                                    </View>
                                </Animated.View>
                            )}
                        </View>
                    )}
                </View>

                {/* Right panel - EXACT same structure as step6/step7 */}
                <SafeAreaView
                    className="absolute top-0 bottom-0 right-0"
                    edges={["top", "bottom", "right"]}
                    style={{ width: layoutConfig.sidePanelWidth }}
                >
                    <View className="flex-1 bg-brand-black/95 border-l border-brand-green/30">
                        {/* Header - same px-3 pt-3 pb-2 as step6/step7 */}
                        <View className="px-3 pt-3 pb-2">
                            <View className="flex-row items-start">
                                <View className="size-8 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                                    <Image source={icons.scope} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold text-sm">Hunt Active</Text>
                                    <Text className="text-white/60 text-[11px]">Session in progress</Text>
                                </View>
                            </View>
                        </View>

                        {/* Content - same px-3 as step6/step7 */}
                        <View className="flex-1 px-3">
                            {/* Gun Profile Box */}
                            <View className="rounded-xl bg-brand-greenDark/40 border border-brand-green/30 p-3 mb-2">
                                <Text className="text-white/50 text-[10px] uppercase tracking-wider mb-1">Rifle</Text>
                                <Text className="text-white font-semibold text-sm" numberOfLines={2}>
                                    {selectedGun?.name ?? "Unknown"}
                                </Text>
                            </View>

                            {/* Live Status */}
                            <View className="rounded-xl bg-brand-greenDark/50 border border-brand-green/40 p-3 mb-2">
                                <PulsingLiveIndicator />
                            </View>

                            {/* Verify Zero Button */}
                            <Pressable
                                onPress={handleToggleCrosshair}
                                className={`rounded-xl p-3 border mb-2 ${
                                    showCrosshair
                                        ? "bg-brand-greenDark/80 border-brand-green"
                                        : "bg-brand-black/40 border-brand-green/30"
                                }`}
                            >
                                <View className="flex-row items-center">
                                    <Image
                                        source={icons.target}
                                        className="w-5 h-5 mr-2"
                                        resizeMode="contain"
                                        tintColor={showCrosshair ? "#22c55e" : "#9ca3af"}
                                    />
                                    <Text className={`text-sm font-semibold ${showCrosshair ? "text-white" : "text-white/70"}`}>
                                        {showCrosshair ? "Hide Crosshair" : "Verify Zero"}
                                    </Text>
                                </View>
                                <Text className="text-white/50 text-xs mt-1">
                                    {showCrosshair ? "Crosshair visible on screen" : "Tap to check calibration"}
                                </Text>
                            </Pressable>

                            {/* Spacer */}
                            <View className="flex-1" />

                            {/* End Hunt Button */}
                            <Pressable
                                onPress={handleEndHuntPress}
                                className="rounded-xl py-3 bg-red-950/70 border border-red-900/50 items-center mb-2"
                            >
                                <Text className="text-red-400 font-semibold text-base">End Hunt</Text>
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>

                {renderEndHuntModal()}
            </View>
        );
    }

    // ============================================================
    // PORTRAIT LAYOUT - EXACT SAME AS STEP6/STEP7
    // ============================================================
    // ⚠️ CRITICAL: Use layoutConfig.bottomPanelTotalHeight from stored calibration
    // DO NOT use hardcoded values or recalculate

    return (
        <View className="flex-1 bg-brand-black">
            {/* Camera region - EXACT same as step6/step7 portrait */}
            {/* Wrapped to capture gestures and prevent zoom (spec 14.2) */}
            <View
                onLayout={handleCameraLayout}
                style={[
                    StyleSheet.absoluteFill,
                    { bottom: layoutConfig.bottomPanelTotalHeight }
                ]}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
            >
                {shouldRenderCamera && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-only">
                        <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                facing="back"
                                zoom={cameraZoom}
                                autofocus={focusLocked ? "off" : "on"}
                            />
                        </View>

                        {/* Scope Center Crosshair - same style as step6/step7 */}
                        {scopeCenterPx && (
                            <Animated.View
                                style={[
                                    styles.crosshairWrapper,
                                    {
                                        left: scopeCenterPx.x - 50,
                                        top: scopeCenterPx.y - 50,
                                        opacity: crosshairOpacity,
                                    },
                                ]}
                                pointerEvents="none"
                            >
                                <View style={styles.crosshairRing} />
                                <View style={styles.crosshairContainer}>
                                    <View style={styles.crosshairTop} />
                                    <View style={styles.crosshairBottom} />
                                    <View style={styles.crosshairLeft} />
                                    <View style={styles.crosshairRight} />
                                    <View style={styles.crosshairCenter} />
                                </View>
                                <View style={styles.crosshairLabel}>
                                    <Text style={styles.crosshairLabelText}>ZERO</Text>
                                </View>
                            </Animated.View>
                        )}
                    </View>
                )}
            </View>

            <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={["bottom"]}>
                <View
                    style={{ paddingBottom: layoutConfig.bottomPadding }}
                    className="bg-brand-black/95 px-4"
                >
                    {/* Header Row - same structure as step6/step7 */}
                    <View className="flex-row items-center mb-3">
                        <View className="size-9 rounded-xl bg-brand-greenDark/70 border border-brand-green/40 items-center justify-center mr-2">
                            <Image source={icons.scope} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-semibold text-base">Hunt Active</Text>
                            <Text className="text-white/60 text-xs">Session in progress</Text>
                        </View>
                        {/* Live indicator */}
                        <View className="px-3 py-2 rounded-xl bg-brand-greenDark/50 border border-brand-green/40">
                            <PulsingLiveIndicator large />
                        </View>
                    </View>

                    {/* Gun Profile Box */}
                    <View className="rounded-xl bg-brand-greenDark/40 border border-brand-green/30 p-3 mb-3">
                        <Text className="text-white/50 text-xs uppercase tracking-wider mb-1">Rifle</Text>
                        <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                            {selectedGun?.name ?? "Unknown"}
                        </Text>
                    </View>

                    {/* Buttons Row */}
                    <View className="flex-row gap-3">
                        {/* Verify Zero Button */}
                        <Pressable
                            onPress={handleToggleCrosshair}
                            className={`flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center border ${
                                showCrosshair
                                    ? "bg-brand-greenDark/80 border-brand-green"
                                    : "bg-brand-black/40 border-brand-green/30"
                            }`}
                        >
                            <Image
                                source={icons.target}
                                className="w-5 h-5 mr-2"
                                resizeMode="contain"
                                tintColor={showCrosshair ? "#22c55e" : "#9ca3af"}
                            />
                            <Text className={`font-semibold text-base ${showCrosshair ? "text-white" : "text-white/70"}`}>
                                {showCrosshair ? "Hide" : "Verify Zero"}
                            </Text>
                        </Pressable>

                        {/* End Hunt Button */}
                        <Pressable
                            onPress={handleEndHuntPress}
                            className="rounded-xl py-3 px-6 bg-red-950/70 border border-red-900/50 items-center justify-center"
                        >
                            <Text className="text-red-400 font-semibold text-base">End</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>

            {renderEndHuntModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    // Crosshair wrapper (includes ring and label)
    crosshairWrapper: {
        position: "absolute",
        width: 100,
        height: 100,
        alignItems: "center",
        justifyContent: "center",
    },
    // Outer ring around crosshair
    crosshairRing: {
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        borderColor: "rgba(34, 197, 94, 0.5)",
    },
    // Crosshair container - EXACT same as step6/step7
    crosshairContainer: {
        position: "absolute",
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    // Open center design - 4 line segments with gap (EXACT SAME AS STEP6/STEP7)
    crosshairTop: {
        position: "absolute",
        width: 2,
        height: 32,
        top: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairBottom: {
        position: "absolute",
        width: 2,
        height: 32,
        bottom: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairLeft: {
        position: "absolute",
        width: 32,
        height: 2,
        left: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairRight: {
        position: "absolute",
        width: 32,
        height: 2,
        right: 0,
        backgroundColor: "#22c55e",
        borderRadius: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairCenter: {
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#22c55e",
        borderWidth: 1.5,
        borderColor: "rgba(0, 0, 0, 0.6)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
        elevation: 3,
    },
    // ZERO label below crosshair
    crosshairLabel: {
        position: "absolute",
        bottom: -2,
        backgroundColor: "rgba(34, 197, 94, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 3,
    },
    crosshairLabelText: {
        color: "white",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.5,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#1a1a1a",
        borderRadius: 24,
        padding: 24,
        width: "100%",
        maxWidth: 340,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    modalIconContainer: {
        marginBottom: 16,
    },
    modalIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.3)",
    },
    modalIcon: {
        width: 28,
        height: 28,
        tintColor: "#ef4444",
    },
    modalTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    modalMessage: {
        color: "rgba(255, 255, 255, 0.6)",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
    },
    modalButtonRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    modalCancelText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15,
    },
    modalConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.6)",
    },
    modalConfirmText: {
        color: "white",
        fontWeight: "600",
        fontSize: 15,
    },
});