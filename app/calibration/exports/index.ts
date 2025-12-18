import { create } from "zustand";
import * as ScreenOrientation from "expo-screen-orientation";

// ==================== TYPES ====================
export type MountOrientation =
    | "portrait"
    | "landscape-left"
    | "landscape-right"
    | "portrait-upside-down";

export type ScopeUnit = "MOA" | "MIL";

export type ClickSizeOption = {
    label: string;
    value: number;
};

export const MOA_CLICK_OPTIONS: ClickSizeOption[] = [
    { label: "¼ MOA", value: 0.25 },
    { label: "½ MOA", value: 0.5 },
    { label: "⅛ MOA", value: 0.125 },
];

export const MIL_CLICK_OPTIONS: ClickSizeOption[] = [
    { label: "0.1 mil", value: 0.1 },
    { label: "0.2 mil", value: 0.2 },
    { label: "0.05 mil", value: 0.05 },
];

// Default calibration click count (how many clicks we ask user to dial)
export const CALIBRATION_CLICK_COUNT = 20;

export interface ScopeCenterPx {
    x: number;
    y: number;
}

export interface CalibrationResult {
    mountOrientation: MountOrientation;
    roll0: number;
    pitch0: number;
    scopeUnit: ScopeUnit;
    clickSize: number;
    scopeCenterPx: ScopeCenterPx;
    pxPerUnitX: number;
    pxPerUnitY: number;
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
    toleranceDeg: 3.0,
    holdMs: 500,
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

export function getUnitLabel(unit: ScopeUnit): string {
    return unit === "MOA" ? "MOA" : "MIL";
}

export function getClickSizeLabel(unit: ScopeUnit, clickSize: number): string {
    const options = unit === "MOA" ? MOA_CLICK_OPTIONS : MIL_CLICK_OPTIONS;
    const option = options.find((o) => o.value === clickSize);
    return option?.label ?? `${clickSize} ${unit.toLowerCase()}`;
}

// Calculate angular movement in units from click count
export function clicksToUnits(clicks: number, clickSize: number): number {
    return clicks * clickSize;
}

// Calculate pixels per unit from movement
export function calculatePxPerUnit(
    deltaPx: number,
    clicks: number,
    clickSize: number
): number {
    const units = clicksToUnits(clicks, clickSize);
    if (units === 0) return 0;
    return Math.abs(deltaPx) / units;
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
    // Step 1: Phone orientation
    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;

    // Step 2: Scope setup
    scopeUnit: ScopeUnit;
    clickSize: number;

    // Step 3: Scope center alignment
    scopeCenterPx: ScopeCenterPx | null;

    // Step 4: Elevation calibration
    elevationStartPx: ScopeCenterPx | null;
    elevationEndPx: ScopeCenterPx | null;

    // Step 5: Windage calibration
    windageStartPx: ScopeCenterPx | null;
    windageEndPx: ScopeCenterPx | null;

    // Axes swapped: true if user turned wrong turret in step5
    // (turned windage when asked for elevation)
    // Step 6 will then calibrate elevation instead of windage
    axesSwapped: boolean;

    // Computed pixel scales
    pxPerUnitX: number;
    pxPerUnitY: number;

    // Step 6: Reference (baseline IMU)
    roll0: number;
    pitch0: number;

    // Saved result
    savedResult: CalibrationResult | null;
}

interface CalibrationActions {
    // Step 1: Phone orientation
    setPendingOrientation: (o: MountOrientation) => void;
    confirmOrientation: () => Promise<void>;

    // Step 2: Scope setup
    setScopeUnit: (unit: ScopeUnit) => void;
    setClickSize: (size: number) => void;

    // Step 3: Scope center
    setScopeCenterPx: (center: ScopeCenterPx) => void;

    // Step 4: Elevation calibration
    setElevationStartPx: (pos: ScopeCenterPx) => void;
    setElevationEndPx: (pos: ScopeCenterPx) => void;
    calculateElevationScale: () => void;

    // Step 5: Windage calibration
    setWindageStartPx: (pos: ScopeCenterPx) => void;
    setWindageEndPx: (pos: ScopeCenterPx) => void;
    calculateWindageScale: () => void;

    // Axes swap handling
    setAxesSwapped: (swapped: boolean) => void;

    // Step 6: Reference capture
    captureBaseline: (roll0: number, pitch0: number) => void;

    // Finish & reset
    finishCalibration: () => Promise<CalibrationResult>;
    resetCalibration: () => Promise<void>;
    clearSavedCalibration: () => Promise<void>;
}

type CalibrationStore = CalibrationState & CalibrationActions;

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    // Initial state
    mountOrientation: "portrait",
    pendingOrientation: "portrait",
    scopeUnit: "MOA",
    clickSize: 0.25, // Default ¼ MOA
    scopeCenterPx: null,
    elevationStartPx: null,
    elevationEndPx: null,
    windageStartPx: null,
    windageEndPx: null,
    axesSwapped: false,
    pxPerUnitX: 0,
    pxPerUnitY: 0,
    roll0: 0,
    pitch0: 0,
    savedResult: null,

