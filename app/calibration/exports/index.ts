import { create } from "zustand";
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
    return prev === Infinity || Number.isNaN(prev) ? next : prev * (1 - alpha) + next * alpha;
}

// ==================== ORIENTATION SERVICES ====================
const ORIENTATION_LOCKS: Record<MountOrientation, ScreenOrientation.OrientationLock> = {
    portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
    "landscape-left": ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
    "landscape-right": ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
    // If you want true upside-down support later, you can switch to other locks,
    // but keeping portrait-up is usually safest.
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

// ==================== STORE (SESSION-ONLY) ====================
interface CalibrationState {
    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;
    levelZeroRollDeg: number;
    savedResult: CalibrationResult | null;
}

interface CalibrationActions {
    setPendingOrientation: (o: MountOrientation) => void;
    confirmOrientation: () => Promise<void>;
    captureLevelReading: (levelDeg: number) => void;
    finishCalibration: () => Promise<CalibrationResult>;
    resetCalibration: () => Promise<void>;
    clearSavedCalibration: () => Promise<void>;
}

type CalibrationStore = CalibrationState & CalibrationActions;

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    // State (in-memory only -> resets on reload)
    mountOrientation: "portrait",
    pendingOrientation: "portrait",
    levelZeroRollDeg: 0,
    savedResult: null,

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

        // Return to portrait after finishing
        await lockToPortrait();

        // Keep savedResult in memory for the rest of the app session
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
        set({ savedResult: null });
    },
}));

// Selectors
export const selectIsCalibrated = (s: CalibrationStore) => s.savedResult !== null;
export const selectSavedResult = (s: CalibrationStore) => s.savedResult;
export const selectMountOrientation = (s: CalibrationStore) => s.mountOrientation;
export const selectPendingOrientation = (s: CalibrationStore) => s.pendingOrientation;
