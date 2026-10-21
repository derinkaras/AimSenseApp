// ============================================================
// src/legal/LegalDocumentView.tsx - Shows a Privacy Policy / Terms document in a modal
// ============================================================
// The text lives in ./content.ts; this only lays it out.

import React from "react";
import { Image, ImageSourcePropType, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import icons from "@/constants/icons";
import { LEGAL_EFFECTIVE_DATE, type LegalDocument } from "./content";

const ACCENT = "#0b7f4f"; // brand-greenLight

type Props = {
    document: LegalDocument;
    icon: ImageSourcePropType;
    onClose: () => void;
};

/** "Label: text" bullets show the label in bold */
function Bullet({ text }: { text: string }) {
    const match = text.match(/^([^:]{1,40}):\s(.+)$/);
    return (
        <View className="flex-row mt-2">
            <View className="size-1.5 rounded-full bg-brand-greenLight mt-[7px] mr-2.5" />
            <Text className="flex-1 text-white/65 text-sm leading-5">
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

export default function LegalDocumentView({ document, icon, onClose }: Props) {
    const { height } = useWindowDimensions();

    return (
        <View>
            {/* Header */}
            <View className="flex-row items-center">
                <View className="size-11 rounded-2xl bg-brand-greenDark/80 border border-brand-green/60 items-center justify-center mr-3">
                    <Image source={icon} className="size-5" resizeMode="contain" tintColor={ACCENT} />
                </View>
                <View className="flex-1">
                    <Text className="text-brand-greenLight text-[11px] font-bold tracking-[0.2em]">AIMSENSE</Text>
                    <Text className="text-white text-xl font-bold">{document.title}</Text>
                </View>
                <TouchableOpacity
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={10}
                    className="size-8 rounded-full bg-brand-greenDark border border-brand-green/60 items-center justify-center"
                >
                    <Image source={icons.cancel} className="size-3" resizeMode="contain" tintColor="#ffffff" />
                </TouchableOpacity>
            </View>
            <Text className="text-white/40 text-xs mt-3">Effective {LEGAL_EFFECTIVE_DATE}</Text>

            {/* Body */}
            <View className="mt-3">
                <ScrollView
                    style={{ maxHeight: height * 0.55 }}
                    // No scroll bar: it drew over the text. The bottom fade shows there is more to read.
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24, paddingRight: 4 }}
                >
                    <Text className="text-white/75 text-sm leading-5">{document.intro}</Text>

                    {document.sections.map((section) => (
                        <View key={section.title} className="mt-5">
                            <Text className="text-white text-base font-bold">{section.title}</Text>
                            {section.blocks.map((block, i) =>
                                typeof block === "string" ? (
                                    <Text key={i} className="text-white/65 text-sm leading-5 mt-2">
                                        {block}
                                    </Text>
                                ) : (
                                    <View key={i}>
                                        {block.map((item) => (
                                            <Bullet key={item} text={item} />
                                        ))}
                                    </View>
                                )
                            )}
                        </View>
                    ))}
                </ScrollView>
                {/* Fade the last line into the footer so it reads as scrollable */}
                <LinearGradient
                    colors={["rgba(18,18,18,0)", "#121212"]}
                    style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 32 }}
                    pointerEvents="none"
                />
            </View>

            {/* Footer */}
            <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.85}
                className="mt-3 rounded-2xl bg-brand-green border border-brand-greenLight/60 py-3.5 items-center"
            >
                <Text className="text-white text-base font-bold">Done</Text>
            </TouchableOpacity>
        </View>
    );
}
