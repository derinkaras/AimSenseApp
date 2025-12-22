import React, { useCallback } from "react";
import { View, Text, Image, Pressable } from "react-native";
import images from "@/app/constants/images";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function Index() {
    const router = useRouter();

    const handleGetStarted = useCallback(async () => {
        // Crisp, premium tap feedback
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
        router.push("/Authentication");
    }, [router]);

    return (
        <View className="flex-1 bg-brand-green">
            {/* Image */}
            <View className="flex-[2] mt-6 relative">
                <Image source={images.onboarding} className="w-full h-full" resizeMode="cover" />
                <View className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-brand-greenDark" />
            </View>

            <View className="flex-[2] bg-brand-greenDark" />

            {/* Floating stacked cards */}
            <View className="absolute inset-x-0 top-[52%] px-6">
                <View className="relative">
                    <View className="absolute inset-0 translate-y-12 scale-[0.92] rounded-[28px] bg-brand-black/70" />
                    <View className="absolute inset-0 translate-y-8 scale-[0.95] rounded-[28px] bg-brand-black/75" />
                    <View className="absolute inset-0 translate-y-4 scale-[0.98] rounded-[28px] bg-brand-black/80" />

                    {/* MAIN CARD */}
                    <View className="rounded-[28px] bg-brand-greenDark/95 border border-white/20 px-7 pt-7 pb-6 shadow-2xl">
                        {/* Title */}
                        <View className="items-center mb-3">
                            <Text className="text-white text-[36px] font-extrabold tracking-tight">
                                Aim<Text className="text-brand-greenLight">Sense</Text>
                            </Text>

                            {/* Precision underline */}
                            <View className="mt-2 h-[3px] w-14 rounded-full bg-brand-greenLight/80" />
                        </View>

                        {/* Subtitle */}
                        <Text className="text-white/60 text-[11px] tracking-widest text-center uppercase mb-5">
                            Trajectory Math Calculator
                        </Text>

                        {/* Value prop */}
                        <Text className="text-white/80 text-[15px] leading-6 text-center mb-7">
                            On-device trajectory computation built for precision, consistency, and real-world
                            setups.
                        </Text>

                        {/* CTA (more impressive) */}
                        <Pressable
                            onPress={handleGetStarted}
                            className="rounded-2xl overflow-hidden active:opacity-90"
                        >
                            {/* Outer gradient-ish shell */}
                            <View className="bg-brand-black border border-brand-greenLight/35 rounded-2xl p-[2px]">
                                {/* Inner surface */}
                                <View className="bg-brand-black rounded-2xl py-5 px-5">
                                    {/* Accent line */}
                                    <View className="self-center mb-2 h-[3px] w-16 rounded-full bg-brand-greenLight/90" />

                                    <Text className="text-white text-[20px] font-semibold text-center tracking-wide">
                                        Get Started
                                    </Text>

                                    <Text className="text-white/55 text-[11px] text-center mt-1 tracking-wider uppercase">
                                        Tap to begin
                                    </Text>
                                </View>
                            </View>
                        </Pressable>

                        {/* Footer */}
                        <Text className="text-white/45 text-[11px] text-center mt-4 tracking-wide">
                            OFFLINE • ON-DEVICE • ACCURACY-FIRST
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
