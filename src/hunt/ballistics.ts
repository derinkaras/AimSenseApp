// ============================================================
// src/hunt/ballistics.ts - G1 point-mass trajectory solver
// ============================================================
// Pure math (no React, no Expo). Works in yards / inches / feet / feet-per-second.
//
// How it works:
//  1. Find the launch angle that makes the bullet cross the line of sight at the zero
//     distance (the rifle is "zeroed" there). The bore sits below the scope, so the
//     bullet starts scopeHeight BELOW the line of sight and must climb up to it.
//     The zero is solved in calm air.
//  2. Fly the bullet to the target distance with that angle, through the current
//     air and wind.
//  3. The bullet's height relative to the line of sight there is the drop; how far it
//     has been pushed sideways is the wind drift.
//
// Physics: gravity plus air drag. Drag deceleration is
//     a = DRAG_CONSTANT * airDensity * Cd_G1(Mach) / BC * v²      (v = speed relative to the AIR)
// Flat ground, line of sight horizontal (angle corrections are handled by the caller
// with the cosine rule). Without conditions: standard sea-level air and no wind.

import { STANDARD_ATMOSPHERE, type Atmosphere } from "./atmosphere";
import { getG1Cd } from "./g1DragTable";
import type { WindVector } from "./wind";

export interface BallisticsResult {
    dropMOA: number;
    dropMIL: number;
    dropInches: number;
    /** Sideways drift at the target. Positive = the bullet is pushed to the RIGHT. 0 without wind. */
    driftMOA: number;
    driftMIL: number;
    driftInches: number;
}

/** Optional conditions. Anything left out means standard air / no wind. */
export interface BallisticsConditions {
    atmosphere?: Atmosphere;
    wind?: WindVector | null;
}

const GRAVITY = 32.174; // ft/s²

// Drag deceleration constant for a bullet with G1 ballistic coefficient in lb/in²:
//   (air density · π / 8) · (gravity / 144)  with air density = 0.0023769 slug/ft³  ≈ 2.0855e-4
// (2.08551e-4 is the value used by standard ballistic solvers.)
const DRAG_CONSTANT = 2.08551e-4;

const TIME_STEP = 0.0005; // seconds per simulation step
const MAX_FLIGHT_S = 10; // safety stop for the simulation
const MIN_BALLISTIC_COEFFICIENT = 0.1;

// Zeroing: solve for the launch angle with a secant search
const ZERO_TOLERANCE_FT = 1e-6; // stop when the bullet crosses the line of sight this close to the zero distance
const ZERO_MAX_ITERATIONS = 25;

const INCHES_PER_MOA_AT_100_YD = 1.047;
const INCHES_PER_MIL_PER_YD = 0.036;

const NO_DROP: BallisticsResult = {
    dropMOA: 0,
    dropMIL: 0,
    dropInches: 0,
    driftMOA: 0,
    driftMIL: 0,
    driftInches: 0,
};

/**
 * Bullet drop (and wind drift) at `rangeYards` for a rifle zeroed at `zeroRangeYards`.
 *
 * Drop is below the line of sight, in inches, MOA and MIL. Inside the zero distance the
 * bullet is above the line of sight; that is reported as 0 (no holdover).
 * Drift is signed: positive = pushed right. All zeros for a range of 0 or less, or for unusable inputs.
 */
