// ============================================================
// src/calibration/savedCalibration.ts - Calibrations kept on the device, one per rifle
// ============================================================
// A finished calibration is saved per rifle so a returning hunter only re-checks the
// crosshair. It describes this phone on that rifle's scope, so it stays on the device
// (not in the cloud). It is ignored once the rifle's scope details change.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CalibrationResult, ScopeSetup } from "./types";

// Bump the version when CalibrationResult changes shape; older saves are then ignored.
const keyFor = (gunId: string) => `aimsense.calibration.v3.${gunId}`;

export async function saveCalibration(result: CalibrationResult): Promise<void> {
    try {
        await AsyncStorage.setItem(keyFor(result.gunId), JSON.stringify(result));
    } catch (error) {
        console.warn("Could not save calibration:", error);
    }
}

/**
 * The saved calibration for a rifle, or null if there is none, it is unusable, or it was
 * made with different scope details than the rifle has now.
 */
export async function loadCalibration(gunId: string, scope: ScopeSetup): Promise<CalibrationResult | null> {
    try {
        const raw = await AsyncStorage.getItem(keyFor(gunId));
        if (!raw) return null;
        const result = JSON.parse(raw) as CalibrationResult;
        const usable =
            result.pxPerUnit > 0 &&
            !!result.upAxis &&
            !!result.scopeCenterPx &&
            !!result.cameraLayout &&
            !!result.cameraViewSize;
        const sameScope =
            result.scopeUnit === scope.scopeUnit &&
            result.clickSize === scope.clickSize &&
            result.scopeMagnification === scope.scopeMagnification;
        return usable && sameScope ? result : null;
    } catch (error) {
        console.warn("Could not load calibration:", error);
        return null;
    }
}

/** Forget a rifle's calibration (it no longer fits this screen, or the user wants a fresh start). */
export async function clearCalibration(gunId: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(keyFor(gunId));
    } catch (error) {
        console.warn("Could not clear calibration:", error);
    }
}
