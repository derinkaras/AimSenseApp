// ============================================================
// src/help/HelpTopicBody.tsx - Intro and points for one help topic
// ============================================================
// Full size in the help sheet (numbered points; the sheet shows the title), and compact inline
// in the shot-setup form (with its own title and simple bullets).

import React from "react";
import { Text, View } from "react-native";
import { MAX_FONT_SCALE } from "@/constants/fontScale";
import { HELP_TOPICS, type HelpTopicKey } from "./content";

interface HelpTopicBodyProps {
    topic: HelpTopicKey;
    compact?: boolean;
}

export default function HelpTopicBody({ topic, compact = false }: HelpTopicBodyProps) {
    const content = HELP_TOPICS[topic];

    if (compact) {
        return (
            <View className="gap-2">
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-[15px] font-semibold">{content.title}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/60 text-[13px] leading-[19px]">{content.intro}</Text>
                {content.points.map((point, i) => (
                    <View key={i} className="flex-row gap-2.5">
                        <View className="w-1.5 h-1.5 rounded-full bg-brand-greenLight mt-[7px]" />
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="flex-1 text-white/70 text-[13px] leading-[19px]">{point}</Text>
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View className="gap-4">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/65 text-[15px] leading-[22px]">{content.intro}</Text>
            {content.points.map((point, i) => (
                <View key={i} className="flex-row gap-3">
                    <View className="w-7 h-7 rounded-full bg-brand-greenLight/20 border border-brand-greenLight/50 items-center justify-center">
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-brand-greenLight text-xs font-bold">{i + 1}</Text>
                    </View>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="flex-1 text-white/80 text-[15px] leading-[22px]">{point}</Text>
                </View>
            ))}
        </View>
    );
}
