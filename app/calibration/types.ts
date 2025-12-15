export type MountOrientation =
    | "portrait"
    | "landscape-left"
    | "landscape-right"
    | "portrait-upside-down";

export type CalibrationResult = {
    mountOrientation: MountOrientation;
    levelZeroRollDeg?: number;
    // Add important calibration details later:

};


export const CALIBRATING_STEPS = ["start", "rifleProfile", "step1", "step2", "step3"] as const;

export type CalibStep = typeof CALIBRATING_STEPS[number];