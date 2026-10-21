// ============================================================
// src/legal/LegalSheet.tsx - Privacy Policy / Terms of Service sheet
// ============================================================
// Same sheet and layout as the "How it works & limits" guide (src/help/GuideSheet.tsx).
// The text lives in ./content.ts; this only lays it out.

import React from "react";
import { Text, View } from "react-native";
import HelpSheet from "@/help/HelpSheet";
import { MAX_FONT_SCALE } from "@/constants/fontScale";
import { LEGAL_EFFECTIVE_DATE, type LegalDocument } from "./content";

/** "Label: text" bullets show the label in bold */
function Bullet({ text }: { text: string }) {
    const match = text.match(/^([^:]{1,40}):\s(.+)$/);
    return (
        <View className="flex-row gap-2.5">
            <View className="w-1.5 h-1.5 rounded-full bg-brand-greenLight mt-[7px]" />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="flex-1 text-white/70 text-sm leading-5">
                {match ? (
                    <>
                        <Text className="text-white font-semibold">{match[1]}: </Text>
                        {match[2]}
                    </>
                ) : (
                    text
                )}
            </Text>
        </View>
    );
}

export default function LegalSheet({ document, visible, onClose }: { document: LegalDocument; visible: boolean; onClose: () => void }) {
    return (
        <HelpSheet visible={visible} onClose={onClose} eyebrow={`Effective ${LEGAL_EFFECTIVE_DATE}`} title={document.title} actionLabel="Close">
            <View className="gap-3">
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/65 text-[15px] leading-[22px] mb-1">
                    {document.intro}
                </Text>
                {document.sections.map((section) => (
                    <View key={section.title} className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4 gap-2.5">
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-base font-semibold">
                            {section.title}
                        </Text>
                        {section.blocks.map((block, i) =>
                            typeof block === "string" ? (
                                <Text key={i} maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/70 text-sm leading-5">
                                    {block}
                                </Text>
                            ) : (
                                block.map((item) => <Bullet key={item} text={item} />)
                            )
                        )}
                    </View>
                ))}
            </View>
        </HelpSheet>
    );
}
