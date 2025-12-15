// ==================== ORIENTATION HELPERS ====================
import {MountOrientation} from "@/app/calibration/types";
import * as ScreenOrientation from "expo-screen-orientation";

export function getLockForOrientation(orientation: MountOrientation) {
    switch (orientation) {
        case "portrait":
            return ScreenOrientation.OrientationLock.PORTRAIT_UP;
        case "landscape-left":
            return ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
        case "landscape-right":
            return ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;
        default:
            return ScreenOrientation.OrientationLock.PORTRAIT_UP;
    }
}

export async function lockOrientation(orientation: MountOrientation) {
    try {
        const lock = getLockForOrientation(orientation);
        await ScreenOrientation.lockAsync(lock);
    } catch (err) {
        console.warn(`Failed to lock to ${orientation}:`, err);
    }
}

export async function lockToPortrait() {
    try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (err) {
        console.warn("Failed to lock to portrait:", err);
    }
}

// ==================== TAB BAR STYLE ====================
export const TAB_BAR_STYLE = {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: "#0e2018",
    borderTopWidth: 1,
    borderTopColor: "#284a37",
    paddingTop: 14,
    paddingBottom: 16,
};
