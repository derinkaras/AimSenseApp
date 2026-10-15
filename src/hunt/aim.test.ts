import { describe, expect, it } from "vitest";
import {
    CANT_BAD_DEG,
    CANT_DEAD_ZONE_DEG,
    CANT_WARN_DEG,
    computeAimSolution,
    filterCant,
    isHoldoverOffScreen,
    mapIMUToRifleAxes,
    riflePitchDeg,
    rifleCantDeg,
} from "./aim";

describe("IMU axis mapping", () => {
    it("maps pitch to cant and roll to elevation, per the canonical axis convention", () => {
        expect(mapIMUToRifleAxes(12, 34)).toEqual({ cantNow: 34, elevationNow: 12 });
    });
});

describe("riflePitchDeg / rifleCantDeg", () => {
    it("is the difference from the calibrated baseline", () => {
        expect(riflePitchDeg(10, 2)).toBe(8);
        expect(riflePitchDeg(2, 2)).toBe(0);
        expect(rifleCantDeg(-3, 1)).toBe(-4);
    });
});

describe("filterCant", () => {
    it("blends 85% previous / 15% new", () => {
        expect(filterCant(0, 10)).toBeCloseTo(1.5, 10);
        expect(filterCant(10, 10)).toBeCloseTo(10, 10);
    });

    it("converges toward a steady raw reading over repeated calls", () => {
        let filtered = 0;
        for (let i = 0; i < 200; i++) {
            filtered = filterCant(filtered, 5);
        }
        expect(filtered).toBeCloseTo(5, 6);
    });
});

// A normal scope seen through the phone: dialing UP slides the image straight up the screen.
const BASE_AIM_INPUT = {
    D: 0,
    W: 0,
    cantDegFiltered: 0,
    cantDegUnfiltered: 0,
    pxPerUnit: 10,
    scopeCenter: { x: 500, y: 500 },
    upAxis: { x: 0, y: -1 },
};

describe("computeAimSolution - no correction", () => {
    it("with zero drop/windage/cant, the holdover sits exactly on the scope center", () => {
        const result = computeAimSolution(BASE_AIM_INPUT);
        expect(result.holdoverX).toBe(500);
        expect(result.holdoverY).toBe(500);
        expect(result.cantWarning).toBe("ok");
    });
});

describe("computeAimSolution - elevation", () => {
    it("drop puts the target BELOW the crosshair (larger Y) on a normal scope", () => {
        const result = computeAimSolution({ ...BASE_AIM_INPUT, D: 5 });
        expect(result.holdoverY).toBeGreaterThan(500);
        expect(result.holdoverX).toBe(500);
    });

    it("holdover offset scales with D and pxPerUnit", () => {
        const result = computeAimSolution({ ...BASE_AIM_INPUT, D: 5, pxPerUnit: 20 });
        expect(result.holdoverY).toBe(500 + 5 * 20);
    });

    it("follows the measured up direction when the view is slightly tilted", () => {
        // Dialing up moved the image 10 degrees clockwise of straight up
        const a = (10 * Math.PI) / 180;
        const result = computeAimSolution({ ...BASE_AIM_INPUT, D: 5, upAxis: { x: Math.sin(a), y: -Math.cos(a) } });
        // The holdover sits the opposite way: down and slightly left
        expect(result.holdoverX).toBeCloseTo(500 - 50 * Math.sin(a), 6);
        expect(result.holdoverY).toBeCloseTo(500 + 50 * Math.cos(a), 6);
    });
});

describe("computeAimSolution - windage", () => {
    it("a dial-right correction (bullet drifting left) puts the target LEFT of the crosshair on a normal scope", () => {
        // Holding into the wind means aiming right of the target, so the target sits left of center.
        const result = computeAimSolution({ ...BASE_AIM_INPUT, W: 3 });
        expect(result.holdoverX).toBeLessThan(500);
    });

    it("uses the direction at right angles to the measured up direction", () => {
        // Upside-down view: dialing up moved the image down the screen, so right is screen-left
        const result = computeAimSolution({ ...BASE_AIM_INPUT, W: 3, upAxis: { x: 0, y: 1 } });
        expect(result.holdoverX).toBeCloseTo(500 + 3 * 10, 6);
    });
});

