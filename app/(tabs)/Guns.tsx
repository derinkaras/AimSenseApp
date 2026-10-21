import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    FlatList,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { gunProfileApi } from "@/services/gunProfile";
import { useApi } from "@/hooks/useApi";
import { useGunProfilesDirty } from "@/contexts/GunProfilesDirtyContext";

import icons from "@/constants/icons";
import type { GunProfile } from "@/types/apiTypes";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DebugPanel } from "@/components/DebugPanel";


const STORAGE_KEYS = {
    DISMISS_RIFLE_TIP: "aimsense.dismissTip.rifles.v1",
};

const ACCENT = "#0b7f4f"; // brand-greenLight

const Guns = () => {
    const router = useRouter();
    const { consumeDirty } = useGunProfilesDirty();

    const { data: gunProfiles, loading, error, refetch } = useApi<GunProfile[]>(
        gunProfileApi.getAllUserGunProfiles
    );

    const [showTip, setShowTip] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const loadTipPreference = useCallback(async () => {
        try {
            const dismissed = await AsyncStorage.getItem(
                STORAGE_KEYS.DISMISS_RIFLE_TIP
            );
            setShowTip(dismissed !== "1");
        } catch {
            setShowTip(true);
        }
    }, []);

    // Mark first successful load
    useEffect(() => {
        if (gunProfiles) setHasLoadedOnce(true);
    }, [gunProfiles]);

    // Refetch ONLY when something changed elsewhere
    useFocusEffect(
        useCallback(() => {
            loadTipPreference();

            if (consumeDirty()) {
                refetch();
            }
        }, [consumeDirty, refetch, loadTipPreference])
    );

    // Initial tip load
    useEffect(() => {
        loadTipPreference();
    }, [loadTipPreference]);

    const hasProfiles = !!(gunProfiles && gunProfiles.length > 0);

    const handleAddPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(pages)/AddGunProfile");
    };

    const handleEdit = (item: GunProfile) => {
        if (!item.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: "/(pages)/AddGunProfile",
            params: { id: String(item.id) },
        });
    };

    const dismissTip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowTip(false);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DISMISS_RIFLE_TIP, "1");
        } catch {}
    };

    // Full-screen loader ONLY on first ever load
    if (loading && !hasLoadedOnce) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color={ACCENT} />
                <Text className="text-white/50 mt-3">Loading your rifles...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center px-8">
                <Text className="text-red-400 text-center mb-4">{String(error)}</Text>
                <TouchableOpacity
                    onPress={refetch}
                    className="px-6 py-3 rounded-2xl bg-brand-green border border-brand-greenLight/60"
                >
                    <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderGunCard = ({ item }: { item: GunProfile }) => {
        const isImperial = item.unitSystem === "IMPERIAL";
        const stats = [
            { label: "BULLET", value: `${item.bulletWeightGrains} gr` },
            { label: "BC", value: Number(item.ballisticCoefficient).toFixed(2) },
            { label: "VELOCITY", value: `${item.muzzleVelocityFps} fps` },
            { label: "ZERO", value: `${item.zeroDistance} ${isImperial ? "yd" : "m"}` },
        ];

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                className="w-full rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4 mb-3"
                onPress={() => handleEdit(item)}
            >
                {/* Photo, name, caliber */}
                <View className="flex-row items-center">
                    {item.gunPhotoUri ? (
                        <Image
                            source={{ uri: item.gunPhotoUri }}
                            className="w-14 h-14 rounded-xl mr-3 border border-brand-green/60"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-14 h-14 rounded-xl mr-3 bg-brand-black/60 border border-brand-green/60 items-center justify-center">
                            <Image source={icons.riflePfp} className="w-8 h-8" resizeMode="contain" style={{ tintColor: ACCENT }} />
                        </View>
                    )}

                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-white font-bold text-base flex-shrink mr-2" numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View className="px-2 py-0.5 rounded-full bg-brand-black/60 border border-brand-green/60">
                                <Text className="text-[10px] text-white/70 font-semibold">
                                    {isImperial ? "IMPERIAL" : "METRIC"}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-white/55 text-xs mt-1" numberOfLines={1}>
                            {item.caliber || "Caliber not set"}
                            {"  ·  "}Scope {item.scopeHeight}
                            {isImperial ? " in" : " cm"}
                        </Text>
                    </View>

                    <Image source={icons.chevronRight} className="size-3.5 ml-2" resizeMode="contain" tintColor="rgba(255,255,255,0.4)" />
                </View>

                {/* Ballistics at a glance */}
                <View className="flex-row mt-4 pt-3 border-t border-brand-green/40">
                    {stats.map((stat, i) => (
                        <View key={stat.label} className={`flex-1 ${i > 0 ? "border-l border-brand-green/40 pl-2.5" : ""}`}>
                            <Text className="text-white/40 text-[9px] font-bold tracking-[0.12em]">{stat.label}</Text>
                            <Text className="text-white text-[13px] font-semibold mt-0.5" numberOfLines={1}>
                                {stat.value}
                            </Text>
                        </View>
                    ))}
                </View>
            </TouchableOpacity>
        );
    };

    const count = gunProfiles?.length ?? 0;

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1 mx-6" edges={["top"]}>
                {/* ===================== HEADER ===================== */}
                <View className="mt-4 mb-5 flex-row items-center">
                    <View className="size-11 rounded-2xl bg-brand-greenDark/80 border border-brand-green/60 items-center justify-center mr-3">
                        <Image source={icons.riflePfp} className="size-6" resizeMode="contain" tintColor={ACCENT} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-brand-greenLight text-[11px] font-bold tracking-[0.2em]">AIMSENSE</Text>
                        <Text className="text-white text-2xl font-bold">Rifle profiles</Text>
                    </View>
                    {hasProfiles && (
                        <TouchableOpacity
                            onPress={handleAddPress}
                            activeOpacity={0.85}
                            accessibilityLabel="Add rifle"
                            className="flex-row items-center rounded-full bg-brand-green border border-brand-greenLight/60 pl-3 pr-4 py-2"
                        >
                            <Image source={icons.plus} className="size-3.5 mr-1.5" resizeMode="contain" tintColor="#ffffff" />
                            <Text className="text-white text-sm font-semibold">Add</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <OfflineBanner />

                {/* ===================== TIP ===================== */}
                {hasProfiles && showTip && (
                    <View className="mb-4 p-3.5 rounded-2xl bg-brand-black border border-brand-green/50 flex-row items-center">
                        <View className="size-8 rounded-full bg-brand-greenDark border border-brand-green/60 items-center justify-center mr-3">
                            <Image source={icons.info} className="size-3.5" resizeMode="contain" tintColor={ACCENT} />
                        </View>
                        <Text className="text-white/70 text-xs leading-4 flex-1 pr-2">
                            Tap a rifle to edit its details. You can also delete it from the edit screen.
                        </Text>
                        <TouchableOpacity
                            onPress={dismissTip}
                            hitSlop={8}
                            className="size-7 rounded-full bg-brand-greenDark/60 items-center justify-center"
                        >
                            <Image source={icons.cancel} className="size-3" resizeMode="contain" tintColor="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ===================== LIST ===================== */}
                {hasProfiles ? (
                    <FlatList
                        data={gunProfiles ?? []}
                        keyExtractor={(item, index) => String(item.id ?? `gun-${index}`)}
                        renderItem={renderGunCard}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        ListHeaderComponent={
                            <Text className="text-white/50 text-[11px] font-bold tracking-[0.16em] mb-3">
                                {`YOUR RIFLES · ${count}`}
                            </Text>
                        }
                        ListFooterComponent={
                            <TouchableOpacity
                                onPress={handleAddPress}
                                activeOpacity={0.8}
                                className="mt-1 rounded-2xl border border-dashed border-brand-greenLight/50 py-4 flex-row items-center justify-center"
                            >
                                <Image source={icons.plus} className="size-3.5 mr-2" resizeMode="contain" tintColor={ACCENT} />
                                <Text className="text-brand-greenLight text-sm font-semibold">Add another rifle</Text>
                            </TouchableOpacity>
                        }
                    />
                ) : (
                    /* ===================== EMPTY STATE ===================== */
                    <View className="flex-1 justify-center pb-28">
                        <View className="rounded-3xl bg-brand-greenDark/60 border border-brand-green/50 p-6 items-center">
                            <View className="size-16 rounded-2xl bg-brand-black/60 border border-brand-greenLight/50 items-center justify-center mb-4">
                                <Image source={icons.riflePfp} className="size-9" resizeMode="contain" tintColor={ACCENT} />
                            </View>
                            <Text className="text-white text-xl font-bold">No rifles yet</Text>
                            <Text className="text-white/55 text-sm text-center leading-5 mt-2">
                                Add your rifle&apos;s ballistics once and AimSense uses them for every holdover.
                            </Text>
                            <TouchableOpacity
                                onPress={handleAddPress}
                                activeOpacity={0.85}
                                className="mt-5 self-stretch rounded-2xl bg-brand-green border border-brand-greenLight/60 py-3.5 flex-row items-center justify-center"
                            >
                                <Image source={icons.plus} className="size-4 mr-2" resizeMode="contain" tintColor="#ffffff" />
                                <Text className="text-white text-base font-bold">Add your first rifle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/*<DebugPanel />*/}
            </SafeAreaView>
        </View>
    );
};

export default Guns;
