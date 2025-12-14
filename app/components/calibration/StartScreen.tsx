import React from "react";
import { View, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import icons from "@/app/constants/icons";
import {SlideToStart} from "@/app/components/calibration/ui/SlideToStart";

interface StartScreenProps {
    onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const bottomPadding = tabBarHeight + insets.bottom + 12;

    return (
        <View className="flex-1 w-full">
            {/* Main Message */}
            <View className="rounded-3xl bg-brand-greenDark/70 border border-brand-green/60 p-6">
                <View className="flex-row items-center">
                    <View className="size-14 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-4">
                        <Image source={icons.target} className="w-8 h-8" resizeMode="contain" tintColor="#0b7f4f" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-white text-3xl font-bold">Ready to Hunt?</Text>
                        <Text className="text-white/80 mt-1 text-base">
                            Quick setup to get you zeroed in
                        </Text>
                    </View>
                </View>

                {/* Calibration Steps */}
                <View className="mt-5 space-y-3">
                    <View className="flex-row items-center">
                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                            <Text className="text-brand-greenLight text-sm font-bold">1</Text>
                        </View>
                        <Text className="text-white/90 text-base flex-1">Phone orientation</Text>
                    </View>

                    <View className="flex-row items-center">
                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                            <Text className="text-brand-greenLight text-sm font-bold">2</Text>
                        </View>
                        <Text className="text-white/90 text-base flex-1">Level calibration</Text>
                    </View>

                    <View className="flex-row items-center">
                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                            <Text className="text-brand-greenLight text-sm font-bold">3</Text>
                        </View>
                        <Text className="text-white/90 text-base flex-1">Phone to scope reference</Text>
                    </View>

                    <View className="flex-row items-center">
                        <View className="size-8 rounded-full bg-brand-greenLight/20 border border-brand-green/40 items-center justify-center mr-3">
                            <Text className="text-brand-greenLight text-sm font-bold">4</Text>
                        </View>
                        <Text className="text-white/90 text-base flex-1">Confirm & begin</Text>
                    </View>
                </View>

                <View className="mt-4 rounded-2xl bg-brand-black/35 border border-brand-green/25 px-4 py-3">
                    <Text className="text-white/70 text-sm text-center">
                        Takes about 90 seconds • Improves AR accuracy
                    </Text>
                </View>
            </View>

            {/* CTA - Full width slider */}
            <View style={{ paddingBottom: bottomPadding, width: '100%' }} className="mt-auto">
                <SlideToStart onComplete={onStart} />
            </View>
        </View>
    );
}