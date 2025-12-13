// CalibrationOverlay.tsx
import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Step1Orientation } from "./Step1Orientation";
import { Step2Level } from "./Step2Level";
import { BottomCTA } from "./BottomCTA";
import { MountOrientation } from "@/app/calibration/types";
import icons from "@/app/constants/icons";

export type CalibStep = "start" | "step1" | "step2";

export function CalibrationOverlay({
                                       step,
                                       mountOrientation,
                                       pendingOrientation,
                                       levelDeg,
                                       isLevel,
                                       onSelectPendingOrientation,
                                       applyPendingAndContinue,
                                       goStep1,
                                       finish,
                                       cancel,
                                   }: {
    step: CalibStep;

    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;

    levelDeg: number;
    isLevel: boolean;

    onSelectPendingOrientation: (o: MountOrientation) => void;
    applyPendingAndContinue: () => void;

    goStep1: () => void;
    finish: () => void;
    cancel: () => void;
}) {
    if (step === "start") {
        return (
            <View className="flex-1">
                <View className="rounded-3xl bg-brand-greenDark/70 border border-brand-green/60 p-5">
                    <View className="flex-row items-center">
                        <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                            <Image source={icons.target} className="w-7 h-7" resizeMode="contain" tintColor="#0b7f4f" />
                        </View>

                        <View className="flex-1">
                            <Text className="text-white text-2xl font-semibold">Calibration</Text>
                            <Text className="text-white/80 mt-1 text-base">
                                We’ll set your mount orientation and confirm level.
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 rounded-2xl bg-brand-black/35 border border-brand-green/25 px-4 py-3">
                        <Text className="text-white/80 text-sm">
                            This takes about 20 seconds and improves AR alignment.
                        </Text>
                    </View>
                </View>

                <BottomCTA compact={false}>
                    <Pressable
                        onPress={goStep1}
                        className="bg-brand-greenLight py-5 rounded-2xl items-center border border-brand-green/60"
                    >
                        <Text className="text-white text-xl font-semibold">Start Calibration</Text>
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

    return null;
}
