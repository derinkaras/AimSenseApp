// ============================================================
// src/help/helpStorage.ts - Remember which help the user has already seen
// ============================================================
// If storage can't be read, we show the help again. That is the safe direction to fail in.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BRIEFING_VERSION } from "./content";

const CALIBRATION_INTRO_KEY = "aimsense.help.calibrationIntroSeen";
const HUNT_BRIEFING_KEY = "aimsense.help.huntBriefingVersion";

/** Has the calibration intro already been shown once? */
export async function hasSeenCalibrationIntro(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(CALIBRATION_INTRO_KEY)) === "1";
    } catch {
        return false;
    }
}

export async function markCalibrationIntroSeen(): Promise<void> {
    try {
        await AsyncStorage.setItem(CALIBRATION_INTRO_KEY, "1");
    } catch {
        // Harmless: the intro just shows once more.
    }
}

/** Has the user accepted the current version of the before-you-hunt briefing? */
export async function hasAcceptedHuntBriefing(): Promise<boolean> {
    try {
        const saved = Number(await AsyncStorage.getItem(HUNT_BRIEFING_KEY));
        return Number.isFinite(saved) && saved >= BRIEFING_VERSION;
    } catch {
        return false;
    }
}

export async function acceptHuntBriefing(): Promise<void> {
    try {
        await AsyncStorage.setItem(HUNT_BRIEFING_KEY, String(BRIEFING_VERSION));
    } catch {
        // Harmless: the briefing just shows again next time.
    }
}
