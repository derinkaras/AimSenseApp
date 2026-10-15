// ============================================================
// src/calibration/math.ts - Pure calibration math
// ============================================================
// No React, no Expo: plain functions that are easy to read and test.

import { MAX_UP_AXIS_ANGLE_DEG, MIN_MEASURED_MOVE_PX, TARGET_MIL_MOVEMENT, TARGET_MOA_MOVEMENT } from "./constants";
import type { PixelPoint, ScopeUnit, UnitVector } from "./types";

/** Clamp a value between min and max */
export function clampValue(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/**
 * How many clicks the user must dial so the scope moves the target angle
 * (10 MOA or 3 MIL), based on the scope unit and click size.
 *
 * Examples:
 * - ¼ MOA (0.25): 10 / 0.25 = 40 clicks
 * - ½ MOA (0.5): 10 / 0.5 = 20 clicks
 * - ⅛ MOA (0.125): 10 / 0.125 = 80 clicks
 * - 0.1 MIL: 3 / 0.1 = 30 clicks
 * - 0.2 MIL: 3 / 0.2 = 15 clicks
 * - 0.05 MIL: 3 / 0.05 = 60 clicks
 */
export function getCalibrationClickCount(scopeUnit: ScopeUnit, clickSize: number): number {
    const targetMovement = scopeUnit === "MOA" ? TARGET_MOA_MOVEMENT : TARGET_MIL_MOVEMENT;
    return Math.round(targetMovement / clickSize);
}

/** Angular movement (in scope units) produced by a number of clicks. */
export function clicksToUnits(clicks: number, clickSize: number): number {
    return clicks * clickSize;
}

/**
 * Pixels the crosshair moves per scope unit (MOA or MIL).
 * This is the core calibration result: pixels moved / units dialed.
 */
export function calculatePxPerUnit(
    deltaPx: number,
    clicks: number,
    clickSize: number
): number {
    const units = clicksToUnits(clicks, clickSize);
    if (units === 0) return 0;
    return Math.abs(deltaPx) / units;
}

// ==================== ELEVATION MEASUREMENT ====================
// Modern scopes keep the crosshair centered in the eyepiece: turning a turret moves the
// IMAGE behind the crosshair, not the crosshair itself. So calibration follows a mark on
// the target: it starts under the crosshair (the scope center), the user dials the elevation
// turret UP, and taps where the mark went.

export type ElevationProblem =
    /** The mark barely moved: probably the crosshair was tapped, or the camera is not zoomed in enough */
    | "tooSmall"
    /** It moved sideways: the windage turret was turned */
    | "sideways"
    /** It moved down: the turret was turned the wrong way */
    | "down";

export type ElevationCheck =
    | { ok: true; pxPerUnit: number; upAxis: UnitVector; movedPx: number }
    | { ok: false; problem: ElevationProblem; movedPx: number };

/**
 * Check a dialed elevation move and turn it into the calibration scale.
 * `unitsDialed` is the angle dialed (clicks x click size, in MOA or MIL).
 */
export function evaluateElevationMove(center: PixelPoint, mark: PixelPoint, unitsDialed: number): ElevationCheck {
    const dx = mark.x - center.x;
    const dy = mark.y - center.y;
    const movedPx = Math.hypot(dx, dy);

    if (movedPx < MIN_MEASURED_MOVE_PX || !(unitsDialed > 0)) {
        return { ok: false, problem: "tooSmall", movedPx };
    }

    // Angle away from straight up on screen (screen y grows downward)
    const angleFromUpDeg = (Math.acos(-dy / movedPx) * 180) / Math.PI;
    if (angleFromUpDeg > MAX_UP_AXIS_ANGLE_DEG) {
        return { ok: false, problem: Math.abs(dx) > Math.abs(dy) ? "sideways" : "down", movedPx };
    }

    return {
        ok: true,
        pxPerUnit: movedPx / unitsDialed,
        upAxis: { x: dx / movedPx, y: dy / movedPx },
        movedPx,
    };
}

/**
 * Screen direction the image moves when the windage turret is dialed RIGHT: a quarter turn
 * clockwise from the UP direction (screen y grows downward, so (x, y) -> (-y, x)).
 */
export function rightAxisFromUp(up: UnitVector): UnitVector {
    return { x: -up.y, y: up.x };
}
