import React, { useCallback } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Linking,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import icons from "@/app/constants/icons";

// TODO: Replace with your actual store URL
const STORE_URL = "https://your-store-url.com";

const Store = () => {
    const handleOpenStore = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            const canOpen = await Linking.canOpenURL(STORE_URL);
            if (canOpen) {
                await Linking.openURL(STORE_URL);
            }
        } catch (error) {
            console.log("Error opening store URL:", error);
        }
    }, []);

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1 mx-4">
                {/* Header */}
                <View className="mt-3 mb-6 flex-row items-center">
                    <View className="size-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center mr-3">
                        <Image
                            source={icons.store}
                            className="size-7"
                            resizeMode="contain"
                            tintColor="#22c55e"
                        />
                    </View>
                    <Text className="text-white text-2xl font-semibold">
                        Store
                    </Text>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                >
                    {/* Main Card */}
                    <View className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6">
                        {/* Icon */}
                        <View className="items-center mb-4">
                            <View className="size-20 rounded-3xl bg-brand-greenDark/50 border border-brand-green/40 items-center justify-center">
                                <Image
                                    source={icons.store}
                                    className="size-10"
                                    resizeMode="contain"
                                    tintColor="#22c55e"
                                />
                            </View>
                        </View>

                        {/* Title */}
                        <Text className="text-white text-2xl font-bold text-center mb-2">
                            AimSense Store
                        </Text>

                        {/* Description */}
                        <Text className="text-gray-400 text-base text-center mb-6 leading-6">
                            Get the hardware you need to make AimSense work with your setup. 
                            Browse phone adapters, scope mounts, and accessories.
                        </Text>

                        {/* Features List */}
                        <View className="mb-6 gap-3">
                            <View className="flex-row items-center">
                                <View className="size-8 rounded-full bg-brand-green/20 items-center justify-center mr-3">
                                    <Text className="text-brand-greenLight text-sm">✓</Text>
                                </View>
                                <Text className="text-gray-300 text-sm flex-1">
                                    Phone adapters for all scope sizes
                                </Text>
                            </View>

                            <View className="flex-row items-center">
                                <View className="size-8 rounded-full bg-brand-green/20 items-center justify-center mr-3">
                                    <Text className="text-brand-greenLight text-sm">✓</Text>
                                </View>
                                <Text className="text-gray-300 text-sm flex-1">
                                    Universal mounting solutions
                                </Text>
                            </View>

                            <View className="flex-row items-center">
                                <View className="size-8 rounded-full bg-brand-green/20 items-center justify-center mr-3">
                                    <Text className="text-brand-greenLight text-sm">✓</Text>
                                </View>
                                <Text className="text-gray-300 text-sm flex-1">
                                    Fast shipping & quality guarantee
                                </Text>
                            </View>
                        </View>

                        {/* CTA Button */}
                        <TouchableOpacity
                            onPress={handleOpenStore}
                            activeOpacity={0.8}
                            className="bg-brand-green rounded-2xl py-4 px-6 flex-row items-center justify-center"
                        >
                            <Text className="text-white text-lg font-semibold mr-2">
                                Visit Store
                            </Text>
                            <Image
                                source={icons.rightArrow}
                                className="size-5"
                                resizeMode="contain"
                                tintColor="#fff"
                            />
                        </TouchableOpacity>

                        {/* Subtitle */}
                        <Text className="text-gray-500 text-xs text-center mt-3">
                            Opens in your browser
                        </Text>
                    </View>

                    {/* Info Card */}
                    <View className="mt-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
                        <Text className="text-gray-400 text-sm text-center">
                            Need help choosing the right adapter?{"\n"}
                            Contact us at{" "}
                            <Text className="text-brand-greenLight">support@aimsense.com</Text>
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default Store;
