import React from "react";
import { View, Text, Pressable } from "react-native";
import { Step1Orientation } from "./Step1Orientation";
import { Step2Level } from "./Step2Level";
import { BottomCTA } from "./BottomCTA";
import { MountOrientation, CalibrationResult } from "@/app/calibration/types";

export type CalibStep = "start" | "step1" | "step2" | "dashboard";

export function CalibrationOverlay({
                                       step,
                                       mountOrientation,
                                       pendingOrientation,
                                       calibration,
                                       levelDeg,
                                       isLevel,
                                       onSelectPendingOrientation,
                                       applyPendingAndContinue,
                                       goStart,
                                       goStep1,
                                       goStep2,
                                       finish,
                                       cancel,
                                   }: {
    step: CalibStep;

    mountOrientation: MountOrientation;     // applied
    pendingOrientation: MountOrientation;   // selection in step1

    calibration: CalibrationResult | null;

    levelDeg: number;
    isLevel: boolean;

    onSelectPendingOrientation: (o: MountOrientation) => void;
    applyPendingAndContinue: () => void;

    goStart: () => void;
    goStep1: () => void;
    goStep2: () => void;
    finish: () => void;
    cancel: () => void;
}) {
    if (step === "start") {
        return (
            <View className="flex-1">
                <View className="bg-black/50 rounded-2xl p-5">
                    <Text className="text-white text-2xl font-semibold">Calibration</Text>
                    <Text className="text-white/80 mt-2 text-base">
                        We’ll set your mount orientation and confirm level.
                    </Text>
                </View>

                <BottomCTA>
                    <Pressable onPress={goStep1} className="bg-brand-green py-5 rounded-2xl items-center">
                        <Text className="text-white text-2xl font-semibold">Start Calibration</Text>
                    </Pressable>
                </BottomCTA>
            </View>
        );
    }

    if (step === "step1") {
        return (
            <Step1Orientation
                mountOrientation={pendingOrientation}
                onSelect={onSelectPendingOrientation}
                onContinue={applyPendingAndContinue}
                onCancel={cancel}
            />
        );
    }

    if (step === "step2") {
        return (
            <Step2Level
                mountOrientation={mountOrientation}
                levelDeg={levelDeg}
                isLevel={isLevel}
                onBack={goStep1}
                onFinish={finish}
                onCancel={cancel}
            />
        );
    }

    // dashboard
    return (
        <View className="flex-1">
            <View className="bg-black/40 rounded-2xl p-5">
                <Text className="text-white text-2xl font-semibold">Dashboard</Text>
                <Text className="text-white/80 mt-2 text-base">
                    {calibration ? `Calibrated (${calibration.mountOrientation})` : "Not calibrated"}
                </Text>
            </View>

            <BottomCTA>
                <Pressable onPress={goStart} className="bg-brand-green py-5 rounded-2xl items-center">
                    <Text className="text-white text-2xl font-semibold">Start Calibration</Text>
                </Pressable>
            </BottomCTA>
        </View>
    );
}
