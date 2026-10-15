import { describe, expect, it } from "vitest";
import { getAtmosphere, SEA_LEVEL_PRESSURE_INHG, SEA_LEVEL_TEMP_F, STANDARD_ATMOSPHERE } from "./atmosphere";

describe("getAtmosphere", () => {
    it("returns exactly STANDARD_ATMOSPHERE when given nothing", () => {
        expect(getAtmosphere(null)).toBe(STANDARD_ATMOSPHERE);
        expect(getAtmosphere(undefined)).toBe(STANDARD_ATMOSPHERE);
    });

    it("returns exactly STANDARD_ATMOSPHERE when every field is left out or unusable", () => {
        expect(getAtmosphere({})).toBe(STANDARD_ATMOSPHERE);
        expect(getAtmosphere({ altitudeFt: NaN, temperatureF: undefined })).toBe(STANDARD_ATMOSPHERE);
    });

    it("standard temperature at sea level with no other input reproduces standard density and speed of sound", () => {
        const atm = getAtmosphere({ temperatureF: SEA_LEVEL_TEMP_F });
        expect(atm.densityRatio).toBeCloseTo(1, 6);
        expect(atm.speedOfSound).toBeCloseTo(STANDARD_ATMOSPHERE.speedOfSound, 1);
    });

    it("standard pressure at sea level with no other input reproduces standard density", () => {
        const atm = getAtmosphere({ pressureInHg: SEA_LEVEL_PRESSURE_INHG });
        expect(atm.densityRatio).toBeCloseTo(1, 6);
    });

    it("higher altitude means thinner air (lower density ratio) than sea level", () => {
        const seaLevel = getAtmosphere({ altitudeFt: 0 });
        const highAltitude = getAtmosphere({ altitudeFt: 8000 });
        expect(highAltitude.densityRatio).toBeLessThan(seaLevel.densityRatio);
    });

    it("higher temperature (at fixed altitude/pressure) means thinner air", () => {
        const cool = getAtmosphere({ altitudeFt: 0, temperatureF: 40 });
        const hot = getAtmosphere({ altitudeFt: 0, temperatureF: 100 });
        expect(hot.densityRatio).toBeLessThan(cool.densityRatio);
    });

    it("higher temperature means a higher speed of sound", () => {
        const cool = getAtmosphere({ temperatureF: 40 });
        const hot = getAtmosphere({ temperatureF: 100 });
        expect(hot.speedOfSound).toBeGreaterThan(cool.speedOfSound);
    });

    it("higher station pressure (at fixed temperature) means denser air", () => {
        const low = getAtmosphere({ altitudeFt: 0, pressureInHg: 29 });
        const high = getAtmosphere({ altitudeFt: 0, pressureInHg: 30.5 });
        expect(high.densityRatio).toBeGreaterThan(low.densityRatio);
    });

    it("clamps out-of-range altitude instead of extrapolating indefinitely", () => {
        const clamped = getAtmosphere({ altitudeFt: 100000 });
        const atMax = getAtmosphere({ altitudeFt: 36000 });
        expect(clamped.densityRatio).toBeCloseTo(atMax.densityRatio, 10);
    });

    it("clamps out-of-range temperature instead of extrapolating indefinitely", () => {
        const clamped = getAtmosphere({ temperatureF: 1000 });
        const atMax = getAtmosphere({ temperatureF: 140 });
        expect(clamped.densityRatio).toBeCloseTo(atMax.densityRatio, 10);
    });

    it("clamps out-of-range pressure instead of extrapolating indefinitely", () => {
        const clamped = getAtmosphere({ pressureInHg: 100 });
        const atMax = getAtmosphere({ pressureInHg: 34 });
        expect(clamped.densityRatio).toBeCloseTo(atMax.densityRatio, 10);
    });
});
