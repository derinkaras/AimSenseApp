// ============================================================
// src/hunt/voiceParse.ts - Turns a spoken shot-setup transcript into form values
// ============================================================
// Pure logic, no React/Expo, so it's easy to unit test and to read next to conditions.ts.
// Handles both digits ("three hundred yards") and spoken number words, since on-device
// speech recognizers frequently return one or the other depending on the phrase.

const ONES: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Rewrites runs of spoken number words ("three hundred fifty") into digits ("350") in place in the text. */
export function normalizeSpokenNumbers(text: string): string {
    const tokens = text.split(/\s+/);
    const out: string[] = [];
    let current = 0; // accumulates within a "hundred" group, e.g. "three hundred" -> 300
    let total = 0; // running total across scale breaks, e.g. "two thousand" + "three hundred"
    let inNumber = false;

    const flush = () => {
        if (inNumber) {
            out.push(String(total + current));
            current = 0;
            total = 0;
            inNumber = false;
        }
    };

    for (const raw of tokens) {
        const token = raw.toLowerCase().replace(/[^a-z']/g, "");
        if (token === "and" && inNumber) continue; // "two hundred and fifty"
        if (token in ONES) {
            current += ONES[token];
            inNumber = true;
        } else if (token in TENS) {
            current += TENS[token];
            inNumber = true;
        } else if (token === "hundred") {
            current = (current || 1) * 100;
            inNumber = true;
        } else if (token === "thousand") {
            total += (current || 1) * 1000;
            current = 0;
            inNumber = true;
        } else {
            flush();
            out.push(raw);
        }
    }
    flush();
    return out.join(" ");
}

export interface VoiceParseResult {
    distanceText: string | null;
    /** The unit said with the distance ("300 yards" -> "yd"), or null if none was said. */
    distanceUnit: "yd" | "m" | null;
    windSpeedText: string | null;
    windClock: number | null;
    altitudeText: string | null;
    temperatureText: string | null;
    pressureText: string | null;
    /** True if anything at all was recognized, so the UI can tell "heard nothing useful" apart from silence. */
    matchedAny: boolean;
}

const NUM = "(\\d+(?:\\.\\d+)?)";

const CLOCK_WORDS: Record<string, number> = {
    headwind: 12, "straight ahead": 12, ahead: 12,
    tailwind: 6, behind: 6, "at my back": 6,
    right: 3, "my right": 3, "the right": 3,
    left: 9, "my left": 9, "the left": 9,
};

function findWindClock(text: string): number | null {
    const clockMatch = text.match(/from\s+(?:the\s+)?(\d{1,2})\s*(?:o'?clock)?/);
    if (clockMatch) {
        const c = parseInt(clockMatch[1], 10);
        if (c >= 1 && c <= 12) return c;
    }
    for (const [phrase, clock] of Object.entries(CLOCK_WORDS)) {
        if (text.includes(phrase)) return clock;
    }
    return null;
}

/** Parses a spoken shot-setup transcript into the same text values the manual form fields use. */
export function parseVoiceShotSetup(rawTranscript: string): VoiceParseResult {
    const text = normalizeSpokenNumbers(rawTranscript.toLowerCase().trim());

    const result: VoiceParseResult = {
        distanceText: null,
        distanceUnit: null,
        windSpeedText: null,
        windClock: null,
        altitudeText: null,
        temperatureText: null,
        pressureText: null,
        matchedAny: false,
    };

    // Distance: a number followed by a distance unit word, e.g. "300 yards", "450 meters"
    const distanceMatch = text.match(new RegExp(`${NUM}\\s*(yards?|yds?|meters?|metres?|m)\\b`));
    if (distanceMatch) {
        result.distanceText = distanceMatch[1];
        result.distanceUnit = distanceMatch[2].startsWith("y") ? "yd" : "m";
        result.matchedAny = true;
    } else {
        // Fall back to "at 300" or a bare leading number, since shooters often skip the unit
        const atMatch = text.match(new RegExp(`\\bat\\s+${NUM}`));
        if (atMatch) {
            result.distanceText = atMatch[1];
            result.matchedAny = true;
        }
    }

    // Wind speed, e.g. "wind 10 mph from 3 o'clock" / "wind speed of 15"
    const windMatch = text.match(new RegExp(`wind(?:\\s+speed)?(?:\\s+of)?\\s+${NUM}`));
    if (windMatch) {
        result.windSpeedText = windMatch[1];
        result.matchedAny = true;
        result.windClock = findWindClock(text);
    }

    // Altitude, e.g. "altitude 5000 feet"
    const altitudeMatch = text.match(new RegExp(`altitude(?:\\s+of)?\\s+${NUM}`));
    if (altitudeMatch) {
        result.altitudeText = altitudeMatch[1];
        result.matchedAny = true;
    }

    // Temperature, e.g. "temperature 45 degrees" / "45 degrees out"
    const tempMatch = text.match(new RegExp(`(?:temperature(?:\\s+of)?\\s+)?${NUM}\\s*degrees?`));
    if (tempMatch) {
        result.temperatureText = tempMatch[1];
        result.matchedAny = true;
    }

    // Pressure, e.g. "pressure 29.9" / "pressure of 1013"
    const pressureMatch = text.match(new RegExp(`pressure(?:\\s+of)?\\s+${NUM}`));
    if (pressureMatch) {
        result.pressureText = pressureMatch[1];
        result.matchedAny = true;
    }

    return result;
}
