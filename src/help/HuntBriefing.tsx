// ============================================================
// src/help/HuntBriefing.tsx - One-time "before you hunt" screen
// ============================================================
// Shown before the first hunt (and again if BRIEFING_VERSION is raised). The user reads the key
// limits and taps "I understand". The full guide is one tap away.

import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/constants/icons";
import GuideSheet from "./GuideSheet";
import { BRIEFING_INTRO, BRIEFING_POINTS, BRIEFING_TITLE } from "./content";

export default function HuntBriefing({ onAccept }: { onAccept: () => void }) {
    const [showGuide, setShowGuide] = useState(false);

    return (
        <SafeAreaView className="flex-1 bg-brand-black">
            <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
                <View className="items-center">
                    <View className="bg-brand-green/10 p-5 rounded-full border-2 border-brand-green/30">
                        <Image source={icons.info} className="size-10" tintColor="#0b7f4f" resizeMode="contain" />
                    </View>
                </View>

                <View className="gap-1">
                    <Text className="text-white text-2xl font-bold text-center">{BRIEFING_TITLE}</Text>
                    <Text className="text-gray-500 text-sm text-center">{BRIEFING_INTRO}</Text>
                </View>

                <View className="gap-3">
                    {BRIEFING_POINTS.map((point, i) => (
                        <View key={i} className="flex-row bg-brand-greenDark/60 rounded-xl p-3 border border-brand-green/50">
                            <Image source={icons.check} className="size-4 mt-1 mr-3" tintColor="#0b7f4f" resizeMode="contain" />
                            <Text className="flex-1 text-gray-300 text-base">{point}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity onPress={() => setShowGuide(true)} className="py-2" activeOpacity={0.7}>
                    <Text className="text-brand-greenLight text-center text-sm font-semibold">Read the full guide: how it works & limits</Text>
                </TouchableOpacity>
            </ScrollView>

            <View className="px-6 pb-4">
                <TouchableOpacity onPress={onAccept} className="bg-brand-green border border-brand-greenLight/50 rounded-xl py-4 px-6" activeOpacity={0.7}>
                    <Text className="text-white text-center font-bold text-base">I understand</Text>
                </TouchableOpacity>
            </View>

            <GuideSheet visible={showGuide} onClose={() => setShowGuide(false)} />
        </SafeAreaView>
    );
}
