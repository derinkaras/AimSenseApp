import React, { useCallback } from "react";
import {
    View,
    Text,
    Image,
    ImageSourcePropType,
    TouchableOpacity,
    Linking,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import icons from "@/constants/icons";

// TODO: Set to the real store URL. Left empty, the store button shows a "not open yet"
// message instead of opening a placeholder domain someone else could register.
const STORE_URL = "";
const SUPPORT_EMAIL = "support@aimsense.app";

const ACCENT = "#0b7f4f"; // brand-greenLight

const PRODUCTS: { icon: ImageSourcePropType; title: string; detail: string }[] = [
    { icon: icons.scope, title: "Scope adapter", detail: "Clamps onto your scope. Sizes for all scopes." },
    { icon: icons.phonePortrait, title: "Phone mount", detail: "Holds your phone steady on the adapter." },
];

const PERKS = ["Fits all scope sizes", "Universal mounting", "Fast shipping", "Quality guarantee"];

const Store = () => {
    const handleOpenStore = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!STORE_URL) {
            Toast.show({ type: "info", text1: "The store isn't open yet", text2: "Check back soon." });
            return;
        }

        try {
            const canOpen = await Linking.canOpenURL(STORE_URL);
            if (canOpen) {
                await Linking.openURL(STORE_URL);
            }
        } catch (error) {
            console.log("Error opening store URL:", error);
        }
    }, []);

    const handleEmailSupport = useCallback(() => {
        Haptics.selectionAsync();
        Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch((error) => console.log("Error opening mail:", error));
    }, []);

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1 mx-6" edges={["top"]}>
                {/* ===================== HEADER ===================== */}
                <View className="mt-4 mb-5 flex-row items-center">
                    <View className="size-11 rounded-2xl bg-brand-greenDark/80 border border-brand-green/60 items-center justify-center mr-3">
                        <Image source={icons.store} className="size-6" resizeMode="contain" tintColor={ACCENT} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-brand-greenLight text-[11px] font-bold tracking-[0.2em]">AIMSENSE</Text>
                        <Text className="text-white text-2xl font-bold">Store</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    {/* ===================== HERO ===================== */}
                    <View className="rounded-3xl border border-brand-green/60 overflow-hidden">
                        <LinearGradient
                            colors={["#284a37", "#0e2018", "#121212"]}
                            locations={[0, 0.55, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 22 }}
                        >
                            <View className="size-14 rounded-2xl bg-brand-black/50 border border-brand-greenLight/50 items-center justify-center mb-4">
                                <Image source={icons.crosshair} className="size-7" resizeMode="contain" tintColor={ACCENT} />
                            </View>
                            <Text className="text-white text-[26px] font-bold leading-8">Gear up your rifle</Text>
                            <Text className="text-white/65 text-sm leading-5 mt-2">
                                AimSense needs an adapter and phone mount to hold your phone on the scope. Get the
                                hardware that fits your setup.
                            </Text>

                            {/* Perks */}
                            <View className="flex-row flex-wrap gap-2 mt-4">
                                {PERKS.map((perk) => (
                                    <View
                                        key={perk}
                                        className="flex-row items-center rounded-full bg-brand-black/50 border border-brand-green/60 px-2.5 py-1"
                                    >
                                        <Image source={icons.check} className="size-3 mr-1.5" resizeMode="contain" tintColor={ACCENT} />
                                        <Text className="text-white/80 text-xs">{perk}</Text>
                                    </View>
                                ))}
                            </View>
                        </LinearGradient>
                    </View>

                    {/* ===================== WHAT YOU NEED ===================== */}
                    <Text className="text-white/50 text-[11px] font-bold tracking-[0.16em] mt-6 mb-3">WHAT YOU NEED</Text>
                    <View className="gap-3">
                        {PRODUCTS.map((product) => (
                            <TouchableOpacity
                                key={product.title}
                                onPress={handleOpenStore}
                                activeOpacity={0.8}
                                className="flex-row items-center rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4"
                            >
                                <View className="size-12 rounded-xl bg-brand-black/60 border border-brand-green/60 items-center justify-center mr-3">
                                    <Image source={product.icon} className="size-6" resizeMode="contain" tintColor="#ffffff" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white text-base font-semibold">{product.title}</Text>
                                    <Text className="text-white/55 text-xs leading-4 mt-0.5">{product.detail}</Text>
                                </View>
                                <Image source={icons.chevronRight} className="size-3.5 ml-2" resizeMode="contain" tintColor="rgba(255,255,255,0.4)" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ===================== CTA ===================== */}
                    <TouchableOpacity
                        onPress={handleOpenStore}
                        activeOpacity={0.85}
                        accessibilityRole="link"
                        accessibilityLabel="Visit Store, opens in your browser"
                        className="mt-6 h-14 rounded-2xl bg-brand-greenLight flex-row items-center justify-center"
                    >
                        <Text className="text-white text-base font-bold">Visit Store</Text>
                        <Image source={icons.arrowRight} className="size-4 ml-2" resizeMode="contain" tintColor="#ffffff" />
                    </TouchableOpacity>
                    <Text className="text-white/40 text-xs text-center mt-2">Opens in your browser</Text>

                    {/* ===================== SUPPORT ===================== */}
                    <TouchableOpacity
                        onPress={handleEmailSupport}
                        activeOpacity={0.8}
                        className="mt-6 flex-row items-center rounded-2xl bg-brand-black border border-brand-green/50 p-4"
                    >
                        <View className="size-10 rounded-full bg-brand-greenDark border border-brand-green/60 items-center justify-center mr-3">
                            <Image source={icons.mail} className="size-4" resizeMode="contain" tintColor={ACCENT} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white text-sm font-semibold">Not sure which adapter fits?</Text>
                            <Text className="text-brand-greenLight text-xs mt-0.5">{SUPPORT_EMAIL}</Text>
                        </View>
                        <Image source={icons.chevronRight} className="size-3.5 ml-2" resizeMode="contain" tintColor="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default Store;
