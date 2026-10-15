// ============================================================
// src/hunt/units.ts - Metric / imperial conversions
// ============================================================
// Gun profiles store distances and heights in the user's unit system
// (yards + inches for IMPERIAL, meters + centimeters for METRIC).
// The ballistics engine works in yards and inches.

export const YARDS_PER_METER = 1.0936133;
export const INCHES_PER_CM = 0.393701;

/** Distance in the gun's unit (yd or m) -> yards. */
export function toYards(distance: number, isImperial: boolean): number {
    return isImperial ? distance : distance * YARDS_PER_METER;
}

/** Height in the gun's unit (in or cm) -> inches. */
export function toInches(height: number, isImperial: boolean): number {
    return isImperial ? height : height * INCHES_PER_CM;
}

/** Bullet drop (inches) as display text in the gun's unit system. */
export function formatDrop(dropInches: number, isImperial: boolean): string {
    if (isImperial) {
        return `${Math.round(dropInches)}"`;
    }
    return `${Math.round(dropInches / INCHES_PER_CM)} cm`;
}

// ---- Shot conditions: the shooter enters these in the gun's unit system
// (imperial: mph, feet, °F, inHg / metric: km/h, meters, °C, hPa); the solver uses imperial.
const MPH_PER_KMH = 0.621371;
const FEET_PER_METER = 3.28084;
const INHG_PER_HPA = 0.02953;

/** Wind speed in the gun's unit (mph or km/h) -> mph. */
export function toMph(speed: number, isImperial: boolean): number {
    return isImperial ? speed : speed * MPH_PER_KMH;
}

/** Altitude in the gun's unit (ft or m) -> feet. */
export function toFeet(altitude: number, isImperial: boolean): number {
    return isImperial ? altitude : altitude * FEET_PER_METER;
}

/** Temperature in the gun's unit (°F or °C) -> °F. */
export function toFahrenheit(temperature: number, isImperial: boolean): number {
    return isImperial ? temperature : (temperature * 9) / 5 + 32;
}

/** Station pressure in the gun's unit (inHg or hPa) -> inHg. */
export function toInHg(pressure: number, isImperial: boolean): number {
    return isImperial ? pressure : pressure * INHG_PER_HPA;
}
