import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalibrationResult } from "./types";

const KEY = "aimsense:calibration:v1";

export async function loadCalibration(): Promise<CalibrationResult | null> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as CalibrationResult;
    } catch {
        return null;
    }
}

export async function saveCalibration(result: CalibrationResult) {
    await AsyncStorage.setItem(KEY, JSON.stringify(result));
}

export async function clearCalibration() {
    await AsyncStorage.removeItem(KEY);
}
