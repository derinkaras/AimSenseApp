// ============================================================
// src/calibration/store.ts - Calibration flow state (Zustand)
// ============================================================
// The flow is three screens: Rifle (pick a rifle, scope details, phone mount) -> Line Up
// (zoom, rotate, mark the crosshair, level baseline) -> Measure (dial the elevation turret,
// tap where the mark went). finish() turns the state into a CalibrationResult, saves it for
// the rifle, and hands it to hunt mode.
//
// A rifle that was calibrated before skips Measure: beginRecheck() restores the saved result
// and Line Up only re-marks the crosshair and the level baseline.

import { create } from "zustand";
import type { GunProfile } from "@/types/apiTypes";
import { getCalibrationClickCount, evaluateElevationMove, type ElevationCheck } from "./math";
import { lockOrientation, lockToPortrait } from "./orientation";
import { saveCalibration } from "./savedCalibration";
import { logCalibrationSummary } from "./summary";
import type {
    CalibrationResult,
    CameraLayoutConfig,
    CameraViewSize,
    FocusPoint,
    MountOrientation,
    PixelPoint,
    ScopeSetup,
    UnitVector,
} from "./types";

// ==================== STATE ====================

/** What the Line Up screen captures. */
export interface LineUpCapture {
    cameraZoom: number;
    focusPoint: FocusPoint | null;
    screenRotation: number;
    scopeCenterPx: PixelPoint;
    cameraViewSize: CameraViewSize;
    cameraLayout: CameraLayoutConfig;
    roll0: number;
    pitch0: number;
}

interface CalibrationState {
    gun: GunProfile | null;
    scope: ScopeSetup | null;
    mountOrientation: MountOrientation;

    // Line Up
    cameraZoom: number;
    focusPoint: FocusPoint | null;
    screenRotation: number;
    cameraViewSize: CameraViewSize | null;
    cameraLayout: CameraLayoutConfig | null;
    scopeCenterPx: PixelPoint | null;
    roll0: number;
    pitch0: number;

    // Measure
    elevationEndPx: PixelPoint | null;
    pxPerUnit: number;
    upAxis: UnitVector | null;

    // True when re-checking a saved calibration: Line Up finishes straight away
    isRecheck: boolean;
}

const initialState: CalibrationState = {
    gun: null,
    scope: null,
    mountOrientation: "portrait",
    cameraZoom: 0,
    focusPoint: null,
    screenRotation: 0,
    cameraViewSize: null,
    cameraLayout: null,
    scopeCenterPx: null,
    roll0: 0,
    pitch0: 0,
    elevationEndPx: null,
    pxPerUnit: 0,
    upAxis: null,
    isRecheck: false,
};

// ==================== ACTIONS ====================

interface CalibrationActions {
    /** Start a full calibration for a rifle. Locks the screen to the phone mount. */
    beginSetup: (gun: GunProfile, scope: ScopeSetup, mountOrientation: MountOrientation) => Promise<void>;
    /** Re-check a saved calibration: everything is restored, Line Up re-marks the crosshair. */
    beginRecheck: (gun: GunProfile, saved: CalibrationResult) => Promise<void>;
    /** Line Up confirmed. */
    captureLineUp: (capture: LineUpCapture) => void;
    /** Measure: the user tapped where the mark went. Stored only when the check passes. */
    recordElevation: (markPx: PixelPoint) => ElevationCheck;
    /** Build the result, save it for the rifle, and return it for hunt mode. */
    finish: () => Promise<CalibrationResult>;
    /** Wipe everything (after a hunt ends, or to start over). */
    resetCalibration: () => Promise<void>;
}

type CalibrationStore = CalibrationState & CalibrationActions;

// ==================== STORE ====================

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    ...initialState,

    beginSetup: async (gun, scope, mountOrientation) => {
        await lockOrientation(mountOrientation);
        set({ ...initialState, gun, scope, mountOrientation });
    },

    beginRecheck: async (gun, saved) => {
        await lockOrientation(saved.mountOrientation);
        set({
            ...initialState,
            gun,
            scope: {
                scopeUnit: saved.scopeUnit,
                clickSize: saved.clickSize,
                scopeMagnification: saved.scopeMagnification,
            },
            mountOrientation: saved.mountOrientation,
            cameraZoom: saved.cameraZoom,
            focusPoint: saved.focusPoint,
            screenRotation: saved.screenRotation,
            cameraViewSize: saved.cameraViewSize,
            cameraLayout: saved.cameraLayout,
            scopeCenterPx: saved.scopeCenterPx,
            roll0: saved.roll0,
            pitch0: saved.pitch0,
            elevationEndPx: saved.elevationEndPx,
            pxPerUnit: saved.pxPerUnit,
            upAxis: saved.upAxis,
            isRecheck: true,
        });
    },

    captureLineUp: (capture) => set({ ...capture }),

    recordElevation: (markPx) => {
        const { scopeCenterPx, scope } = get();
        if (!scopeCenterPx || !scope) {
            return { ok: false, problem: "tooSmall", movedPx: 0 };
        }
        const unitsDialed = getCalibrationClickCount(scope.scopeUnit, scope.clickSize) * scope.clickSize;
        const check = evaluateElevationMove(scopeCenterPx, markPx, unitsDialed);
        if (check.ok) {
            set({ elevationEndPx: markPx, pxPerUnit: check.pxPerUnit, upAxis: check.upAxis });
        }
        return check;
    },

    finish: async () => {
        const s = get();
        if (!s.gun?.id || !s.scope) throw new Error("No rifle selected");
        if (!s.scopeCenterPx || !s.cameraViewSize || !s.cameraLayout) throw new Error("Crosshair not lined up");
        if (!s.elevationEndPx || !s.upAxis || !(s.pxPerUnit > 0)) throw new Error("Turret not measured");

        const result: CalibrationResult = {
            gunId: s.gun.id,
            ...s.scope,
            mountOrientation: s.mountOrientation,
            roll0: s.roll0,
            pitch0: s.pitch0,
            cameraZoom: s.cameraZoom,
            focusPoint: s.focusPoint,
            screenRotation: s.screenRotation,
            cameraViewSize: s.cameraViewSize,
            cameraAspectRatio: s.cameraViewSize.width / s.cameraViewSize.height,
            cameraLayout: s.cameraLayout,
            scopeCenterPx: s.scopeCenterPx,
            elevationEndPx: s.elevationEndPx,
            pxPerUnit: s.pxPerUnit,
            upAxis: s.upAxis,
            calibratedAt: Date.now(),
        };

        await saveCalibration(result);
        logCalibrationSummary(result);
        return result;
    },

    resetCalibration: async () => {
        await lockToPortrait();
        // Clears the in-progress flow; calibrations saved on the device stay
        set(initialState);
    },
}));
