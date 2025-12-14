import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MountOrientation } from "@/app/calibration/types";
import icons from "@/app/constants/icons";

interface Step2LevelProps {
    mountOrientation: MountOrientation;
    levelDeg: number;
    isLevel: boolean;
    onFinish: () => void;
    onBack: () => void;
    onCancel: () => void;
}

export function Step2Level({ mountOrientation, levelDeg, isLevel, onFinish, onBack, onCancel }: Step2LevelProps) {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 8);
    const wasLevel = useRef(false);

    const safe = Number.isFinite(levelDeg) ? levelDeg : 0;
    const isLandscape = mountOrientation.includes("landscape");

    // Haptic feedback when level is achieved - stronger for mounted phone
    useEffect(() => {
        if (isLevel && !wasLevel.current) {
            // Triple heavy impact for noticeable feedback through mount
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        }
        wasLevel.current = isLevel;
    }, [isLevel]);

    // Adjust sizing for landscape
    const angleFontSize = isLandscape ? "text-5xl" : "text-6xl";
    const containerPadding = isLandscape ? "p-4" : "p-6";
    const headerPadding = isLandscape ? "p-3" : "p-5";
    const headerMargin = isLandscape ? "mt-3" : "mt-6";
    const scrollPadding = isLandscape ? 140 : 240;
    const titleSize = isLandscape ? "text-xl" : "text-2xl";
    const subtitleSize = isLandscape ? "text-sm" : "text-base";
    const subtitleMargin = isLandscape ? "mt-1" : "mt-2";

    return (
        <View className="flex-1">
            {/* Header */}
            <View className={`rounded-3xl ${headerPadding} bg-brand-greenDark/70 border border-brand-green/60`}>
                <View className="flex-row items-center">
                    <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                        <Image source={icons.compass} className="w-6 h-6" resizeMode="contain" tintColor="#0b7f4f" />
                    </View>
                    <View className="flex-1">
                        <Text className={`text-white ${titleSize} font-semibold`}>Step 2: Level</Text>
                        <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>
                            Adjust the phone until the indicator shows level.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Level Display */}
            <ScrollView
                className={headerMargin}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: scrollPadding }}
            >
                <View
                    className={[
                        "rounded-3xl border bg-brand-greenDark/65",
                        isLevel ? "border-brand-greenLight" : "border-brand-green/45",
                        containerPadding,
                    ].join(" ")}
                >
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-white/70 text-sm">Angle</Text>
                            <Text className={`text-white font-bold ${angleFontSize} mt-2`}>{safe}°</Text>
                        </View>

                        <View
                            className={[
                                "size-16 rounded-3xl items-center justify-center border",
                                isLevel ? "bg-brand-greenLight/15 border-brand-greenLight" : "bg-brand-black/40 border-brand-green/35",
                            ].join(" ")}
                        >
                            <Image
                                source={isLevel ? icons.level : icons.tilt}
                                className="w-8 h-8"
                                resizeMode="contain"
                                tintColor={isLevel ? "#0b7f4f" : "#9ca3af"}
                            />
                        </View>
                    </View>

                    <View
                        className={[
                            "mt-5 px-4 py-3 rounded-2xl border",
                            isLevel ? "bg-brand-greenLight/10 border-brand-greenLight/70" : "bg-brand-black/30 border-brand-green/30",
                        ].join(" ")}
                    >
                        <Text className={`text-white font-semibold ${isLandscape ? "text-base" : "text-lg"}`}>
                            {isLevel ? "Level — ready to finish" : "Keep adjusting…"}
                        </Text>
                        <Text className="text-white/70 mt-1 text-sm">
                            Hold steady for a moment to confirm.
                        </Text>
                    </View>

                    {isLevel && safe !== 0 && (
                        <View className="mt-4 flex-row items-start">
                            <View className="size-10 rounded-2xl bg-brand-black/40 border border-brand-green/35 items-center justify-center mr-3">
                                <Image source={icons.info} className="w-5 h-5" resizeMode="contain" tintColor="#9ca3af" />
                            </View>
                            <Text className="flex-1 text-white/65 text-sm">
                                A reading of ±1° can still be acceptable once stabilized.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* CTAs */}
            <View style={{ paddingBottom: bottomPadding }} className="mt-auto">
                <Pressable
                    onPress={onFinish}
                    disabled={!isLevel}
                    className={[
                        "rounded-2xl items-center border",
                        isLandscape ? "py-4" : "py-5",
                        isLevel
                            ? "bg-brand-greenLight border-brand-green/60"
                            : "bg-brand-black/50 border-brand-green/30",
                    ].join(" ")}
                >
                    <Text className={`text-white font-semibold ${isLandscape ? "text-lg" : "text-xl"}`}>
                        {isLevel ? "Finish Calibration" : "Hold steady to finish"}
                    </Text>
                </Pressable>

                <View className="flex-row mt-3 gap-3">
                    <Pressable
                        onPress={onBack}
                        className={[
                            "flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35",
                            isLandscape ? "py-3" : "py-4",
                        ].join(" ")}
                    >
                        <Text className={`text-white/90 font-semibold ${isLandscape ? "text-sm" : "text-base"}`}>
                            Back
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={onCancel}
                        className={[
                            "flex-1 rounded-2xl items-center border bg-brand-black/50 border-brand-green/35",
                            isLandscape ? "py-3" : "py-4",
                        ].join(" ")}
                    >
                        <Text className={`text-white/90 font-semibold ${isLandscape ? "text-sm" : "text-base"}`}>
                            Cancel
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}