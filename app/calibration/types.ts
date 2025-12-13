export type MountOrientation =
    | "portrait"
    | "landscape-left"
    | "landscape-right"
    | "portrait-upside-down";

export type CalibrationResult = {
    mountOrientation: MountOrientation;
    // You can extend later:
    levelZeroRollDeg?: number;
    calibratedAtISO: string;
};
