import React from "react";
import {CalibStep, MountOrientation} from "@/app/calibration/types";
import { StartScreen } from "./StartScreen";
import { Step1Orientation } from "./Step1Orientation";
import { Step2Level } from "./Step2Level";
import {View, Text} from "react-native";

interface CalibrationOverlayProps {
    step: CalibStep;
    startScreenKey: number;
    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;
    levelDeg: number;
    isLevel: boolean;
    onSelectPendingOrientation: (orientation: MountOrientation) => void;


    goStep1: () => void;
    goToStep2: () => void;
    backToStep1: () => void;

    goToStep3: () => void;
    backToStep2: () => void;


    finish: () => void;
    cancel: () => void;
}

export function CalibrationOverlay(props: CalibrationOverlayProps) {
    switch (props.step) {
        case "start":
            return <StartScreen key={`start-${props.startScreenKey}`} remountKey={props.startScreenKey} onStart={props.goStep1} />;
        case "rifleProfile":
            return null

        case "step1":
            return (
                <Step1Orientation
                    selectedOrientation={props.pendingOrientation}
                    onSelectOrientation={props.onSelectPendingOrientation}
                    onContinue={props.goToStep2}
                    onCancel={props.cancel}
                />
            );

        case "step2":
            return (
                <Step2Level
                    mountOrientation={props.mountOrientation}
                    levelDeg={props.levelDeg}
                    isLevel={props.isLevel}

                    onContinue={props.finish}
                    onBack={props.backToStep1}
                    onCancel={props.cancel}
                />
            );
        case "step3":
            return (
                <View className="flex-1">
                    <Text>Hello world</Text>
                </View>
            )

        default:
            return null;
    }
}