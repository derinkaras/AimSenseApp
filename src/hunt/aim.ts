// ============================================================
// src/hunt/aim.ts - Where to aim: drop, cant and holdover position
// ============================================================
// Pure math (no React, no Expo). The hunt screen calls these in two stages:
//
//   1. computeDropSolution  - how much holdover the target needs (heavy, rare)
//   2. computeAimSolution   - where that holdover lands on screen,
//                             corrected for rifle cant (light, at IMU rate)

import { rightAxisFromUp } from "../calibration/math";
import type { PixelPoint, ScopeUnit, UnitVector } from "../calibration/types";
import { getAtmosphere, type AtmosphereInput } from "./atmosphere";
import { computeBallistics } from "./ballistics";
import { toInches, toYards } from "./units";
import { getWindVector, type WindInput } from "./wind";

/** What the user's rangefinder reports. */
export type RangefinderMode = "LOS" | "COMPENSATED";

export type CantWarning = "ok" | "warn" | "bad";

// ==================== IMU AXIS MAPPING ====================
/**
 * CANONICAL DEFINITIONS (after useTiltLevel remapGravityToPortrait):
 * - imuRoll  = phone long-axis rotation
 * - imuPitch = phone forward/back tilt
 *
 * For scope-mounted phone (screen toward shooter), we interpret:
 * - elevationNow = imuRoll
 * - cantNow      = imuPitch
 *
 * Baselines captured at Step 4:
 * - roll0  = imuRoll at level
 * - pitch0 = imuPitch at level
 *
 * True rifle angles (degrees):
 * - riflePitchDeg = elevationNow - roll0      // UP/DOWN, lock this at confirm
 * - rifleCantDeg  = cantNow - pitch0          // LEFT/RIGHT roll, keep live
 */
export function mapIMUToRifleAxes(
    imuRoll: number,
    imuPitch: number
): { cantNow: number; elevationNow: number } {
    return {
        cantNow: imuPitch,
        elevationNow: imuRoll,
    };
}

/** Rifle up/down angle (degrees), measured against the level baseline from calibration. */
export function riflePitchDeg(elevationNow: number, roll0: number): number {
    return elevationNow - roll0;
}

/** Rifle left/right roll (degrees), measured against the level baseline from calibration. */
export function rifleCantDeg(cantNow: number, pitch0: number): number {
    return cantNow - pitch0;
}

// ==================== CANT HANDLING ====================

// Soft dead zone threshold for cant (degrees)
export const CANT_DEAD_ZONE_DEG = 0.5;

// Cant warnings (degrees of unfiltered cant)
export const CANT_WARN_DEG = 5;
export const CANT_BAD_DEG = 10;

// Smoothing for the cant used to rotate the holdover (exponential moving average)
const CANT_FILTER_KEEP = 0.85; // weight of the previous filtered value
const CANT_FILTER_NEW = 0.15; // weight of the new raw reading

/** Smooth a new raw cant reading into the running filtered value. */
export function filterCant(previousFiltered: number, rawCant: number): number {
    return previousFiltered * CANT_FILTER_KEEP + rawCant * CANT_FILTER_NEW;
}

// ==================== STAGE 1: DROP ====================

export interface DropSolutionInput {
    /** Distance to target in the gun's unit (yd if imperial, m if metric) */
    targetDistance: number;
    isImperial: boolean;
    /** Zero distance in the gun's unit */
    zeroDistance: number;
    /** Scope height above bore in the gun's unit (in or cm) */
    scopeHeight: number;
    muzzleVelocityFps: number;
    ballisticCoefficient: number;
    rangefinderMode: RangefinderMode | null;
    /** Rifle pitch locked when the target was confirmed (degrees), null if not locked */
    pitchLockedDeg: number | null;
    scopeUnit: ScopeUnit;
    /** Optional wind. Leave out for calm air. */
    wind?: WindInput | null;
    /** Optional air conditions. Leave out (or leave fields out) for standard air. */
    atmosphere?: AtmosphereInput | null;
}

export interface DropSolution {
    /** Elevation correction in the scope's unit (MOA or MIL) */
    D: number;
    /**
     * Windage correction in the scope's unit: how far the windage turret would be dialed to
     * cancel the wind drift. Positive = dial RIGHT (the bullet is drifting left). 0 without wind.
     */
    W: number;
    dropMOA: number;
    dropMIL: number;
    dropInches: number;
    /** Sideways wind drift at the target. Positive = the bullet is pushed to the right. */
    driftMOA: number;
    driftMIL: number;
    driftInches: number;
}

