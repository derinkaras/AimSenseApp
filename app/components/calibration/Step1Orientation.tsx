import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { CalibrationHeader } from "./CalibrationHeader";
import { BottomCTA } from "./BottomCTA";
import { MountOrientation } from "@/app/calibration/types";

const OPTIONS: { key: MountOrientation; label: string; sub: string }[] = [
    { key: "portrait", label: "Portrait", sub: "Normal upright" },
    { key: "portrait-upside-down", label: "Portrait (Upside Down)", sub: "Phone flipped" },
    { key: "landscape-left", label: "Landscape (Left)", sub: "Rotated left" },
    { key: "landscape-right", label: "Landscape (Right)", sub: "Rotated right" },
];

export function Step1Orientation({
                                     mountOrientation,
                                     onSelect,
                                     onContinue,
                                     onCancel,
                                 }: {
    mountOrientation: MountOrientation;
    onSelect: (o: MountOrientation) => void;
    onContinue: () => void;
    onCancel: () => void;
}) {
    // Step 1 is always in portrait mode, so compact is always false
    const isCompact = false;

    return (
        <View className="flex-1">
            <CalibrationHeader
                title="Step 1: Phone Orientation"
                subtitle="Choose how your phone is mounted. The screen will rotate after you press Continue."
                compact={isCompact}
            />

            <ScrollView
                className="mt-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 180 }}
            >
                {OPTIONS.map((o) => {
                    const selected = mountOrientation === o.key;

                    return (
                        <Pressable
                            key={o.key}
                            onPress={() => onSelect(o.key)}
                            className={`rounded-2xl p-5 ${selected ? "bg-brand-green" : "bg-black/50"}`}
                        >
                            <Text className="text-white text-xl font-semibold">{o.label}</Text>
                            <Text className="text-white/80 mt-1 text-base">{o.sub}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <BottomCTA compact={isCompact}>
                <Pressable
                    onPress={onContinue}
                    className="bg-brand-green py-5 rounded-2xl items-center"
                >
                    <Text className="text-white text-2xl font-semibold">Continue</Text>
                </Pressable>

                <Pressable
                    onPress={onCancel}
                    className="mt-3 py-4 rounded-2xl items-center bg-black/40"
                >
                    <Text className="text-white/90 text-lg font-semibold">Cancel</Text>
                </Pressable>
            </BottomCTA>
        </View>
    );
}