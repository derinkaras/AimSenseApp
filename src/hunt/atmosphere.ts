// ============================================================
// src/hunt/atmosphere.ts - Air density and speed of sound
// ============================================================
// Thinner air (high altitude, heat, low pressure) means less drag, so the bullet drops
// less. This turns whatever the shooter knows about the conditions into the two numbers
// the ballistics solver needs. Everything is optional: with nothing entered you get
// standard sea-level air, which is what the solver assumed before this existed.
//
// Model: International Standard Atmosphere (ISA), dry air. Humidity is ignored
// (it changes air density by well under 1%).

/** Conditions the shooter may know. Any field left out falls back to standard air for the altitude. */
export interface AtmosphereInput {
    /** Altitude above sea level, feet */
    altitudeFt?: number;
    /** Air temperature, °F. Default: the standard temperature for the altitude */
    temperatureF?: number;
    /** Station pressure (the actual pressure where you are, NOT sea-level-corrected), inHg. Default: standard for the altitude */
    pressureInHg?: number;
}

export interface Atmosphere {
    /** Air density relative to standard sea-level air (1.0 = standard) */
    densityRatio: number;
    /** Speed of sound, ft/s */
    speedOfSound: number;
}

/** Standard sea-level air (59°F, 29.92 inHg). */
export const STANDARD_ATMOSPHERE: Atmosphere = {
    densityRatio: 1,
    speedOfSound: 1116.45,
};

const SEA_LEVEL_TEMP_R = 518.67; // 59°F in Rankine
export const SEA_LEVEL_PRESSURE_INHG = 29.92126;
export const SEA_LEVEL_TEMP_F = 59;
const RANKINE_OFFSET = 459.67; // °F -> Rankine
const LAPSE_RATE_R_PER_FT = 0.0035662; // standard temperature drop with altitude (ISA troposphere)
const PRESSURE_EXPONENT = 5.25588; // standard pressure change with altitude
const SPEED_OF_SOUND_COEFFICIENT = 49.0223; // c = 49.0223 * sqrt(temperature in Rankine), ft/s, dry air

// Ranges the model is valid for (troposphere); inputs are clamped so a typo cannot produce nonsense.
const MIN_ALTITUDE_FT = -1500;
const MAX_ALTITUDE_FT = 36000;
const MIN_TEMPERATURE_F = -60;
const MAX_TEMPERATURE_F = 140;
const MIN_PRESSURE_INHG = 10;
const MAX_PRESSURE_INHG = 34;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const usable = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Air density and speed of sound for the given conditions.
 * Returns exactly STANDARD_ATMOSPHERE when nothing usable was entered.
 */
export function getAtmosphere(input: AtmosphereInput | null | undefined): Atmosphere {
    if (!input) return STANDARD_ATMOSPHERE;

    const hasAltitude = usable(input.altitudeFt);
    const hasTemperature = usable(input.temperatureF);
    const hasPressure = usable(input.pressureInHg);
    if (!hasAltitude && !hasTemperature && !hasPressure) return STANDARD_ATMOSPHERE;

    const altitudeFt = hasAltitude ? clamp(input.altitudeFt as number, MIN_ALTITUDE_FT, MAX_ALTITUDE_FT) : 0;

    // Standard temperature and pressure at this altitude
    const standardTempR = SEA_LEVEL_TEMP_R - LAPSE_RATE_R_PER_FT * altitudeFt;
    const standardPressure = SEA_LEVEL_PRESSURE_INHG * Math.pow(standardTempR / SEA_LEVEL_TEMP_R, PRESSURE_EXPONENT);

    const tempR = hasTemperature
        ? clamp(input.temperatureF as number, MIN_TEMPERATURE_F, MAX_TEMPERATURE_F) + RANKINE_OFFSET
        : standardTempR;
    const pressure = hasPressure
        ? clamp(input.pressureInHg as number, MIN_PRESSURE_INHG, MAX_PRESSURE_INHG)
        : standardPressure;

    return {
        // density ∝ pressure / temperature
        densityRatio: (pressure / SEA_LEVEL_PRESSURE_INHG) * (SEA_LEVEL_TEMP_R / tempR),
        speedOfSound: SPEED_OF_SOUND_COEFFICIENT * Math.sqrt(tempR),
    };
}
