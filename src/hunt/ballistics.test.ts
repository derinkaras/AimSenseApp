import { describe, expect, it } from "vitest";
import { computeBallistics } from "./ballistics";
import { getAtmosphere } from "./atmosphere";
import { getWindVector } from "./wind";

// Reference load used throughout: a .308 168gr-ish match load.
// 2650 fps muzzle velocity, G1 BC 0.462, 1.5" scope height, 100 yd zero.
const MV = 2650;
const BC = 0.462;
const SCOPE_HEIGHT = 1.5;
const ZERO = 100;

describe("computeBallistics - guard clauses", () => {
    it("returns all zeros for zero or negative range", () => {
        expect(computeBallistics(0, MV, BC, SCOPE_HEIGHT, ZERO)).toEqual({
            dropMOA: 0,
            dropMIL: 0,
            dropInches: 0,
            driftMOA: 0,
            driftMIL: 0,
            driftInches: 0,
        });
        expect(computeBallistics(-50, MV, BC, SCOPE_HEIGHT, ZERO)).toEqual({
            dropMOA: 0,
            dropMIL: 0,
            dropInches: 0,
            driftMOA: 0,
            driftMIL: 0,
            driftInches: 0,
        });
    });

    it("returns all zeros for a non-positive muzzle velocity", () => {
        expect(computeBallistics(300, 0, BC, SCOPE_HEIGHT, ZERO).dropInches).toBe(0);
        expect(computeBallistics(300, -100, BC, SCOPE_HEIGHT, ZERO).dropInches).toBe(0);
    });

    it("returns all zeros for a non-positive zero distance", () => {
        expect(computeBallistics(300, MV, BC, SCOPE_HEIGHT, 0).dropInches).toBe(0);
    });

    it("returns all zeros for a non-finite range", () => {
        expect(computeBallistics(Infinity, MV, BC, SCOPE_HEIGHT, ZERO).dropInches).toBe(0);
        expect(computeBallistics(NaN, MV, BC, SCOPE_HEIGHT, ZERO).dropInches).toBe(0);
    });
});

describe("computeBallistics - zero behavior", () => {
    it("has ~zero drop at the zero distance itself (the rifle is zeroed there)", () => {
        const result = computeBallistics(ZERO, MV, BC, SCOPE_HEIGHT, ZERO);
        expect(result.dropInches).toBeCloseTo(0, 4);
        expect(result.dropMOA).toBeCloseTo(0, 4);
    });

    it("reports zero drop (not negative/above line of sight) between the near and far zero crossings", () => {
        // With a 100 yd zero and this load, the trajectory rises above the line of sight
        // well before 100 yd (a "near zero") and only comes back down to it at 100 yd.
        // Between those two crossings the bullet is above the line of sight; that's reported as 0.
        const result = computeBallistics(75, MV, BC, SCOPE_HEIGHT, ZERO);
        expect(result.dropInches).toBe(0);
    });

    it("is below the line of sight (positive drop) short of the near-zero crossing", () => {
        // Close to the muzzle, the bullet hasn't climbed up to the line of sight yet.
        const result = computeBallistics(10, MV, BC, SCOPE_HEIGHT, ZERO);
        expect(result.dropInches).toBeGreaterThan(0);
    });
});

describe("computeBallistics - drop grows with range", () => {
    it("drop increases monotonically with distance past the zero", () => {
        const d300 = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO).dropInches;
        const d400 = computeBallistics(400, MV, BC, SCOPE_HEIGHT, ZERO).dropInches;
        const d500 = computeBallistics(500, MV, BC, SCOPE_HEIGHT, ZERO).dropInches;
        expect(d400).toBeGreaterThan(d300);
        expect(d500).toBeGreaterThan(d400);
    });

    it("matches hand-checked reference values for a known load (regression check)", () => {
        const d300 = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO);
        expect(d300.dropInches).toBeCloseTo(15.304, 2);
        expect(d300.dropMOA).toBeCloseTo(4.872, 2);
        expect(d300.dropMIL).toBeCloseTo(1.417, 2);

        const d500 = computeBallistics(500, MV, BC, SCOPE_HEIGHT, ZERO);
        expect(d500.dropInches).toBeCloseTo(62.666, 1);
    });
});

