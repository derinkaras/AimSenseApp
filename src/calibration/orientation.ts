// ============================================================
// src/calibration/orientation.ts - Mount orientation + screen lock
// ============================================================

import * as ScreenOrientation from "expo-screen-orientation";
import type { MountOrientation } from "./types";

export function isLandscape(orientation: MountOrientation): boolean {
    return orientation.includes("landscape");
}

/** Lock the screen to match how the phone is mounted on the scope. */
export async function lockOrientation(orientation: MountOrientation) {
    const lockMap: Record<MountOrientation, ScreenOrientation.OrientationLock> = {
        portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
        "landscape-left": ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
        "landscape-right": ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
        "portrait-upside-down": ScreenOrientation.OrientationLock.PORTRAIT_DOWN,
    };
    await ScreenOrientation.lockAsync(lockMap[orientation]);
}

export async function lockToPortrait() {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}
