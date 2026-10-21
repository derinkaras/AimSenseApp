import { describe, expect, it } from "vitest";
import {
    calculatePxPerUnit,
    clampValue,
    clicksToUnits,
    evaluateElevationMove,
    getCalibrationClickCount,
    getDialMultiple,
    rightAxisFromUp,
} from "./math";
import { MAX_DIAL_MULTIPLE, TARGET_MEASURED_MOVE_PX } from "./constants";

describe("clampValue", () => {
    it("passes values already inside the range through unchanged", () => {
        expect(clampValue(5, 0, 10)).toBe(5);
    });
    it("clamps to the minimum", () => {
        expect(clampValue(-5, 0, 10)).toBe(0);
    });
    it("clamps to the maximum", () => {
        expect(clampValue(15, 0, 10)).toBe(10);
    });
    it("handles min === max", () => {
        expect(clampValue(7, 3, 3)).toBe(3);
    });
});

describe("getCalibrationClickCount", () => {
    // Doc-comment worked examples: 10 MOA / click size, 3 MIL / click size.
    it.each([
        ["MOA", 0.25, 40],
        ["MOA", 0.5, 20],
        ["MOA", 0.125, 80],
        ["MIL", 0.1, 30],
        ["MIL", 0.2, 15],
        ["MIL", 0.05, 60],
    ] as const)("%s scope, %s click size -> %i clicks", (unit, clickSize, expected) => {
        expect(getCalibrationClickCount(unit, clickSize)).toBe(expected);
    });

    it("rounds to the nearest whole click for sizes that don't divide evenly", () => {
        // 10 / 0.3 = 33.3 -> rounds to 33
        expect(getCalibrationClickCount("MOA", 0.3)).toBe(33);
    });
});

describe("clicksToUnits", () => {
    it("multiplies clicks by click size", () => {
        expect(clicksToUnits(20, 0.25)).toBe(5);
        expect(clicksToUnits(10, 0.1)).toBeCloseTo(1, 10);
    });
    it("returns 0 for 0 clicks", () => {
        expect(clicksToUnits(0, 0.25)).toBe(0);
    });
});

describe("calculatePxPerUnit", () => {
    it("divides pixel movement by the angular units dialed", () => {
        // 20 clicks of 1/4 MOA = 5 MOA; 250 px moved -> 50 px/MOA
        expect(calculatePxPerUnit(250, 20, 0.25)).toBe(50);
    });

    it("uses the absolute value of the pixel delta (direction doesn't matter)", () => {
        expect(calculatePxPerUnit(-250, 20, 0.25)).toBe(50);
    });

    it("returns 0 when clicks dial out to 0 units, instead of dividing by zero", () => {
        expect(calculatePxPerUnit(100, 0, 0.25)).toBe(0);
        expect(Number.isFinite(calculatePxPerUnit(100, 0, 0.25))).toBe(true);
    });
});

describe("getCalibrationClickCount with a multiple", () => {
    it("multiplies the base click count", () => {
        expect(getCalibrationClickCount("MOA", 0.25, 2)).toBe(80);
        expect(getCalibrationClickCount("MIL", 0.1, 2)).toBe(60);
    });
});

describe("getDialMultiple", () => {
    it("keeps the base movement when the move is already large on screen", () => {
        expect(getDialMultiple(TARGET_MEASURED_MOVE_PX / 10, 10)).toBe(1);
        expect(getDialMultiple(12, 10)).toBe(1);
    });

    it("asks for more dialing when the move is short", () => {
        expect(getDialMultiple(5, 10)).toBe(2); // 50 px -> 100 px
    });

    it("never asks for more than MAX_DIAL_MULTIPLE", () => {
        expect(getDialMultiple(1, 10)).toBe(MAX_DIAL_MULTIPLE);
    });

    it("falls back to 1 for unusable input", () => {
        expect(getDialMultiple(0, 10)).toBe(1);
        expect(getDialMultiple(NaN, 10)).toBe(1);
    });
});

describe("evaluateElevationMove", () => {
    const center = { x: 200, y: 300 };

    it("turns a move straight up into the scale and the up direction", () => {
        const check = evaluateElevationMove(center, { x: 200, y: 240 }, 10);
        expect(check.ok).toBe(true);
        if (check.ok) {
            expect(check.pxPerUnit).toBeCloseTo(6, 10);
            expect(check.upAxis.x).toBeCloseTo(0, 10);
            expect(check.upAxis.y).toBeCloseTo(-1, 10);
        }
    });

    it("measures the full straight-line distance when the view is slightly tilted", () => {
        const check = evaluateElevationMove(center, { x: 210, y: 240 }, 10);
        expect(check.ok).toBe(true);
        if (check.ok) expect(check.pxPerUnit).toBeCloseTo(Math.hypot(10, 60) / 10, 10);
    });

    it("rejects a move too small to measure", () => {
        expect(evaluateElevationMove(center, { x: 201, y: 290 }, 10)).toMatchObject({ ok: false, problem: "tooSmall" });
    });

    it("flags a sideways move (the windage turret was turned)", () => {
        expect(evaluateElevationMove(center, { x: 260, y: 290 }, 10)).toMatchObject({ ok: false, problem: "sideways" });
    });

    it("flags a downward move (the turret was turned the wrong way)", () => {
        expect(evaluateElevationMove(center, { x: 200, y: 360 }, 10)).toMatchObject({ ok: false, problem: "down" });
    });
});

describe("rightAxisFromUp", () => {
    it("is a quarter turn clockwise on screen", () => {
        expect(rightAxisFromUp({ x: 0, y: -1 })).toEqual({ x: 1, y: 0 });
        expect(rightAxisFromUp({ x: 0, y: 1 })).toEqual({ x: -1, y: 0 });
    });
});
