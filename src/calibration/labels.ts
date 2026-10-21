// ============================================================
// src/calibration/labels.ts - Display text for calibration values
// ============================================================

import { SCOPE_CLICK_OPTIONS, TARGET_MIL_MOVEMENT, TARGET_MOA_MOVEMENT } from "./constants";
import type { MountOrientation, ScopeUnit } from "./types";

export function getOrientationLabel(orientation: MountOrientation): string {
    const labels: Record<MountOrientation, string> = {
        portrait: "Portrait",
        "landscape-left": "Landscape Left",
        "landscape-right": "Landscape Right",
        "portrait-upside-down": "Portrait Upside Down",
    };
    return labels[orientation];
}

/** e.g. "¼ MOA" */
export function getClickSizeLabel(unit: ScopeUnit, clickSize: number): string {
    const option = SCOPE_CLICK_OPTIONS.find((o) => o.scopeUnit === unit && o.clickSize === clickSize);
    return option?.label ?? `${clickSize} ${unit}`;
}

/** The angular movement the user is asked to dial, e.g. "10 MOA" (or "20 MOA" with multiple 2). */
export function getTargetMovementLabel(scopeUnit: ScopeUnit, multiple = 1): string {
    return scopeUnit === "MOA" ? `${TARGET_MOA_MOVEMENT * multiple} MOA` : `${TARGET_MIL_MOVEMENT * multiple} MIL`;
}
