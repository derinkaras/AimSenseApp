// ============================================================
// src/help/GuideSheet.tsx - The full "How it works & limits" guide
// ============================================================
// Opened from hunt mode's "?", from Profile, and from the one-time hunt briefing.

import React from "react";
import { Text, View } from "react-native";
import HelpSheet from "./HelpSheet";
import { GUIDE_INTRO, GUIDE_SECTIONS, GUIDE_TITLE } from "./content";
import { MAX_FONT_SCALE } from "@/constants/fontScale";

export default function GuideSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    return (
        <HelpSheet visible={visible} onClose={onClose} eyebrow="AimSense guide" title={GUIDE_TITLE} actionLabel="Close">
            <View className="gap-3">
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/65 text-[15px] leading-[22px] mb-1">{GUIDE_INTRO}</Text>
                {GUIDE_SECTIONS.map((section) => (
                    <View key={section.title} className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4 gap-2.5">
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-base font-semibold">{section.title}</Text>
                        {section.body && <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/70 text-sm leading-5">{section.body}</Text>}
                        {section.bullets?.map((bullet, i) => (
                            <View key={i} className="flex-row gap-2.5">
                                <View className="w-1.5 h-1.5 rounded-full bg-brand-greenLight mt-[7px]" />
                                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="flex-1 text-white/70 text-sm leading-5">{bullet}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </HelpSheet>
    );
}
