// ============================================================
// app/(hunt)/select-gun.tsx - Gun Profile Selection
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    Modal,
    ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CommonActions, useNavigation } from "expo-router/react-navigation";

import { gunProfileApi } from "@/app/api/gunProfile";
import { useApi } from "@/app/hooks/useApi";
import {
    useHuntStore,
    selectSelectedGun,
    selectCalibrationResult,
    selectCanStartHunt,
} from "@/app/hunt/store";
import { useCalibrationStore, isLandscape } from "@/app/calibration/exports";
import { OfflineBanner } from "@/app/components/OfflineBanner";
import icons from "@/app/constants/icons";
import type { GunProfile } from "@/app/types/apiTypes";
import { useCameraContext } from "./_layout";
import * as ScreenOrientation from "expo-screen-orientation";
const SCREEN_ID = "select-gun";

export default function SelectGun() {
    const [permission] = useCameraPermissions();
    const cameraEnabled = !!permission?.granted;

    const { activeScreen, setActiveScreen } = useCameraContext();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    const [detailGun, setDetailGun] = useState<GunProfile | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Hunt store
    const selectedGun = useHuntStore(selectSelectedGun);
    const calibrationResult = useHuntStore(selectCalibrationResult);
    const canStartHunt = useHuntStore(selectCanStartHunt);
    const selectGunProfile = useHuntStore((s) => s.selectGunProfile);
    const startHunt = useHuntStore((s) => s.startHunt);
    const endHunt = useHuntStore((s) => s.endHunt);

    // Calibration store
    const resetCalibration = useCalibrationStore((s) => s.resetCalibration);

    const { data: gunProfiles, loading, error, refetch } = useApi<GunProfile[]>(
        gunProfileApi.getAllUserGunProfiles
    );

    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    useEffect(() => {
        if (gunProfiles) setHasLoadedOnce(true);
    }, [gunProfiles]);

    useFocusEffect(
        useCallback(() => {
            console.log(SCREEN_ID);
            setActiveScreen(SCREEN_ID);
            return () => {};
        }, [setActiveScreen])
    );

    const shouldRenderCamera = cameraEnabled && activeScreen === SCREEN_ID;

    const mountOrientation = calibrationResult?.mountOrientation ?? "portrait";
    const cameraZoom = calibrationResult?.cameraZoom ?? 0;
    const screenRotation = calibrationResult?.screenRotation ?? 0;
    const focusPoint = calibrationResult?.focusPoint;
    const focusLocked = focusPoint !== null;

    const isLandscapeMode = isLandscape(mountOrientation);
    const rotationTransform = { transform: [{ rotate: `${screenRotation}deg` }] };

    const bottomPadding = Math.max(insets.bottom, 8);

    const safeAreaEdges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
    if (isLandscapeMode) safeAreaEdges.push("left", "right");

    const handleSelectGun = (gun: GunProfile) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedGun?.id === gun.id) {
            setDetailGun(gun);
            setShowDetail(true);
        } else {
            selectGunProfile(gun);
        }
    };

    const handleViewDetails = (gun: GunProfile) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDetailGun(gun);
        setShowDetail(true);
    };

    const handleCloseDetail = () => {
        setShowDetail(false);
        setDetailGun(null);
    };

    const handleSelectFromDetail = () => {
        if (detailGun) {
            selectGunProfile(detailGun);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        handleCloseDetail();
    };

    const handleBeginHunt = () => {
        if (!canStartHunt) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        startHunt();
        router.push("/(hunt)/active");
    };

    const handleCancel = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        endHunt();
        await resetCalibration();

        // Explicitly unlock and lock to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "(tabs)" }],
            })
        );
    };

    const headerPadding = isLandscapeMode ? "p-3" : "p-4";
    const titleSize = isLandscapeMode ? "text-lg" : "text-xl";
    const subtitleSize = isLandscapeMode ? "text-xs" : "text-sm";
    const cardPadding = isLandscapeMode ? "px-3 py-2" : "px-4 py-3";
    const buttonSize = isLandscapeMode ? "size-11" : "size-14";
    const iconSize = isLandscapeMode ? "w-5 h-5" : "w-6 h-6";

    if (loading && !hasLoadedOnce) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#22c55e" />
                <Text className="text-gray-400 mt-3">Loading your rifles...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center px-8">
                <Text className="text-red-400 text-center mb-4">{String(error)}</Text>
                <Pressable onPress={refetch} className="px-6 py-3 rounded-xl bg-brand-greenLight">
                    <Text className="text-white font-semibold">Retry</Text>
                </Pressable>
            </View>
        );
    }

    const hasProfiles = !!(gunProfiles && gunProfiles.length > 0);

    const renderGunCard = ({ item }: { item: GunProfile }) => {
        const isSelected = selectedGun?.id === item.id;
        const isImperial = item.unitSystem === "IMPERIAL";

        return (
            <Pressable
                onPress={() => handleSelectGun(item)}
                onLongPress={() => handleViewDetails(item)}
                delayLongPress={300}
                className={[
                    `rounded-2xl ${cardPadding} mb-3 flex-row items-center border`,
                    isSelected
                        ? "bg-brand-greenDark/80 border-brand-greenLight"
                        : "bg-zinc-900/90 border-zinc-800",
                ].join(" ")}
            >
                {item.gunPhotoUri ? (
                    <Image source={{ uri: item.gunPhotoUri }} className="w-12 h-12 rounded-xl mr-3" resizeMode="cover" />
                ) : (
                    <View className="w-12 h-12 rounded-xl mr-3 bg-zinc-800 items-center justify-center">
                        <Image source={icons.riflePfp} className="w-6 h-6 opacity-80" resizeMode="contain" style={{ tintColor: isSelected ? "#0b7f4f" : "#9ca3af" }} />
                    </View>
                )}
                <View className="flex-1">
                    <Text className={`font-semibold ${isLandscapeMode ? "text-sm" : "text-base"} text-white`} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text className={`text-gray-400 ${isLandscapeMode ? "text-[10px]" : "text-xs"}`} numberOfLines={1}>
                        {item.caliber || "Caliber not set"} • Zero {item.zeroDistance}{isImperial ? " yd" : " m"}
                    </Text>
                    {isSelected && <Text className="text-brand-green text-[10px] mt-0.5">Tap again to view details</Text>}
                </View>
                <Pressable onPress={() => handleViewDetails(item)} hitSlop={8} className="size-8 rounded-lg items-center justify-center bg-zinc-800/80 mr-2">
                    <Image source={icons.info} className="w-4 h-4" resizeMode="contain" tintColor="#9ca3af" />
                </Pressable>
                <View className={["size-6 rounded-full border items-center justify-center", isSelected ? "border-brand-greenLight bg-brand-greenLight/15" : "border-zinc-600 bg-transparent"].join(" ")}>
                    {isSelected && <Image source={icons.check} className="w-4 h-4" resizeMode="contain" tintColor="#0b7f4f" />}
                </View>
            </Pressable>
        );
    };

    const EmptyState = () => (
        <View className="flex-1 justify-center items-center px-8">
            <View className="size-20 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center mb-4">
                <Image source={icons.riflePfp} className="w-10 h-10" resizeMode="contain" tintColor="#9ca3af" />
            </View>
            <Text className="text-white text-lg font-semibold text-center mb-2">No Rifle Profiles</Text>
            <Text className="text-gray-500 text-center mb-6">You need at least one rifle profile to start hunting. Create one from the Rifles tab.</Text>
            <Pressable onPress={handleCancel} className="px-6 py-3 rounded-xl bg-brand-greenLight border border-brand-green/60">
                <Text className="text-white font-semibold">Go to Rifles</Text>
            </Pressable>
        </View>
    );

    const detailIsImperial = detailGun?.unitSystem === "IMPERIAL";
    const isCurrentlySelected = selectedGun?.id === detailGun?.id;

    const GunDetailModal = () => {
        if (!detailGun) return null;

        return (
            <Modal
                visible={showDetail}
                animationType="fade"
                transparent={true}
                onRequestClose={handleCloseDetail}
                supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCloseDetail}>
                    <Pressable style={[styles.modalCard, isLandscapeMode && styles.modalCardLandscape]} onPress={(e) => e.stopPropagation()}>
                        {/* Close button */}
                        <Pressable onPress={handleCloseDetail} style={styles.closeX}>
                            <Image source={icons.cancel} style={styles.closeXIcon} resizeMode="contain" />
                        </Pressable>

                        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.scrollContent}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                {detailGun.gunPhotoUri ? (
                                    <Image source={{ uri: detailGun.gunPhotoUri }} style={styles.gunPhoto} resizeMode="cover" />
                                ) : (
                                    <View style={styles.gunPhotoPlaceholder}>
                                        <Image source={icons.riflePfp} style={styles.gunPhotoIcon} resizeMode="contain" />
                                    </View>
                                )}
                                <View style={styles.headerText}>
                                    <Text style={styles.gunName} numberOfLines={1}>{detailGun.name}</Text>
                                    <Text style={styles.gunCaliber}>{detailGun.caliber || "Caliber not set"}</Text>
                                    {isCurrentlySelected && (
                                        <View style={styles.selectedBadge}>
                                            <View style={styles.selectedDot} />
                                            <Text style={styles.selectedText}>Selected</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Stats Grid - Compact */}
                            <View style={styles.statsContainer}>
                                <View style={styles.statRow}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>Velocity</Text>
                                        <Text style={styles.statValue}>{detailGun.muzzleVelocityFps}</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>BC</Text>
                                        <Text style={styles.statValue}>{Number(detailGun.ballisticCoefficient || 0).toFixed(3)}</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>Weight</Text>
                                        <Text style={styles.statValue}>{detailGun.bulletWeightGrains}gr</Text>
                                    </View>
                                </View>
                                <View style={styles.statRow}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>Zero</Text>
                                        <Text style={styles.statValue}>{detailGun.zeroDistance}{detailIsImperial ? "yd" : "m"}</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>Height</Text>
                                        <Text style={styles.statValue}>{detailGun.scopeHeight}{detailIsImperial ? "in" : "cm"}</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>Units</Text>
                                        <Text style={styles.statValue}>{detailIsImperial ? "IMP" : "MET"}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Action Button */}
                            {!isCurrentlySelected && (
                                <Pressable onPress={handleSelectFromDetail} style={styles.selectButton}>
                                    <Text style={styles.selectButtonText}>Select This Rifle</Text>
                                </Pressable>
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    return (
        <View className="flex-1 bg-brand-black">
            {shouldRenderCamera && (
                <View style={[StyleSheet.absoluteFill, rotationTransform]}>
                    <CameraView style={StyleSheet.absoluteFill} facing="back" zoom={cameraZoom} autofocus={focusLocked ? "off" : "on"} />
                </View>
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]} />

            <SafeAreaView className="flex-1" edges={safeAreaEdges}>
                <View className={`flex-1 ${isLandscapeMode ? "px-4" : "px-6"} pt-2`}>
                    <View className={`rounded-2xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60 mb-3`}>
                        <View className="flex-row items-center">
                            <View className="size-10 rounded-xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                                <Image source={icons.target} className="w-5 h-5" resizeMode="contain" tintColor="#0b7f4f" />
                            </View>
                            <View className="flex-1">
                                <Text className={`text-white ${titleSize} font-semibold`}>Select Rifle</Text>
                                <Text className={`text-white/70 ${subtitleSize} mt-0.5`}>Tap to select • Hold or tap ⓘ for details</Text>
                            </View>
                        </View>
                    </View>

                    <OfflineBanner />

                    {hasProfiles ? (
                        <FlatList
                            data={gunProfiles}
                            keyExtractor={(item, index) => String(item.id ?? `gun-${index}`)}
                            renderItem={renderGunCard}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 120 }}
                            refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#22c55e" />}
                        />
                    ) : (
                        <EmptyState />
                    )}

                    {hasProfiles && (
                        <View className="absolute bottom-0 left-0 right-0 px-6" style={{ paddingBottom: bottomPadding }}>
                            <View className="bg-brand-black/80 rounded-2xl p-3 border border-brand-green/20">
                                {selectedGun && (
                                    <Pressable onPress={() => handleViewDetails(selectedGun)} className="mb-3 px-3 py-2 rounded-xl bg-brand-greenDark/50 border border-brand-green/40 flex-row items-center">
                                        <View className="flex-1">
                                            <Text className="text-white/70 text-xs">Selected:</Text>
                                            <Text className="text-white font-semibold">{selectedGun.name}</Text>
                                        </View>
                                        <Image source={icons.info} className="w-5 h-5 opacity-60" resizeMode="contain" tintColor="#fff" />
                                    </Pressable>
                                )}
                                <View className="flex-row items-center justify-center gap-4">
                                    <Pressable onPress={handleCancel} className={`${buttonSize} rounded-xl items-center justify-center bg-brand-black/50 border border-brand-green/35`}>
                                        <Image source={icons.cancel} className={iconSize} resizeMode="contain" tintColor="#e5e5e5" />
                                    </Pressable>
                                    <Pressable
                                        onPress={handleBeginHunt}
                                        disabled={!canStartHunt}
                                        className={`flex-1 rounded-xl items-center justify-center border py-4 ${canStartHunt ? "bg-brand-greenLight border-brand-green/60" : "bg-brand-black/30 border-brand-green/30"}`}
                                    >
                                        <Text className={`font-semibold ${isLandscapeMode ? "text-base" : "text-lg"} ${canStartHunt ? "text-white" : "text-gray-600"}`}>Start Hunt</Text>
                                    </Pressable>
                                </View>
                                {!selectedGun && <Text className="text-white/50 text-center text-xs mt-2">Select a rifle to continue</Text>}
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>

            <GunDetailModal />
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalCard: {
        backgroundColor: "#18181b",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#3f3f46",
        width: "100%",
        maxWidth: 340,
        maxHeight: "80%",
    },
    modalCardLandscape: {
        maxWidth: 360,
        maxHeight: "85%",
    },
    closeX: {
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 10,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#27272a",
        alignItems: "center",
        justifyContent: "center",
    },
    closeXIcon: {
        width: 14,
        height: 14,
        tintColor: "#a1a1aa",
    },
    scrollContent: {
        padding: 16,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        paddingRight: 28,
    },
    gunPhoto: {
        width: 48,
        height: 48,
        borderRadius: 10,
        marginRight: 12,
    },
    gunPhotoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 10,
        marginRight: 12,
        backgroundColor: "#27272a",
        alignItems: "center",
        justifyContent: "center",
    },
    gunPhotoIcon: {
        width: 24,
        height: 24,
        tintColor: "#52525b",
    },
    headerText: {
        flex: 1,
    },
    gunName: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    gunCaliber: {
        color: "#71717a",
        fontSize: 12,
        marginTop: 1,
    },
    selectedBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    selectedDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#22c55e",
        marginRight: 5,
    },
    selectedText: {
        color: "#22c55e",
        fontSize: 10,
        fontWeight: "600",
    },
    statsContainer: {
        gap: 6,
    },
    statRow: {
        flexDirection: "row",
        gap: 6,
    },
    statBox: {
        flex: 1,
        backgroundColor: "#27272a",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: "center",
    },
    statLabel: {
        color: "#52525b",
        fontSize: 9,
        fontWeight: "600",
        textTransform: "uppercase",
        marginBottom: 2,
    },
    statValue: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
    selectButton: {
        backgroundColor: "#16a34a",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 12,
    },
    selectButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
    },
});