import { describe, expect, it } from "vitest";
import { convertDistance, formatDrop, gunDistanceUnit, toFahrenheit, toFeet, toInches, toInHg, toMph, toYards } from "./units";

describe("toYards", () => {
    it("passes yards through unchanged when imperial", () => {
        expect(toYards(100, true)).toBe(100);
    });
    it("converts meters to yards", () => {
        // 100 m ≈ 109.36 yd
        expect(toYards(100, false)).toBeCloseTo(109.36133, 4);
    });
});

describe("toInches", () => {
    it("passes inches through unchanged when imperial", () => {
        expect(toInches(2, true)).toBe(2);
    });
    it("converts centimeters to inches", () => {
        // 5 cm ≈ 1.9685 in
        expect(toInches(5, false)).toBeCloseTo(1.968505, 4);
    });
});

describe("formatDrop", () => {
    it("formats imperial drop in whole inches", () => {
        expect(formatDrop(12.4, true)).toBe('12"');
        expect(formatDrop(12.6, true)).toBe('13"');
    });
    it("formats metric drop in whole centimeters", () => {
        const drop = 10 * 0.393701; // inches equivalent to 10 cm
        expect(formatDrop(drop, false)).toBe("10 cm");
    });
});

describe("toMph", () => {
    it("passes mph through unchanged when imperial", () => {
        expect(toMph(15, true)).toBe(15);
    });
    it("converts km/h to mph", () => {
        expect(toMph(100, false)).toBeCloseTo(62.1371, 3);
    });
});

describe("toFeet", () => {
    it("passes feet through unchanged when imperial", () => {
        expect(toFeet(500, true)).toBe(500);
    });
    it("converts meters to feet", () => {
        expect(toFeet(100, false)).toBeCloseTo(328.084, 2);
    });
});

describe("toFahrenheit", () => {
    it("passes Fahrenheit through unchanged when imperial", () => {
        expect(toFahrenheit(70, true)).toBe(70);
    });
    it("converts Celsius to Fahrenheit", () => {
        expect(toFahrenheit(0, false)).toBe(32);
        expect(toFahrenheit(100, false)).toBe(212);
        expect(toFahrenheit(20, false)).toBeCloseTo(68, 10);
    });
});

describe("toInHg", () => {
    it("passes inHg through unchanged when imperial", () => {
        expect(toInHg(29.92, true)).toBe(29.92);
    });
    it("converts hPa to inHg", () => {
        // Standard sea-level pressure: 1013.25 hPa ≈ 29.92 inHg
        expect(toInHg(1013.25, false)).toBeCloseTo(29.92, 1);
    });
});

describe("convertDistance", () => {
    it("passes the value through when the units match", () => {
        expect(convertDistance(300, "yd", "yd")).toBe(300);
        expect(convertDistance(300, "m", "m")).toBe(300);
    });
    it("converts meters to yards and back", () => {
        expect(convertDistance(100, "m", "yd")).toBeCloseTo(109.36133, 4);
        expect(convertDistance(109.36133, "yd", "m")).toBeCloseTo(100, 4);
    });
});

describe("gunDistanceUnit", () => {
    it("is yards for imperial and meters for metric", () => {
        expect(gunDistanceUnit(true)).toBe("yd");
        expect(gunDistanceUnit(false)).toBe("m");
    });
});
