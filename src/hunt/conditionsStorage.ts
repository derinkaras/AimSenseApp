// ============================================================
// src/hunt/conditionsStorage.ts - Remember the air conditions between shots
// ============================================================
// Altitude, temperature and pressure rarely change from one shot to the next, so they are
// remembered on the phone. Wind changes every shot and is NOT saved.
// Saved per unit system so a value typed in feet is never read as meters.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NO_CONDITIONS, type ShotConditions } from "./conditions";

const keyFor = (isImperial: boolean) => `aimsense.hunt.conditions.${isImperial ? "imperial" : "metric"}`;

type SavedEnvironment = Pick<ShotConditions, "altitude" | "temperature" | "pressure">;

const numberOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Saved altitude / temperature / pressure (wind is always empty). */
export async function loadSavedConditions(isImperial: boolean): Promise<ShotConditions> {
    try {
        const raw = await AsyncStorage.getItem(keyFor(isImperial));
        if (!raw) return NO_CONDITIONS;
        const saved = JSON.parse(raw);
        return {
            ...NO_CONDITIONS,
            altitude: numberOrNull(saved?.altitude),
            temperature: numberOrNull(saved?.temperature),
            pressure: numberOrNull(saved?.pressure),
        };
    } catch {
        return NO_CONDITIONS;
    }
}

export async function saveConditions(isImperial: boolean, c: ShotConditions): Promise<void> {
    const environment: SavedEnvironment = {
        altitude: c.altitude,
        temperature: c.temperature,
        pressure: c.pressure,
    };
    try {
        await AsyncStorage.setItem(keyFor(isImperial), JSON.stringify(environment));
    } catch {
        // Not saving is harmless: the shooter just types them again next time.
    }
}
