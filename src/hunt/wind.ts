// ============================================================
// src/hunt/wind.ts - Wind input and its components
// ============================================================
// The shooter gives a wind speed and the direction it blows FROM as a clock position,
// as seen looking from the rifle toward the target:
//   12 = from the target (headwind)      3 = from the right
//    6 = from behind (tailwind)          9 = from the left
// The solver works with the wind's velocity along the shot and across it.

/** Wind as the shooter enters it. */
export interface WindInput {
    /** Wind speed, mph */
    speedMph: number;
    /** Clock position the wind blows FROM: 1-12 (12 = headwind, 3 = from the right, 6 = tailwind, 9 = from the left) */
    clockPosition: number;
}

/** Velocity of the air relative to the ground, in the solver's frame (ft/s). */
export interface WindVector {
    /** Along the shot: positive = blowing away from the shooter toward the target (tailwind) */
    downrangeFps: number;
    /** Across the shot: positive = blowing toward the shooter's right */
    rightFps: number;
}

const FPS_PER_MPH = 5280 / 3600; // 1.46667

/** Wind velocity in the solver's frame. Returns null when there is no wind to apply. */
export function getWindVector(wind: WindInput | null | undefined): WindVector | null {
    if (!wind || !Number.isFinite(wind.speedMph) || !Number.isFinite(wind.clockPosition) || wind.speedMph <= 0) {
        return null;
    }
    const speedFps = wind.speedMph * FPS_PER_MPH;
    // "from" direction, 30° per hour; 12 o'clock is 0°
    const fromRad = (((wind.clockPosition % 12) * 30) * Math.PI) / 180;
    return {
        // wind FROM the target (12 o'clock) blows toward the shooter: negative downrange
        downrangeFps: -speedFps * Math.cos(fromRad),
        // wind FROM the right (3 o'clock) blows toward the left: negative right
        rightFps: -speedFps * Math.sin(fromRad),
    };
}
