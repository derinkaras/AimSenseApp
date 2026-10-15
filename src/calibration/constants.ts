// ============================================================
// src/calibration/constants.ts - Calibration constants
// ============================================================

import type { ScopeSetup, ScopeUnit, TiltLevelConfig } from "./types";

/** A turret click value the user can pick: the unit and the size of one click together. */
export interface ScopeClickOption {
    label: string;
    scopeUnit: ScopeUnit;
    clickSize: number;
}

// Most common first
export const SCOPE_CLICK_OPTIONS: ScopeClickOption[] = [
    { label: "¼ MOA", scopeUnit: "MOA", clickSize: 0.25 },
    { label: "0.1 MIL", scopeUnit: "MIL", clickSize: 0.1 },
    { label: "⅛ MOA", scopeUnit: "MOA", clickSize: 0.125 },
    { label: "½ MOA", scopeUnit: "MOA", clickSize: 0.5 },
    { label: "0.05 MIL", scopeUnit: "MIL", clickSize: 0.05 },
    { label: "0.2 MIL", scopeUnit: "MIL", clickSize: 0.2 },
];

// Target angular movement the user dials on the elevation turret during calibration.
// Bigger moves make a tap error a smaller share of the measurement (and most turrets
// have a numbered mark at these values, so the user can turn to the mark instead of counting).
export const TARGET_MOA_MOVEMENT = 10; // 10 MOA total movement for MOA scopes
export const TARGET_MIL_MOVEMENT = 3; // 3 MIL total movement for MIL scopes

// Below this many screen pixels the measured move is too small to trust:
// a 1 px tap error would already change every holdover by more than ~7%.
export const MIN_MEASURED_MOVE_PX = 15;

// The dialed move must point within this angle of straight up on screen. Further off,
// the wrong turret (or the wrong direction) was turned.
export const MAX_UP_AXIS_ANGLE_DEG = 30;

// Scope magnification the user can enter
export const MIN_SCOPE_MAGNIFICATION = 1;
export const MAX_SCOPE_MAGNIFICATION = 60;

/** True when every scope detail is present and in range. */
export function isScopeSetupComplete(scope: Partial<ScopeSetup>): scope is ScopeSetup {
    return (
        (scope.scopeUnit === "MOA" || scope.scopeUnit === "MIL") &&
        typeof scope.clickSize === "number" &&
        scope.clickSize > 0 &&
        typeof scope.scopeMagnification === "number" &&
        scope.scopeMagnification >= MIN_SCOPE_MAGNIFICATION &&
        scope.scopeMagnification <= MAX_SCOPE_MAGNIFICATION
    );
}

export const DEFAULT_TILT_CONFIG: TiltLevelConfig = {
    toleranceDeg: 3.0,
    holdMs: 500,
    zeroEnterDeg: 0.12,
    zeroExitDeg: 0.6,
    smoothingAlpha: 0.18,
    flatEnterGz: 0.85,
    flatExitGz: 0.75,
};
