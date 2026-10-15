import { describe, expect, it } from "vitest";
import { getWindVector } from "./wind";

const FPS_PER_MPH = 5280 / 3600;

describe("getWindVector", () => {
    it("returns null when there is no wind entered", () => {
        expect(getWindVector(null)).toBeNull();
        expect(getWindVector(undefined)).toBeNull();
    });

    it("returns null for non-positive or non-finite speed", () => {
        expect(getWindVector({ speedMph: 0, clockPosition: 12 })).toBeNull();
        expect(getWindVector({ speedMph: -5, clockPosition: 12 })).toBeNull();
        expect(getWindVector({ speedMph: NaN, clockPosition: 12 })).toBeNull();
    });

    it("returns null for a non-finite clock position", () => {
        expect(getWindVector({ speedMph: 10, clockPosition: NaN })).toBeNull();
    });

    it("12 o'clock (headwind) is pure negative downrange, no crosswind", () => {
        const v = getWindVector({ speedMph: 10, clockPosition: 12 })!;
        expect(v.downrangeFps).toBeCloseTo(-10 * FPS_PER_MPH, 5);
        expect(v.rightFps).toBeCloseTo(0, 8);
    });

    it("6 o'clock (tailwind) is pure positive downrange, no crosswind", () => {
        const v = getWindVector({ speedMph: 10, clockPosition: 6 })!;
        expect(v.downrangeFps).toBeCloseTo(10 * FPS_PER_MPH, 5);
        expect(v.rightFps).toBeCloseTo(0, 8);
    });

    it("3 o'clock (from the right) blows purely toward the left (negative rightFps)", () => {
        const v = getWindVector({ speedMph: 10, clockPosition: 3 })!;
        expect(v.downrangeFps).toBeCloseTo(0, 8);
        expect(v.rightFps).toBeCloseTo(-10 * FPS_PER_MPH, 5);
    });

    it("9 o'clock (from the left) blows purely toward the right (positive rightFps)", () => {
        const v = getWindVector({ speedMph: 10, clockPosition: 9 })!;
        expect(v.downrangeFps).toBeCloseTo(0, 8);
        expect(v.rightFps).toBeCloseTo(10 * FPS_PER_MPH, 5);
    });

    it("wraps clock position 12 the same as 0", () => {
        const twelve = getWindVector({ speedMph: 10, clockPosition: 12 })!;
        const zero = getWindVector({ speedMph: 10, clockPosition: 0 })!;
        expect(zero.downrangeFps).toBeCloseTo(twelve.downrangeFps, 8);
        expect(zero.rightFps).toBeCloseTo(twelve.rightFps, 8);
    });

    it("scales linearly with speed", () => {
        const slow = getWindVector({ speedMph: 5, clockPosition: 3 })!;
        const fast = getWindVector({ speedMph: 10, clockPosition: 3 })!;
        expect(fast.rightFps).toBeCloseTo(slow.rightFps * 2, 6);
    });
});
