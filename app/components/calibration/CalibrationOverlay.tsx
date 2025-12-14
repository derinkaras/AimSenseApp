import React from "react";
import { MountOrientation } from "@/app/calibration/types";
import { StartScreen } from "./StartScreen";
import { Step1Orientation } from "./Step1Orientation";
import { Step2Level } from "./Step2Level";

export type CalibStep = "start" | "step1" | "step2";

interface CalibrationOverlayProps {
    step: CalibStep;
    startScreenKey: number;
    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;
    levelDeg: number;
    isLevel: boolean;
    onSelectPendingOrientation: (orientation: MountOrientation) => void;
    applyPendingAndContinue: () => void;
    goStep1: () => void;
    finish: () => void;
    cancel: () => void;
}

export function CalibrationOverlay(props: CalibrationOverlayProps) {
    switch (props.step) {
        case "start":
            return <StartScreen key={`start-${props.startScreenKey}`} remountKey={props.startScreenKey} onStart={props.goStep1} />;

        case "step1":
            return (
                <Step1Orientation
                    selectedOrientation={props.pendingOrientation}
                    onSelectOrientation={props.onSelectPendingOrientation}
                    onContinue={props.applyPendingAndContinue}
                    onCancel={props.cancel}
                />
            );

        case "step2":
            return (
                <Step2Level
                    mountOrientation={props.mountOrientation}
                    levelDeg={props.levelDeg}
                    isLevel={props.isLevel}
                    onFinish={props.finish}
                    onBack={props.goStep1}
                    onCancel={props.cancel}
                />
            );

        default:
            return null;
    }
}