export function computeBallistics(
    rangeYards: number,
    muzzleVelocityFps: number,
    ballisticCoefficient: number,
    scopeHeightInches: number,
    zeroRangeYards: number,
    conditions: BallisticsConditions = {}
): BallisticsResult {
    if (rangeYards <= 0) {
        return NO_DROP;
    }
    if (!(muzzleVelocityFps > 0) || !(zeroRangeYards > 0) || !Number.isFinite(rangeYards)) {
        console.warn("computeBallistics: unusable input", {
            rangeYards,
            muzzleVelocityFps,
            zeroRangeYards,
        });
        return NO_DROP;
    }

    const rangeFt = rangeYards * 3;
    const zeroRangeFt = zeroRangeYards * 3;
    const scopeHeightFt = scopeHeightInches / 12;
    const bc = Math.max(MIN_BALLISTIC_COEFFICIENT, ballisticCoefficient);
    const { densityRatio, speedOfSound } = conditions.atmosphere ?? STANDARD_ATMOSPHERE;

    /**
     * Fly the bullet from the muzzle to `distanceFt` and return where it is there, relative to
     * the line of sight: height `y` and sideways position `z` (feet, positive = right). The last
     * step is interpolated so the answer is exact at the requested distance instead of at the
     * first step past it.
     */
    const positionAtDistance = (
        launchAngle: number,
        distanceFt: number,
        wind: WindVector | null
    ): { y: number; z: number } => {
        const windDownrange = wind ? wind.downrangeFps : 0;
        const windRight = wind ? wind.rightFps : 0;

        let x = 0;
        let y = -scopeHeightFt; // bore is below the line of sight
        let z = 0;
        let t = 0;
        let vx = muzzleVelocityFps * Math.cos(launchAngle);
        let vy = muzzleVelocityFps * Math.sin(launchAngle);
        let vz = 0;

        while (x < distanceFt && t < MAX_FLIGHT_S) {
            // Drag depends on the bullet's speed through the air, not over the ground
            const airVx = vx - windDownrange;
            const airVz = vz - windRight;
            const v = Math.sqrt(airVx * airVx + vy * vy + airVz * airVz);
            const drag = (DRAG_CONSTANT * densityRatio * getG1Cd(v / speedOfSound) * v * v) / bc;
            vx -= drag * (airVx / v) * TIME_STEP;
            vy -= (GRAVITY + drag * (vy / v)) * TIME_STEP;
            vz -= drag * (airVz / v) * TIME_STEP;

            const prevX = x;
            const prevY = y;
            const prevZ = z;
            x += vx * TIME_STEP;
            y += vy * TIME_STEP;
            z += vz * TIME_STEP;
            t += TIME_STEP;

            if (x >= distanceFt) {
                const fraction = (distanceFt - prevX) / (x - prevX);
                return {
                    y: prevY + (y - prevY) * fraction,
                    z: prevZ + (z - prevZ) * fraction,
                };
            }
        }
        return { y, z };
    };

    // 1. Find the launch angle that zeros at zeroRange (calm air).
    // Start from the no-drag guess, then refine with the secant method
    // (height at the zero distance rises smoothly as the launch angle increases).
    const noDragTime = zeroRangeFt / muzzleVelocityFps;
    const noDragDrop = 0.5 * GRAVITY * noDragTime * noDragTime;
    let angle0 = Math.atan((noDragDrop + scopeHeightFt) / zeroRangeFt);
    let angle1 = angle0 * 1.05 + 1e-4;
    let error0 = positionAtDistance(angle0, zeroRangeFt, null).y;
    let error1 = positionAtDistance(angle1, zeroRangeFt, null).y;

    for (let i = 0; i < ZERO_MAX_ITERATIONS && Math.abs(error1) > ZERO_TOLERANCE_FT; i++) {
        if (error1 === error0) break;
        const angle2 = angle1 - (error1 * (angle1 - angle0)) / (error1 - error0);
        angle0 = angle1;
        error0 = error1;
        angle1 = angle2;
        error1 = positionAtDistance(angle1, zeroRangeFt, null).y;
    }
    const launchAngle = angle1;

    // 2. Simulate the trajectory to the target range, through the wind
    const atTarget = positionAtDistance(launchAngle, rangeFt, conditions.wind ?? null);

    // 3. Convert drop and drift to angular units
    const dropInches = Math.max(0, -atTarget.y * 12);
    const dropMOA = (dropInches / rangeYards) * (100 / INCHES_PER_MOA_AT_100_YD);
    const dropMIL = dropInches / (rangeYards * INCHES_PER_MIL_PER_YD);

    const driftInches = atTarget.z * 12;
    const driftMOA = (driftInches / rangeYards) * (100 / INCHES_PER_MOA_AT_100_YD);
    const driftMIL = driftInches / (rangeYards * INCHES_PER_MIL_PER_YD);

    return { dropMOA, dropMIL, dropInches, driftMOA, driftMIL, driftInches };
}
