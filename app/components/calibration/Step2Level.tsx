import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { CalibrationHeader } from "./CalibrationHeader";
import { BottomCTA } from "./BottomCTA";
import { MountOrientation } from "@/app/calibration/types";

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

    // Detect if we're in landscape mode
    const isLandscape = mountOrientation.includes("landscape");

    // Adjust styling based on orientation
    const angleFontSize = isLandscape ? "text-4xl" : "text-6xl";
    const containerPadding = isLandscape ? "p-3" : "p-6";
    const headerMargin = isLandscape ? "mt-3" : "mt-6";
    const scrollPadding = isLandscape ? 120 : 220;
    const angleMargin = isLandscape ? "mt-1" : "mt-2";

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
                <View className={`bg-black/50 rounded-2xl ${containerPadding} items-center`}>
                    <Text className={`text-white/80 ${isLandscape ? "text-base" : "text-lg"}`}>Angle</Text>

                    <Text className={`text-white ${angleFontSize} font-bold ${angleMargin}`}>
                        {safe}°
                    </Text>

                    <View
                        className={`${isLandscape ? "mt-2" : "mt-4"} px-4 py-2 rounded-full ${
                            isLevel ? "bg-brand-green" : "bg-black/40"
                        }`}
                    >
                        <Text className={`text-white font-semibold ${isLandscape ? "text-base" : "text-lg"}`}>
                            {isLevel ? "Level ✅" : "Keep adjusting…"}
                        </Text>
                    </View>

                    {isLevel && safe !== 0 && (
                        <Text className={`${isLandscape ? "mt-2" : "mt-4"} text-white/70 text-center text-sm`}>
                            A reading of ±1° can still be acceptable once stabilized.
                        </Text>
                    )}
                </View>
            </ScrollView>

            <BottomCTA compact={isLandscape}>
                <Pressable
                    onPress={onFinish}
                    disabled={!isLevel}
                    className={`${isLandscape ? "py-4" : "py-5"} rounded-2xl items-center ${
                        isLevel ? "bg-brand-green" : "bg-black/50"
                    }`}
                >
                    <Text className={`text-white font-semibold ${isLandscape ? "text-lg" : "text-2xl"}`}>
                        {isLevel ? "Finish Calibration" : "Hold steady to finish"}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={onBack}
                    className={`mt-3 ${isLandscape ? "py-3" : "py-4"} rounded-2xl items-center bg-black/40`}
                >
                    <Text className={`text-white/90 font-semibold ${isLandscape ? "text-sm" : "text-lg"}`}>
                        Back
                    </Text>
                </Pressable>

                <Pressable
                    onPress={onCancel}
                    className={`mt-3 ${isLandscape ? "py-3" : "py-4"} rounded-2xl items-center bg-black/40`}
                >
                    <Text className={`text-white/90 font-semibold ${isLandscape ? "text-sm" : "text-lg"}`}>
                        Cancel
                    </Text>
                </Pressable>
            </BottomCTA>
        </View>
    );
}