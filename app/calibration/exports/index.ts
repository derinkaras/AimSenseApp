import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";

// ==================== TYPES ====================
export type MountOrientation =
    | "portrait"
    | "landscape-left"
    | "landscape-right"
    | "portrait-upside-down";

export interface CalibrationResult {
    mountOrientation: MountOrientation;
    levelZeroRollDeg: number;
    calibratedAt: number;
}

export interface TiltLevelConfig {
    toleranceDeg: number;
    holdMs: number;
    zeroEnterDeg: number;
    zeroExitDeg: number;
    smoothingAlpha: number;
    flatEnterGz: number;
    flatExitGz: number;
}

export const DEFAULT_TILT_CONFIG: TiltLevelConfig = {
    toleranceDeg: 0.5,
    holdMs: 600,
    zeroEnterDeg: 0.12,
    zeroExitDeg: 0.6,
    smoothingAlpha: 0.18,
    flatEnterGz: 0.85,
    flatExitGz: 0.75,
};

// ==================== HELPERS ====================
export function isLandscape(orientation: MountOrientation): boolean {
    return orientation.includes("landscape");
}

export function getOrientationLabel(orientation: MountOrientation): string {
    const labels: Record<MountOrientation, string> = {
        portrait: "Portrait",
        "landscape-left": "Landscape Left",
        "landscape-right": "Landscape Right",
        "portrait-upside-down": "Portrait Upside Down",
    };
    return labels[orientation];
}

export function rotationFor(orientation: MountOrientation): string {
    const rotations: Record<MountOrientation, string> = {
        portrait: "0deg",
        "landscape-left": "90deg",
        "landscape-right": "-90deg",
        "portrait-upside-down": "180deg",
    };
    return rotations[orientation];
}

export function smooth(prev: number, next: number, alpha = 0.2): number {
    return prev === Infinity || Number.isNaN(prev)
        ? next
        : prev * (1 - alpha) + next * alpha;
}

// ==================== PERSISTENCE ====================
const STORAGE_KEY = "aimsense:calibration:v2";

export async function loadCalibration(): Promise<CalibrationResult | null> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export async function saveCalibration(result: CalibrationResult): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export async function clearCalibration(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
}

// ==================== ORIENTATION SERVICES ====================
const ORIENTATION_LOCKS: Record<MountOrientation, ScreenOrientation.OrientationLock> = {
    portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
    "landscape-left": ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
    "landscape-right": ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
    "portrait-upside-down": ScreenOrientation.OrientationLock.PORTRAIT_UP,
};

export async function lockOrientation(orientation: MountOrientation): Promise<void> {
    try {
        await ScreenOrientation.lockAsync(ORIENTATION_LOCKS[orientation]);
    } catch (err) {
        console.warn(`Failed to lock to ${orientation}:`, err);
    }
}

export async function lockToPortrait(): Promise<void> {
    try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (err) {
        console.warn("Failed to lock to portrait:", err);
    }
}

// ==================== STORE ====================
interface CalibrationState {
    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;
    levelZeroRollDeg: number;
    savedResult: CalibrationResult | null;
    isHydrated: boolean;
}

interface CalibrationActions {
    setPendingOrientation: (o: MountOrientation) => void;
    confirmOrientation: () => Promise<void>;
    captureLevelReading: (levelDeg: number) => void;
    finishCalibration: () => Promise<CalibrationResult>;
    resetCalibration: () => Promise<void>;
    clearSavedCalibration: () => Promise<void>;
    hydrate: () => Promise<void>;
}



type CalibrationStore = CalibrationState & CalibrationActions;

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    // State
    mountOrientation: "portrait",
    pendingOrientation: "portrait",
    levelZeroRollDeg: 0,
    savedResult: null,
    isHydrated: false,

    // Actions
    setPendingOrientation: (o) => set({ pendingOrientation: o }),

    confirmOrientation: async () => {
        const { pendingOrientation } = get();
        await lockOrientation(pendingOrientation);
        set({ mountOrientation: pendingOrientation });
    },

    captureLevelReading: (levelDeg) => set({ levelZeroRollDeg: levelDeg }),

    finishCalibration: async () => {
        const { mountOrientation, levelZeroRollDeg } = get();
        const result: CalibrationResult = {
            mountOrientation,
            levelZeroRollDeg,
            calibratedAt: Date.now(),
        };
        await saveCalibration(result);
        await lockToPortrait();
        set({
            savedResult: result,
            pendingOrientation: "portrait",
            mountOrientation: "portrait",
            levelZeroRollDeg: 0,
        });
        return result;
    },

    resetCalibration: async () => {
        await lockToPortrait();
        set({
            mountOrientation: "portrait",
            pendingOrientation: "portrait",
            levelZeroRollDeg: 0,
        });
    },

    clearSavedCalibration: async () => {
        await clearCalibration();
        set({ savedResult: null });
    },

    hydrate: async () => {
        const saved = await loadCalibration();
        set({ savedResult: saved, isHydrated: true });
    },
}));

// Selectors
export const selectIsCalibrated = (s: CalibrationStore) => s.savedResult !== null;
export const selectSavedResult = (s: CalibrationStore) => s.savedResult;
export const selectMountOrientation = (s: CalibrationStore) => s.mountOrientation;
export const selectPendingOrientation = (s: CalibrationStore) => s.pendingOrientation;