describe("computeBallistics - MOA/MIL/inches agree with each other", () => {
    it("dropMOA and dropMIL are consistent conversions of dropInches at a given range", () => {
        const { dropInches, dropMOA, dropMIL } = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO);
        // 1 MOA subtends 1.047" at 100 yd -> (100/1.047) in per MOA per yard... check via round trip
        expect(dropInches / (dropMOA * (300 / 100) * 1.047)).toBeCloseTo(1, 6);
        // 1 MIL subtends 0.036" per yard of range
        expect(dropInches / (dropMIL * 300 * 0.036)).toBeCloseTo(1, 6);
    });
});

describe("computeBallistics - ballistic coefficient", () => {
    it("a higher BC (more aerodynamic, decelerates less) means less drop at the same range", () => {
        const lowBc = computeBallistics(400, MV, 0.4, SCOPE_HEIGHT, ZERO).dropInches;
        const highBc = computeBallistics(400, MV, 0.6, SCOPE_HEIGHT, ZERO).dropInches;
        expect(highBc).toBeLessThan(lowBc);
    });

    it("clamps unusably low/zero/negative BC instead of blowing up the simulation", () => {
        const result = computeBallistics(300, MV, 0, SCOPE_HEIGHT, ZERO);
        expect(Number.isFinite(result.dropInches)).toBe(true);
        expect(result.dropInches).toBeGreaterThan(0);
    });
});

describe("computeBallistics - muzzle velocity", () => {
    it("a faster muzzle velocity means less drop at the same range", () => {
        const slow = computeBallistics(400, 2400, BC, SCOPE_HEIGHT, ZERO).dropInches;
        const fast = computeBallistics(400, 2900, BC, SCOPE_HEIGHT, ZERO).dropInches;
        expect(fast).toBeLessThan(slow);
    });
});

describe("computeBallistics - wind drift", () => {
    it("no wind means no drift", () => {
        const result = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, { wind: null });
        expect(result.driftInches).toBe(0);
    });

    it("wind from 3 o'clock (from the right) drifts the bullet left (negative)", () => {
        const wind = getWindVector({ speedMph: 10, clockPosition: 3 });
        const result = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, { wind });
        expect(result.driftInches).toBeLessThan(0);
    });

    it("wind from 9 o'clock (from the left) drifts the bullet right (positive)", () => {
        const wind = getWindVector({ speedMph: 10, clockPosition: 9 });
        const result = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, { wind });
        expect(result.driftInches).toBeGreaterThan(0);
    });

    it("a direct headwind/tailwind produces no crosswind drift", () => {
        const headwind = getWindVector({ speedMph: 10, clockPosition: 12 });
        const tailwind = getWindVector({ speedMph: 10, clockPosition: 6 });
        expect(computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, { wind: headwind }).driftInches).toBeCloseTo(0, 6);
        expect(computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, { wind: tailwind }).driftInches).toBeCloseTo(0, 6);
    });

    it("does not noticeably change the drop (crosswind is nearly orthogonal to gravity's effect)", () => {
        const noWind = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO).dropInches;
        const wind = getWindVector({ speedMph: 10, clockPosition: 3 });
        const withWind = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, { wind }).dropInches;
        expect(withWind).toBeCloseTo(noWind, 1);
    });

    it("drift scales roughly linearly with wind speed", () => {
        const slow = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, {
            wind: getWindVector({ speedMph: 5, clockPosition: 3 }),
        }).driftInches;
        const fast = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, {
            wind: getWindVector({ speedMph: 10, clockPosition: 3 }),
        }).driftInches;
        expect(fast / slow).toBeCloseTo(2, 1);
    });
});

describe("computeBallistics - atmosphere", () => {
    it("thinner air at altitude means less drag, so less drop at the same range", () => {
        const seaLevel = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO).dropInches;
        const highAltitude = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, {
            atmosphere: getAtmosphere({ altitudeFt: 8000 }),
        }).dropInches;
        expect(highAltitude).toBeLessThan(seaLevel);
    });

    it("passing STANDARD_ATMOSPHERE explicitly matches passing nothing", () => {
        const withDefault = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO);
        const withStandard = computeBallistics(300, MV, BC, SCOPE_HEIGHT, ZERO, {
            atmosphere: getAtmosphere(null),
        });
        expect(withStandard.dropInches).toBeCloseTo(withDefault.dropInches, 8);
    });
});

describe("computeBallistics - zero distance choice", () => {
    it("a farther zero distance means less holdover needed at a given downrange target", () => {
        const zero100 = computeBallistics(500, MV, BC, SCOPE_HEIGHT, 100).dropInches;
        const zero200 = computeBallistics(500, MV, BC, SCOPE_HEIGHT, 200).dropInches;
        expect(zero200).toBeLessThan(zero100);
    });
});
