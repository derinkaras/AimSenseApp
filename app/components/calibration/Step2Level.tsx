import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { CalibrationHeader } from "./CalibrationHeader";
import { BottomCTA } from "./BottomCTA";
import { MountOrientation } from "@/app/calibration/types";

export function Step2Level({
                               mountOrientation, // keep for future steps / saving
                               levelDeg,
                               isLevel,
                               onBack,
                               onFinish,
                               onCancel,
                           }: {
    mountOrientation: MountOrientation;
    levelDeg: number; // signed integer display (-2..-1..0..1..2)
    isLevel: boolean;
    onBack: () => void;
    onFinish: () => void;
    onCancel: () => void;
}) {
    const safe = Number.isFinite(levelDeg) ? levelDeg : 0;

    return (
        <View className="flex-1">
            <CalibrationHeader
                title="Step 2: Level"
                subtitle="Adjust the phone until the indicator shows level."
            />

            <ScrollView
                className="mt-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 220 }}
            >
                <View className="bg-black/50 rounded-2xl p-6 items-center">
                    <Text className="text-white/80 text-lg">Angle</Text>

                    <Text className="text-white text-6xl font-bold mt-2">
                        {safe}°
                    </Text>

                    <View
                        className={`mt-4 px-4 py-2 rounded-full ${
                            isLevel ? "bg-brand-green" : "bg-black/40"
                        }`}
                    >
                        <Text className="text-white text-lg font-semibold">
                            {isLevel ? "Level ✅" : "Keep adjusting…"}
                        </Text>
                    </View>

                    {isLevel && safe !== 0 && (
                        <Text className="mt-4 text-white/70 text-center text-sm">
                            A reading of ±1° can still be acceptable once stabilized.
                        </Text>
                    )}
                </View>
            </ScrollView>

            <BottomCTA>
                <Pressable
                    onPress={onFinish}
                    disabled={!isLevel}
                    className={`py-5 rounded-2xl items-center ${
                        isLevel ? "bg-brand-green" : "bg-black/50"
                    }`}
                >
                    <Text className="text-white text-2xl font-semibold">
                        {isLevel ? "Finish Calibration" : "Hold steady to finish"}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={onBack}
                    className="mt-3 py-4 rounded-2xl items-center bg-black/40"
                >
                    <Text className="text-white/90 text-lg font-semibold">Back</Text>
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
