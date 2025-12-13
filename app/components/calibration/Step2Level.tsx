// Step2Level.tsx
import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { CalibrationHeader } from "./CalibrationHeader";
import { BottomCTA } from "./BottomCTA";
import { MountOrientation } from "@/app/calibration/types";
import icons from "@/app/constants/icons";

export function Step2Level({
                               mountOrientation,
                               levelDeg,
                               isLevel,
                               onBack,
                               onFinish,
                               onCancel,
                           }: {
    mountOrientation: MountOrientation;
    levelDeg: number;
    isLevel: boolean;
    onBack: () => void;
    onFinish: () => void;
    onCancel: () => void;
}) {
    const safe = Number.isFinite(levelDeg) ? levelDeg : 0;
    const isLandscape = mountOrientation.includes("landscape");

    const angleFontSize = isLandscape ? "text-5xl" : "text-6xl";
    const containerPadding = isLandscape ? "p-4" : "p-6";
    const headerMargin = isLandscape ? "mt-3" : "mt-6";
    const scrollPadding = isLandscape ? 140 : 240;

    return (
        <View className="flex-1">
            <CalibrationHeader
                title="Step 2: Level"
                subtitle="Adjust the phone until the indicator shows level."
                compact={isLandscape}
            />

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

            <BottomCTA compact={isLandscape}>
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
            </BottomCTA>
        </View>
    );
}
