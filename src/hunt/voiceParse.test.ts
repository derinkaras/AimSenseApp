import { describe, expect, it } from "vitest";
import { normalizeSpokenNumbers, parseVoiceShotSetup } from "./voiceParse";

describe("normalizeSpokenNumbers", () => {
    it("leaves plain digits alone", () => {
        expect(normalizeSpokenNumbers("300 yards")).toBe("300 yards");
    });

    it("converts a simple number word", () => {
        expect(normalizeSpokenNumbers("ten mph")).toBe("10 mph");
    });

    it("converts hundreds", () => {
        expect(normalizeSpokenNumbers("three hundred yards")).toBe("300 yards");
    });

    it("converts hundreds plus tens/ones and skips 'and'", () => {
        expect(normalizeSpokenNumbers("two hundred and fifty yards")).toBe("250 yards");
        expect(normalizeSpokenNumbers("four hundred fifty three yards")).toBe("453 yards");
    });

    it("converts thousands", () => {
        expect(normalizeSpokenNumbers("two thousand yards")).toBe("2000 yards");
    });

    it("leaves non-number words untouched around a number", () => {
        expect(normalizeSpokenNumbers("wind ten from three o'clock")).toBe("wind 10 from 3 o'clock");
    });
});

describe("parseVoiceShotSetup", () => {
    it("returns matchedAny false and all nulls for an unrelated transcript", () => {
        const result = parseVoiceShotSetup("hello there");
        expect(result.matchedAny).toBe(false);
        expect(result.distanceText).toBeNull();
        expect(result.windSpeedText).toBeNull();
    });

    it("parses distance with a unit word", () => {
        const result = parseVoiceShotSetup("three hundred yards");
        expect(result.matchedAny).toBe(true);
        expect(result.distanceText).toBe("300");
        expect(result.distanceUnit).toBe("yd");
    });

    it("reports meters when the distance is said in meters", () => {
        expect(parseVoiceShotSetup("450 meters").distanceUnit).toBe("m");
        expect(parseVoiceShotSetup("450 metres").distanceUnit).toBe("m");
        expect(parseVoiceShotSetup("450m").distanceUnit).toBe("m");
    });

    it("parses distance via 'at N' fallback when no unit word is given", () => {
        const result = parseVoiceShotSetup("at 450");
        expect(result.distanceText).toBe("450");
        expect(result.distanceUnit).toBeNull();
    });

    it("parses wind speed with a numeric clock position", () => {
        const result = parseVoiceShotSetup("wind 10 mph from 3 o'clock");
        expect(result.windSpeedText).toBe("10");
        expect(result.windClock).toBe(3);
    });

    it("parses wind clock from spoken direction words", () => {
        expect(parseVoiceShotSetup("wind 5 headwind").windClock).toBe(12);
        expect(parseVoiceShotSetup("wind 5 tailwind").windClock).toBe(6);
    });

    it("parses altitude, temperature and pressure", () => {
        const result = parseVoiceShotSetup("altitude 5000 feet, temperature 45 degrees, pressure 29.9");
        expect(result.altitudeText).toBe("5000");
        expect(result.temperatureText).toBe("45");
        expect(result.pressureText).toBe("29.9");
    });

    it("parses a full realistic sentence together", () => {
        const result = parseVoiceShotSetup(
            "three hundred yards, wind ten from three o'clock, temperature forty five degrees"
        );
        expect(result.distanceText).toBe("300");
        expect(result.windSpeedText).toBe("10");
        expect(result.windClock).toBe(3);
        expect(result.temperatureText).toBe("45");
    });
});