/** How much holdover the target needs. Runs the full G1 simulation, so call it sparingly. */
export function computeDropSolution(input: DropSolutionInput): DropSolution {
    const {
        targetDistance,
        isImperial,
        zeroDistance,
        scopeHeight,
        muzzleVelocityFps,
        ballisticCoefficient,
        rangefinderMode,
        pitchLockedDeg,
        scopeUnit,
        wind,
        atmosphere,
    } = input;

    // Convert distance to yards
    const rangeYards = toYards(targetDistance, isImperial);
    const zeroYards = toYards(zeroDistance, isImperial);
    const scopeHeightIn = toInches(scopeHeight, isImperial);

    // Apply cosine correction ONLY for LOS rangefinders
    // COMPENSATED rangefinders already give horizontal distance - never apply cosine
    const shouldApplyCosine = rangefinderMode === "LOS" && pitchLockedDeg !== null;
    const rangeHorizontal = shouldApplyCosine
        ? rangeYards * Math.cos((pitchLockedDeg * Math.PI) / 180)
        : rangeYards;

    // Heavy G1 ballistics computation
    const result = computeBallistics(
        rangeHorizontal,
        muzzleVelocityFps,
        ballisticCoefficient,
        scopeHeightIn,
        zeroYards,
        { atmosphere: getAtmosphere(atmosphere), wind: getWindVector(wind) }
    );

    // Get drop and drift in scope units
    const D = scopeUnit === "MOA" ? result.dropMOA : result.dropMIL;
    const drift = scopeUnit === "MOA" ? result.driftMOA : result.driftMIL;
    const W = drift === 0 ? 0 : -drift; // dial the windage turret against the drift

    return {
        D,
        W,
        dropMOA: result.dropMOA,
        dropMIL: result.dropMIL,
        dropInches: result.dropInches,
        driftMOA: result.driftMOA,
        driftMIL: result.driftMIL,
        driftInches: result.driftInches,
    };
}

// ==================== STAGE 2: AIM POINT ====================

export interface AimSolutionInput {
    /** Elevation / windage corrections from computeDropSolution */
    D: number;
    W: number;
    /** Smoothed cant (degrees), used to rotate the holdover so the crosshair moves smoothly */
    cantDegFiltered: number;
    /** Raw cant (degrees), used for warnings so they react instantly */
    cantDegUnfiltered: number;
    /** Calibrated screen pixels per MOA/MIL */
    pxPerUnit: number;
    /** Calibrated scope center (the zero) in screen pixels */
    scopeCenter: PixelPoint;
    /** Screen direction the image moved when the elevation turret was dialed UP (from calibration) */
    upAxis: UnitVector;
}

export interface AimSolution {
    /** Holdover crosshair position in screen pixels */
    holdoverX: number;
    holdoverY: number;
    cantDegUnfiltered: number; // Raw cant for display/warnings
    cantDegUsedForRotation: number; // Filtered + deadzoned for rotation
    cantWarning: CantWarning;
}

/** Where the holdover crosshair goes on screen, corrected for cant. Cheap: runs at IMU rate. */
export function computeAimSolution(input: AimSolutionInput): AimSolution {
    const { D, W, cantDegFiltered, cantDegUnfiltered, pxPerUnit, scopeCenter, upAxis } = input;

    // The holdover marks where the TARGET must sit on screen. Dialing a turret by the
    // correction would slide the image so the target lands under the crosshair; holding
    // over does the same by putting the target that far the OTHER way. So, in the scope's own
    // frame ("up" = the way the image moves when dialed UP, "right" = when dialed RIGHT),
    // the holdover is -D along up and -W along right.
    // (A normal scope: dialing UP moves the image up, so drop puts the target below center.)
    const up = -D;
    const right = -W;

    // Soft dead zone: subtract threshold instead of snapping
    const sign = Math.sign(cantDegFiltered);
    const mag = Math.max(0, Math.abs(cantDegFiltered) - CANT_DEAD_ZONE_DEG);
    const cantDegUsedForRotation = sign * mag;

    const cantRad = (cantDegUsedForRotation * Math.PI) / 180;

    // Rotate correction vector by cant angle (Spec Section 7, Step 4)
    const xRot = right * Math.cos(cantRad) + up * Math.sin(cantRad);
    const yRot = up * Math.cos(cantRad) - right * Math.sin(cantRad);

    // Into screen pixels along the calibrated axes (Spec Section 7, Steps 5-6).
    // NOTE: We intentionally do NOT clamp the aim point.
    // Extreme holds imply unethical / unrealistic shots.
    // If aim goes off-screen, UI may warn but math stays pure.
    const rightAxis = rightAxisFromUp(upAxis);
    const aimX = scopeCenter.x + (xRot * rightAxis.x + yRot * upAxis.x) * pxPerUnit;
    const aimY = scopeCenter.y + (xRot * rightAxis.y + yRot * upAxis.y) * pxPerUnit;

    // Warnings use unfiltered cant for instant response
    const absCantRaw = Math.abs(cantDegUnfiltered);
    let cantWarning: CantWarning = "ok";
    if (absCantRaw > CANT_BAD_DEG) cantWarning = "bad";
    else if (absCantRaw > CANT_WARN_DEG) cantWarning = "warn";

    return {
        holdoverX: aimX,
        holdoverY: aimY,
        cantDegUnfiltered,
        cantDegUsedForRotation,
        cantWarning,
    };
}

/** True when the holdover crosshair falls outside the camera area, so it cannot be seen. */
export function isHoldoverOffScreen(
    holdoverX: number,
    holdoverY: number,
    view: { width: number; height: number }
): boolean {
    return holdoverX < 0 || holdoverX > view.width || holdoverY < 0 || holdoverY > view.height;
}
