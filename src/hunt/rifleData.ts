// ============================================================
// src/hunt/rifleData.ts - Is a rifle profile complete enough to hunt with?
// ============================================================
// Pure checks (no React, no Expo). The rifle form uses them to block saving, and the rifle
// picker uses them to block calibration and hunting with an incomplete rifle (for example a
// profile saved by an older version of the app, which allowed empty fields as 0).

import type { UnitSystem } from "@/types/apiTypes";

export type RifleField =
    | "name"
    | "caliber"
    | "bulletWeightGrains"
    | "ballisticCoefficient"
    | "muzzleVelocityFps"
    | "zeroDistance"
    | "scopeHeight";

/** Rifle values as numbers; null / undefined / NaN mean "not entered". */
export interface RifleData {
    name?: string | null;
    caliber?: string | null;
    bulletWeightGrains?: number | null;
    ballisticCoefficient?: number | null;
    muzzleVelocityFps?: number | null;
    zeroDistance?: number | null;
    scopeHeight?: number | null;
    unitSystem?: UnitSystem | null;
}

export interface RifleProblem {
    field: RifleField;
    message: string;
}

interface Limit {
    label: string;
    min: number;
    max: number;
    unit: string;
}

// Wide enough for any real hunting load, tight enough to catch typos (a missing decimal point)
const LIMITS = {
    bulletWeightGrains: { label: "Bullet weight", min: 10, max: 1000, unit: "gr" },
    ballisticCoefficient: { label: "Ballistic coefficient", min: 0.1, max: 1.5, unit: "" },
    muzzleVelocityFps: { label: "Muzzle velocity", min: 500, max: 5000, unit: "fps" },
    zeroDistance: {
        IMPERIAL: { label: "Zero distance", min: 10, max: 1000, unit: "yd" },
        METRIC: { label: "Zero distance", min: 10, max: 1000, unit: "m" },
    },
    scopeHeight: {
        IMPERIAL: { label: "Scope height", min: 0.5, max: 5, unit: "in" },
        METRIC: { label: "Scope height", min: 1, max: 13, unit: "cm" },
    },
} as const;

function checkNumber(field: RifleField, value: number | null | undefined, limit: Limit): RifleProblem | null {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return { field, message: `Enter the ${limit.label.toLowerCase()}.` };
    }
    if (value < limit.min || value > limit.max) {
        const unit = limit.unit ? ` ${limit.unit}` : "";
        return { field, message: `${limit.label} must be between ${limit.min} and ${limit.max}${unit}.` };
    }
    return null;
}

/** Everything missing or out of range, in form order. Empty list = ready to hunt with. */
export function getRifleProblems(rifle: RifleData): RifleProblem[] {
    const units: UnitSystem = rifle.unitSystem === "METRIC" ? "METRIC" : "IMPERIAL";
    const problems: (RifleProblem | null)[] = [
        rifle.name?.trim() ? null : { field: "name", message: "Enter a profile name." },
        rifle.caliber?.trim() ? null : { field: "caliber", message: "Enter the caliber." },
        checkNumber("bulletWeightGrains", rifle.bulletWeightGrains, LIMITS.bulletWeightGrains),
        checkNumber("ballisticCoefficient", rifle.ballisticCoefficient, LIMITS.ballisticCoefficient),
        checkNumber("muzzleVelocityFps", rifle.muzzleVelocityFps, LIMITS.muzzleVelocityFps),
        checkNumber("zeroDistance", rifle.zeroDistance, LIMITS.zeroDistance[units]),
        checkNumber("scopeHeight", rifle.scopeHeight, LIMITS.scopeHeight[units]),
    ];
    return problems.filter((p): p is RifleProblem => p !== null);
}

/** A form field's text as a number: empty or invalid text is null (never 0). */
export function parseRifleNumber(text: string): number | null {
    const trimmed = text.trim().replace(",", ".");
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
}
