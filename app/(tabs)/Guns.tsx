import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { gunProfileApi } from "@/app/api/gunProfile";
import { useApi } from "@/app/hooks/useApi";
import AddCircle from "@/app/components/AddCircle";
import { useFocusEffect, useRouter } from "expo-router";
import icons from "@/app/constants/icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

type GunProfile = {
    id?: string;
    name: string;
    caliber: string;
    bulletWeightGrains: number;
    ballisticCoefficient: number;
    muzzleVelocityFps: number;
    zeroDistance: number;
    scopeHeight: number;
    unitSystem: "IMPERIAL" | "METRIC";
    gunPhotoUri?: string | null;
};

const STORAGE_KEYS = {
    DISMISS_RIFLE_TIP: "aimsense.dismissTip.rifles.v1",
};

const Guns = () => {
    const router = useRouter();
    const { data: gunProfiles, loading, error, refetch } = useApi<GunProfile[]>(
        gunProfileApi.getAllUserGunProfiles
    );

    const [showTip, setShowTip] = useState(false);

    const loadTipPreference = useCallback(async () => {
        try {
            const dismissed = await AsyncStorage.getItem(STORAGE_KEYS.DISMISS_RIFLE_TIP);
            setShowTip(dismissed !== "1");
        } catch {
            setShowTip(true);
        }
    }, []);


    useFocusEffect(
        useCallback(() => {
            refetch();
            loadTipPreference();
        }, [refetch, loadTipPreference])
    );

    useEffect(() => {
        loadTipPreference();
    }, [loadTipPreference]);

    const hasProfiles = gunProfiles && gunProfiles.length > 0;

    const handleAddPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(pages)/AddGunProfile");
    };

    const handleEdit = (item: GunProfile) => {
        if (!item.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: "/(pages)/AddGunProfile",
            params: { id: item.id },
        });
    };

    const dismissTip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowTip(false);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.DISMISS_RIFLE_TIP, "1");
        } catch {}
    };

    if (loading) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#22c55e" />
                <Text className="text-gray-400 mt-3">Loading your rifles...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <Text className="text-red-500 mb-3">{error}</Text>
                <TouchableOpacity
                    onPress={refetch}
                    className="px-4 py-2 rounded-xl bg-brand-green"
                >
                    <Text className="text-emerald-50 font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderGunCard = ({ item }: { item: GunProfile }) => {
        const isImperial = item.unitSystem === "IMPERIAL";

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl px-4 py-3 mb-3 flex-row"
                onPress={() => handleEdit(item)}
            >
                {item.gunPhotoUri ? (
                    <Image
                        source={{ uri: item.gunPhotoUri }}
                        className="w-14 h-14 rounded-2xl mr-3"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-14 h-14 rounded-2xl mr-3 bg-zinc-800 items-center justify-center">
                        <Image
                            source={icons.riflePfp}
                            className="w-8 h-8 opacity-80"
                            resizeMode="contain"
                            tintColor="#9ca3af"
                        />
                    </View>
                )}

                <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                        <Text
                            className="text-white font-semibold text-base flex-1 mr-2"
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>

                        <View className="px-2 py-0.5 rounded-full bg-emerald-900/70">
                            <Text className="text-[10px] text-emerald-100 font-medium">
                                {isImperial ? "Imperial" : "Metric"}
                            </Text>
                        </View>
                    </View>

                    <Text
                        className="text-gray-400 text-xs mb-2"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.caliber || "Caliber not set"}
                    </Text>

                    <View className="flex-row flex-wrap gap-x-2 gap-y-1 mb-1">
                        <View className="px-2 py-0.5 rounded-full bg-zinc-800/80">
                            <Text className="text-[10px] text-gray-200">
                                {item.bulletWeightGrains} gr
                            </Text>
                        </View>
                        <View className="px-2 py-0.5 rounded-full bg-zinc-800/80">
                            <Text className="text-[10px] text-gray-200">
                                BC {item.ballisticCoefficient.toFixed(2)}
                            </Text>
                        </View>
                        <View className="px-2 py-0.5 rounded-full bg-zinc-800/80">
                            <Text className="text-[10px] text-gray-200">
                                {item.muzzleVelocityFps} fps
                            </Text>
                        </View>
                        <View className="px-2 py-0.5 rounded-full bg-zinc-800/80">
                            <Text className="text-[10px] text-gray-200">
                                Zero {item.zeroDistance} {isImperial ? "yd" : "m"}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between mt-1">
                        <Text className="text-[10px] text-gray-500">
                            Scope height: {item.scopeHeight}
                            {isImperial ? " in" : " cm"}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1 mx-4">
                <View className="flex-1">
                    {/* Header */}
                    <View className="mt-3 mb-4 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="size-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center mr-3">
                                <Image
                                    source={icons.riflePfp}
                                    className="size-7"
                                    resizeMode="contain"
                                    tintColor="#22c55e"
                                />
                            </View>
                            <View>
                                <Text className="text-white text-2xl font-semibold">
                                    Rifle profiles
                                </Text>
                            </View>
                        </View>

                        <View className="px-3 py-2 rounded-full bg-zinc-900 border border-zinc-800">
                            <Text className="text-md text-gray-300">
                                {hasProfiles
                                    ? `${gunProfiles!.length} profile${
                                        gunProfiles!.length > 1 ? "s" : ""
                                    }`
                                    : "No profiles"}
                            </Text>
                        </View>
                    </View>

                    {/* Dismissible tip banner */}
                    {hasProfiles && showTip && (
                        <View className="mb-3 px-3 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 flex-row items-start">
                            <Text className="text-sm text-gray-300 flex-1 pr-3">
                                Tap any rifle card to edit its details. On the edit screen, you
                                can also delete the profile using the trash icon.
                            </Text>

                            <TouchableOpacity
                                onPress={dismissTip}
                                activeOpacity={0.85}
                                className="w-9 h-9 rounded-full bg-zinc-800 items-center justify-center"
                                hitSlop={10}
                            >
                                <Image
                                    source={icons.cancel}
                                    className="w-4 h-4"
                                    resizeMode="contain"
                                    tintColor="#9ca3af"
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Content */}
                    {hasProfiles ? (
                        <FlatList
                            data={gunProfiles}
                            keyExtractor={(item, index) =>
                                (item.id as string) || index.toString()
                            }
                            renderItem={renderGunCard}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 32 }}
                            ListFooterComponent={
                                <View className="mt-2 mb-4 items-center">
                                    <AddCircle onPress={handleAddPress} />
                                </View>
                            }
                        />
                    ) : (
                        <View className="flex-1 justify-center items-center">
                            <Text className="text-gray-500 text-lg">No gun profiles yet.</Text>
                            <Text className="text-gray-600 text-md mt-1 text-center ">
                                Tap the button below to add your first rifle profile.
                            </Text>
                            <View className="mt-6">
                                <AddCircle onPress={handleAddPress} />
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

export default Guns;
