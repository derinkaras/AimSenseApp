// ============================================================
// src/hunt/conditions.ts - Shot conditions the shooter can enter
// ============================================================
// Everything here is optional. The shooter types these in the gun's own unit system
// (imperial: mph, feet, °F, inHg / metric: km/h, meters, °C, hPa); this file turns them
// into what the ballistics solver needs. Pure logic, no React.

import type { AtmosphereInput } from "./atmosphere";
import { toFahrenheit, toFeet, toInHg, toMph } from "./units";
import type { WindInput } from "./wind";

/** What the shooter entered, in the gun's unit system. null = not entered (use standard / none). */
export interface ShotConditions {
    windSpeed: number | null; // mph or km/h
    windClock: number | null; // clock position the wind blows FROM, 1-12
    altitude: number | null; // ft or m
    temperature: number | null; // °F or °C
    pressure: number | null; // station pressure: inHg or hPa
}

export const NO_CONDITIONS: ShotConditions = {
    windSpeed: null,
    windClock: null,
    altitude: null,
    temperature: null,
    pressure: null,
};

export interface ConditionUnits {
    wind: string;
    altitude: string;
    temperature: string;
    pressure: string;
}

export function getConditionUnits(isImperial: boolean): ConditionUnits {
    return isImperial
        ? { wind: "mph", altitude: "ft", temperature: "°F", pressure: "inHg" }
        : { wind: "km/h", altitude: "m", temperature: "°C", pressure: "hPa" };
}

/** Accepted ranges for each entry, in the gun's unit system. Used to catch typos. */
export function getConditionLimits(isImperial: boolean) {
    return isImperial
        ? { wind: [0, 99], altitude: [-1500, 30000], temperature: [-60, 140], pressure: [10, 34] }
        : { wind: [0, 150], altitude: [-450, 9000], temperature: [-50, 60], pressure: [340, 1150] };
}

/** Text -> number. Blank or unreadable text gives null. Accepts a comma as the decimal mark. */
export function parseNumber(text: string): number | null {
    const trimmed = text.trim().replace(",", ".");
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
}

/** True when the shooter entered anything at all. */
export function hasConditions(c: ShotConditions): boolean {
    return c.windSpeed !== null || c.altitude !== null || c.temperature !== null || c.pressure !== null;
}

/** The entries as the solver wants them (imperial units). Leaves out anything not entered. */
export function toSolverConditions(
    c: ShotConditions,
    isImperial: boolean
): { wind: WindInput | null; atmosphere: AtmosphereInput | null } {
    const wind: WindInput | null =
        c.windSpeed !== null && c.windSpeed > 0 && c.windClock !== null
            ? { speedMph: toMph(c.windSpeed, isImperial), clockPosition: c.windClock }
            : null;

    const atmosphere: AtmosphereInput = {};
    if (c.altitude !== null) atmosphere.altitudeFt = toFeet(c.altitude, isImperial);
    if (c.temperature !== null) atmosphere.temperatureF = toFahrenheit(c.temperature, isImperial);
    if (c.pressure !== null) atmosphere.pressureInHg = toInHg(c.pressure, isImperial);

    return {
        wind,
        atmosphere: Object.keys(atmosphere).length > 0 ? atmosphere : null,
    };
}

/** Short summary for the screen, e.g. "Wind 10 mph from 3 · 5000 ft · 45°F". Empty when nothing entered. */
export function describeConditions(c: ShotConditions, isImperial: boolean): string {
    const units = getConditionUnits(isImperial);
    const parts: string[] = [];
    if (c.windSpeed !== null && c.windSpeed > 0 && c.windClock !== null) {
        parts.push(`Wind ${c.windSpeed} ${units.wind} from ${c.windClock}`);
    }
    if (c.altitude !== null) parts.push(`${c.altitude} ${units.altitude}`);
    if (c.temperature !== null) parts.push(`${c.temperature}${units.temperature}`);
    if (c.pressure !== null) parts.push(`${c.pressure} ${units.pressure}`);
    return parts.join(" · ");
}
