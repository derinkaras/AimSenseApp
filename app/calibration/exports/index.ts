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
    roll0: number;      // raw IMU roll baseline
    pitch0: number;     // raw IMU pitch baseline
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
    toleranceDeg: 3.0,      // ≤ 3° gating condition for baseline capture
    holdMs: 500,            // 0.4-0.6s stability requirement
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
    roll0: number;          // raw IMU roll baseline
    pitch0: number;         // raw IMU pitch baseline
    savedResult: CalibrationResult | null;
}

interface CalibrationActions {
    setPendingOrientation: (o: MountOrientation) => void;
    confirmOrientation: () => Promise<void>;
    captureBaseline: (roll0: number, pitch0: number) => void;
    finishCalibration: () => Promise<CalibrationResult>;
    resetCalibration: () => Promise<void>;
    clearSavedCalibration: () => Promise<void>;
}

type CalibrationStore = CalibrationState & CalibrationActions;

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    // State (in-memory only -> resets on reload)
    mountOrientation: "portrait",
    pendingOrientation: "portrait",
    roll0: 0,
    pitch0: 0,
    savedResult: null,

    // Actions
    setPendingOrientation: (o) => set({ pendingOrientation: o }),

    confirmOrientation: async () => {
        const { pendingOrientation } = get();
        await lockOrientation(pendingOrientation);
        set({ mountOrientation: pendingOrientation });
    },

    // Capture raw IMU roll and pitch as baseline reference
    captureBaseline: (roll0, pitch0) => set({ roll0, pitch0 }),

    finishCalibration: async () => {
        const { mountOrientation, roll0, pitch0 } = get();
        const result: CalibrationResult = {
            mountOrientation,
            roll0,
            pitch0,
            calibratedAt: Date.now(),
        };

        // Return to portrait after finishing
        await lockToPortrait();

        // Keep savedResult in memory for the rest of the app session
        set({
            savedResult: result,
            pendingOrientation: "portrait",
            mountOrientation: "portrait",
            roll0: 0,
            pitch0: 0,
        });

        return result;
    },

    resetCalibration: async () => {
        await lockToPortrait();
        set({
            mountOrientation: "portrait",
            pendingOrientation: "portrait",
            roll0: 0,
            pitch0: 0,
        });
    },

    clearSavedCalibration: async () => {
        set({ savedResult: null });
    },
}));

// ==================== SELECTORS ====================
// IMPORTANT: Do NOT return new objects from selectors - causes infinite loops!
// Use primitive selectors and call them separately in components.

export const selectIsCalibrated = (s: CalibrationStore) => s.savedResult !== null;
export const selectSavedResult = (s: CalibrationStore) => s.savedResult;
export const selectMountOrientation = (s: CalibrationStore) => s.mountOrientation;
export const selectPendingOrientation = (s: CalibrationStore) => s.pendingOrientation;

// Separate primitive selectors for roll0 and pitch0 (avoids creating new object)
export const selectRoll0 = (s: CalibrationStore) => s.roll0;
export const selectPitch0 = (s: CalibrationStore) => s.pitch0;