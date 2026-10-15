import { describe, expect, it } from "vitest";
import { getG1Cd } from "./g1DragTable";

describe("getG1Cd", () => {
    it("returns the exact table value at a known Mach point", () => {
        expect(getG1Cd(0.5)).toBeCloseTo(0.2032, 10);
        expect(getG1Cd(1.0)).toBeCloseTo(0.4805, 10);
        expect(getG1Cd(2.5)).toBeCloseTo(0.5397, 10);
    });

    it("clamps below the table to the first entry's Cd", () => {
        expect(getG1Cd(-1)).toBeCloseTo(0.2629, 10);
        expect(getG1Cd(0)).toBeCloseTo(0.2629, 10);
    });

    it("clamps above the table to the last entry's Cd", () => {
        expect(getG1Cd(5.0)).toBeCloseTo(0.4988, 10);
        expect(getG1Cd(10)).toBeCloseTo(0.4988, 10);
    });

    it("linearly interpolates at the midpoint between two table entries", () => {
        // 0.60 -> 0.2034, 0.70 -> 0.2165 (table has no 0.65 point)
        const midpoint = getG1Cd(0.65);
        expect(midpoint).toBeCloseTo((0.2034 + 0.2165) / 2, 10);
    });

    it("is continuous (no jump) across the transonic peak just past Mach 1", () => {
        const justBefore = getG1Cd(0.999);
        const at = getG1Cd(1.0);
        const justAfter = getG1Cd(1.001);
        expect(Math.abs(at - justBefore)).toBeLessThan(0.01);
        expect(Math.abs(justAfter - at)).toBeLessThan(0.01);
    });

    it("captures the known G1 shape: drag rises sharply approaching Mach 1, then falls off supersonically", () => {
        const subsonic = getG1Cd(0.5);
        const transonic = getG1Cd(1.4); // near-peak drag
        const supersonic = getG1Cd(3.0);
        expect(transonic).toBeGreaterThan(subsonic);
        expect(transonic).toBeGreaterThan(supersonic);
    });
});
