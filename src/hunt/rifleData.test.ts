import { describe, expect, it } from "vitest";
import { getRifleProblems, parseRifleNumber } from "./rifleData";

const COMPLETE = {
    name: "Tikka T3x",
    caliber: ".308 Win",
    bulletWeightGrains: 168,
    ballisticCoefficient: 0.462,
    muzzleVelocityFps: 2650,
    zeroDistance: 100,
    scopeHeight: 1.5,
    unitSystem: "IMPERIAL" as const,
};

describe("getRifleProblems", () => {
    it("accepts a complete rifle", () => {
        expect(getRifleProblems(COMPLETE)).toEqual([]);
    });

    it("flags missing fields, including the 0 an older app version saved for empty fields", () => {
        const problems = getRifleProblems({ ...COMPLETE, caliber: "  ", muzzleVelocityFps: 0, scopeHeight: null });
        expect(problems.map((p) => p.field)).toEqual(["caliber", "muzzleVelocityFps", "scopeHeight"]);
    });

    it("says 'enter' for a missing value and gives the range for an out-of-range one", () => {
        expect(getRifleProblems({ ...COMPLETE, zeroDistance: undefined })[0].message).toBe("Enter the zero distance.");
        expect(getRifleProblems({ ...COMPLETE, ballisticCoefficient: 4.62 })[0].message).toBe(
            "Ballistic coefficient must be between 0.1 and 1.5."
        );
    });

    it("checks scope height in the rifle's own unit", () => {
        expect(getRifleProblems({ ...COMPLETE, unitSystem: "METRIC", scopeHeight: 3.8 })).toEqual([]);
        expect(getRifleProblems({ ...COMPLETE, unitSystem: "IMPERIAL", scopeHeight: 3.8 * 2.54 })[0].field).toBe("scopeHeight");
    });

    it("rejects NaN", () => {
        expect(getRifleProblems({ ...COMPLETE, bulletWeightGrains: NaN })[0].field).toBe("bulletWeightGrains");
    });
});

describe("parseRifleNumber", () => {
    it("turns empty text into null, not 0", () => {
        expect(parseRifleNumber("")).toBeNull();
        expect(parseRifleNumber("   ")).toBeNull();
    });

    it("parses numbers, including a decimal comma", () => {
        expect(parseRifleNumber("2650")).toBe(2650);
        expect(parseRifleNumber("0,462")).toBe(0.462);
    });

    it("turns non-numbers into null", () => {
        expect(parseRifleNumber("abc")).toBeNull();
    });
});