describe("computeAimSolution - cant dead zone", () => {
    it("cant below the dead zone threshold has zero effect on rotation", () => {
        const result = computeAimSolution({
            ...BASE_AIM_INPUT,
            D: 5,
            cantDegFiltered: CANT_DEAD_ZONE_DEG - 0.01,
        });
        expect(result.cantDegUsedForRotation).toBe(0);
        expect(result.holdoverX).toBe(500);
        expect(result.holdoverY).toBe(500 + 5 * 10);
    });

    it("subtracts the dead zone (soft edge) rather than snapping once past it", () => {
        const result = computeAimSolution({ ...BASE_AIM_INPUT, D: 5, cantDegFiltered: 10 });
        expect(result.cantDegUsedForRotation).toBeCloseTo(10 - CANT_DEAD_ZONE_DEG, 10);
    });

    it("preserves the sign of negative cant beyond the dead zone", () => {
        const result = computeAimSolution({ ...BASE_AIM_INPUT, D: 5, cantDegFiltered: -10 });
        expect(result.cantDegUsedForRotation).toBeCloseTo(-(10 - CANT_DEAD_ZONE_DEG), 10);
    });
});

describe("computeAimSolution - cant rotation", () => {
    it("a 90 degree cant rotates a pure-elevation holdover into pure windage", () => {
        // Use a cant value that nets out to exactly 90 after the dead zone subtraction.
        const cantDeg = 90 + CANT_DEAD_ZONE_DEG;
        const result = computeAimSolution({ ...BASE_AIM_INPUT, D: 5, cantDegFiltered: cantDeg });
        // up=-5 (target below), right=0 rotated 90 deg -> xRot = up*sin(90) = -5, yRot = up*cos(90) = ~0
        expect(result.holdoverX).toBeCloseTo(500 - 5 * 10, 6);
        expect(result.holdoverY).toBeCloseTo(500, 6);
    });
});

describe("computeAimSolution - cant warnings use unfiltered cant", () => {
    it("is 'ok' at/under the warn threshold", () => {
        expect(computeAimSolution({ ...BASE_AIM_INPUT, cantDegUnfiltered: CANT_WARN_DEG }).cantWarning).toBe("ok");
    });
    it("is 'warn' between warn and bad thresholds", () => {
        expect(computeAimSolution({ ...BASE_AIM_INPUT, cantDegUnfiltered: CANT_WARN_DEG + 0.1 }).cantWarning).toBe(
            "warn"
        );
    });
    it("is 'bad' beyond the bad threshold", () => {
        expect(computeAimSolution({ ...BASE_AIM_INPUT, cantDegUnfiltered: CANT_BAD_DEG + 0.1 }).cantWarning).toBe(
            "bad"
        );
    });
    it("reacts to unfiltered cant even when the filtered cant used for rotation hasn't caught up", () => {
        const result = computeAimSolution({
            ...BASE_AIM_INPUT,
            cantDegFiltered: 0,
            cantDegUnfiltered: CANT_BAD_DEG + 1,
        });
        expect(result.cantWarning).toBe("bad");
        // Rotation is unaffected since filtered cant is still 0.
        expect(result.cantDegUsedForRotation).toBe(0);
    });
});

describe("isHoldoverOffScreen", () => {
    const view = { width: 1000, height: 800 };
    it("is false for a point inside the view", () => {
        expect(isHoldoverOffScreen(500, 400, view)).toBe(false);
    });
    it("is false exactly on the edges", () => {
        expect(isHoldoverOffScreen(0, 0, view)).toBe(false);
        expect(isHoldoverOffScreen(1000, 800, view)).toBe(false);
    });
    it("is true past any edge", () => {
        expect(isHoldoverOffScreen(-1, 400, view)).toBe(true);
        expect(isHoldoverOffScreen(1001, 400, view)).toBe(true);
        expect(isHoldoverOffScreen(500, -1, view)).toBe(true);
        expect(isHoldoverOffScreen(500, 801, view)).toBe(true);
    });
});
