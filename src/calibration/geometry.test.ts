import { describe, expect, it } from "vitest";
import { nudgePoint, snapToHalfDegree, tapToNormalizedCameraPoint } from "./geometry";

const VIEW = { width: 400, height: 800 };

describe("nudgePoint", () => {
    it("moves up, down, left, right by the step size", () => {
        expect(nudgePoint({ x: 100, y: 100 }, "up", 10, VIEW)).toEqual({ x: 100, y: 90 });
        expect(nudgePoint({ x: 100, y: 100 }, "down", 10, VIEW)).toEqual({ x: 100, y: 110 });
        expect(nudgePoint({ x: 100, y: 100 }, "left", 10, VIEW)).toEqual({ x: 90, y: 100 });
        expect(nudgePoint({ x: 100, y: 100 }, "right", 10, VIEW)).toEqual({ x: 110, y: 100 });
    });

    it("clamps at the top/left edge of the view (0)", () => {
        expect(nudgePoint({ x: 5, y: 5 }, "up", 10, VIEW)).toEqual({ x: 5, y: 0 });
        expect(nudgePoint({ x: 5, y: 5 }, "left", 10, VIEW)).toEqual({ x: 0, y: 5 });
    });

    it("clamps at the bottom/right edge of the view", () => {
        expect(nudgePoint({ x: 395, y: 795 }, "right", 10, VIEW)).toEqual({ x: 400, y: 795 });
        expect(nudgePoint({ x: 395, y: 795 }, "down", 10, VIEW)).toEqual({ x: 395, y: 800 });
    });

    it("does not mutate the input point", () => {
        const point = { x: 100, y: 100 };
        nudgePoint(point, "up", 10, VIEW);
        expect(point).toEqual({ x: 100, y: 100 });
    });
});

describe("snapToHalfDegree", () => {
    it.each([
        [0.24, 0],
        [0.26, 0.5],
        [0.74, 0.5],
        [0.76, 1],
        [-0.26, -0.5],
        [1.0, 1],
    ])("rounds %s to nearest 0.5 -> %s", (input, expected) => {
        expect(snapToHalfDegree(input)).toBeCloseTo(expected, 10);
    });
});

describe("tapToNormalizedCameraPoint", () => {
    it("with 0 rotation, maps a tap to its own normalized position", () => {
        const { normalizedX, normalizedY } = tapToNormalizedCameraPoint(100, 200, VIEW, 0);
        expect(normalizedX).toBeCloseTo(100 / 400, 10);
        expect(normalizedY).toBeCloseTo(200 / 800, 10);
    });

    it("a tap at the exact center stays at the center regardless of rotation", () => {
        const { normalizedX, normalizedY } = tapToNormalizedCameraPoint(200, 400, VIEW, 37);
        expect(normalizedX).toBeCloseTo(0.5, 10);
        expect(normalizedY).toBeCloseTo(0.5, 10);
    });

    it("a 90 degree rotation swaps the offset axes", () => {
        // Square view so the swap is easy to reason about.
        const square = { width: 400, height: 400 };
        const center = 200;
        // Tap 50px right of center.
        const { normalizedX, normalizedY } = tapToNormalizedCameraPoint(center + 50, center, square, 90);
        // Rotating the tap back by -90 deg turns a rightward offset into an upward one (smaller Y).
        expect(normalizedX).toBeCloseTo(0.5, 6);
        expect(normalizedY).toBeCloseTo((center - 50) / 400, 6);
    });

    it("clamps results to [0, 1] even for taps or rotations that would land outside the view", () => {
        const { normalizedX, normalizedY } = tapToNormalizedCameraPoint(-1000, -1000, VIEW, 0);
        expect(normalizedX).toBe(0);
        expect(normalizedY).toBe(0);
        const clampedHigh = tapToNormalizedCameraPoint(10000, 10000, VIEW, 0);
        expect(clampedHigh.normalizedX).toBe(1);
        expect(clampedHigh.normalizedY).toBe(1);
    });
});