    // Step 1: Phone orientation
    setPendingOrientation: (o) => set({ pendingOrientation: o }),

    confirmOrientation: async () => {
        const { pendingOrientation } = get();
        await lockOrientation(pendingOrientation);
        set({ mountOrientation: pendingOrientation });
    },

    // Step 2: Scope setup
    setScopeUnit: (unit) => {
        // Reset click size to default when unit changes
        const defaultClickSize = unit === "MOA" ? 0.25 : 0.1;
        set({ scopeUnit: unit, clickSize: defaultClickSize });
    },

    setClickSize: (size) => set({ clickSize: size }),

    // Step 3: Scope center
    setScopeCenterPx: (center) => set({ scopeCenterPx: center }),

    // Step 4: Elevation calibration
    setElevationStartPx: (pos) => set({ elevationStartPx: pos }),

    setElevationEndPx: (pos) => set({ elevationEndPx: pos }),

    calculateElevationScale: () => {
        const { elevationStartPx, elevationEndPx, clickSize } = get();
        if (!elevationStartPx || !elevationEndPx) return;

        // Calculate vertical pixel movement
        const deltaPxY = elevationEndPx.y - elevationStartPx.y;
        const pxPerUnitY = calculatePxPerUnit(deltaPxY, CALIBRATION_CLICK_COUNT, clickSize);
        set({ pxPerUnitY });
    },

    // Step 5: Windage calibration
    setWindageStartPx: (pos) => set({ windageStartPx: pos }),

    setWindageEndPx: (pos) => set({ windageEndPx: pos }),

    calculateWindageScale: () => {
        const { windageStartPx, windageEndPx, clickSize } = get();
        if (!windageStartPx || !windageEndPx) return;

        // Calculate horizontal pixel movement
        const deltaPxX = windageEndPx.x - windageStartPx.x;
        const pxPerUnitX = calculatePxPerUnit(deltaPxX, CALIBRATION_CLICK_COUNT, clickSize);
        set({ pxPerUnitX });
    },

    // Axes swap handling
    setAxesSwapped: (swapped) => set({ axesSwapped: swapped }),

    // Step 6: Reference capture
    captureBaseline: (roll0, pitch0) => set({ roll0, pitch0 }),

    // Finish calibration
    finishCalibration: async () => {
        const {
            mountOrientation,
            roll0,
            pitch0,
            scopeUnit,
            clickSize,
            scopeCenterPx,
            pxPerUnitX,
            pxPerUnitY,
        } = get();

        if (!scopeCenterPx) {
            throw new Error("Scope center not calibrated");
        }

        const result: CalibrationResult = {
            mountOrientation,
            roll0,
            pitch0,
            scopeUnit,
            clickSize,
            scopeCenterPx,
            pxPerUnitX,
            pxPerUnitY,
            calibratedAt: Date.now(),
        };

        await lockToPortrait();

        set({
            savedResult: result,
            pendingOrientation: "portrait",
            mountOrientation: "portrait",
            scopeCenterPx: null,
            elevationStartPx: null,
            elevationEndPx: null,
            windageStartPx: null,
            windageEndPx: null,
            axesSwapped: false,
            pxPerUnitX: 0,
            pxPerUnitY: 0,
            roll0: 0,
            pitch0: 0,
        });

        console.log("Calibration saved:", result);
        return result;
    },

    resetCalibration: async () => {
        await lockToPortrait();
        set({
            mountOrientation: "portrait",
            pendingOrientation: "portrait",
            scopeUnit: "MOA",
            clickSize: 0.25,
            scopeCenterPx: null,
            elevationStartPx: null,
            elevationEndPx: null,
            windageStartPx: null,
            windageEndPx: null,
            axesSwapped: false,
            pxPerUnitX: 0,
            pxPerUnitY: 0,
            roll0: 0,
            pitch0: 0,
        });
    },

    clearSavedCalibration: async () => {
        set({ savedResult: null });
    },
}));

// ==================== SELECTORS ====================
export const selectIsCalibrated = (s: CalibrationStore) => s.savedResult !== null;
export const selectSavedResult = (s: CalibrationStore) => s.savedResult;
export const selectMountOrientation = (s: CalibrationStore) => s.mountOrientation;
export const selectPendingOrientation = (s: CalibrationStore) => s.pendingOrientation;
export const selectScopeUnit = (s: CalibrationStore) => s.scopeUnit;
export const selectClickSize = (s: CalibrationStore) => s.clickSize;
export const selectScopeCenterPx = (s: CalibrationStore) => s.scopeCenterPx;
export const selectPxPerUnitX = (s: CalibrationStore) => s.pxPerUnitX;
export const selectPxPerUnitY = (s: CalibrationStore) => s.pxPerUnitY;
export const selectRoll0 = (s: CalibrationStore) => s.roll0;
export const selectPitch0 = (s: CalibrationStore) => s.pitch0;
export const selectAxesSwapped = (s: CalibrationStore) => s.axesSwapped;