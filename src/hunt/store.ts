// ============================================================
// src/hunt/store.ts - Hunt Mode State Management
// ============================================================
// Manages hunt session state including selected gun profile,
// and provides access to calibration data during active hunts.

import { create } from "zustand";
import type { GunProfile } from "@/types/apiTypes";
import type { CalibrationResult, CameraViewSize } from "@/calibration";
import { validateCameraInvariants, type CameraInvariants } from "./invariants";

// ==================== TYPES ====================

export type HuntSessionStatus =
    | "idle"           // No active hunt
    | "active"         // Hunt is active with selected gun
    | "paused";        // Hunt paused (backgrounded, etc.)

export interface HuntSession {
    status: HuntSessionStatus;
    selectedGunProfile: GunProfile | null;
    calibrationResult: CalibrationResult | null;
    startedAt: number | null;
}

// ==================== STORE ====================

interface HuntState {
    // Current session
    session: HuntSession;

    // Camera invariants from calibration (must match during hunt) - spec 14.2
    cameraInvariants: CameraInvariants | null;
}

interface HuntActions {
    // Start hunting straight away: calibration knows the rifle, so no separate gun selection
    startSession: (calibrationResult: CalibrationResult, gun: GunProfile) => void;

    // Session control
    pauseHunt: () => void;
    resumeHunt: () => void;
    endHunt: () => void;

    // Validation - includes camera view size (spec 14.2)
    validateCameraInvariants: (
        currentZoom: number,
        currentRotation: number,
        currentOrientation: string,
        currentViewSize?: CameraViewSize
    ) => { valid: boolean; errors: string[] };

    // Reset
    resetHuntStore: () => void;
}

type HuntStore = HuntState & HuntActions;

const initialSession: HuntSession = {
    status: "idle",
    selectedGunProfile: null,
    calibrationResult: null,
    startedAt: null,
};

/** The camera setup hunt mode must match (spec 14.2). */
const invariantsFrom = (calibrationResult: CalibrationResult): CameraInvariants => ({
    zoom: calibrationResult.cameraZoom,
    screenRotation: calibrationResult.screenRotation,
    mountOrientation: calibrationResult.mountOrientation,
    cameraViewSize: calibrationResult.cameraViewSize,
    cameraAspectRatio: calibrationResult.cameraAspectRatio,
    cameraLayout: calibrationResult.cameraLayout,
});

export const useHuntStore = create<HuntStore>((set, get) => ({
    // Initial state
    session: { ...initialSession },
    cameraInvariants: null,

    // ═══════════════════════════════════════════════════════════
    // START HUNT
    // ═══════════════════════════════════════════════════════════

    startSession: (calibrationResult, gun) => {
        console.log("🎯 Hunt started with:", gun.name);
        set({
            session: {
                status: "active",
                selectedGunProfile: gun,
                calibrationResult,
                startedAt: Date.now(),
            },
            cameraInvariants: invariantsFrom(calibrationResult),
        });
    },

    pauseHunt: () => {
        const { session } = get();

        if (session.status !== "active") return;

        set({
            session: {
                ...session,
                status: "paused",
            },
        });
    },

    resumeHunt: () => {
        const { session } = get();

        if (session.status !== "paused") return;

        set({
            session: {
                ...session,
                status: "active",
            },
        });
    },

    endHunt: () => {
        console.log("🏁 Hunt ended");

        set({
            session: { ...initialSession },
            cameraInvariants: null,
        });
    },

    // ═══════════════════════════════════════════════════════════
    // VALIDATION (spec 14.2)
    // ═══════════════════════════════════════════════════════════

    validateCameraInvariants: (currentZoom, currentRotation, currentOrientation, currentViewSize) =>
        validateCameraInvariants(
            get().cameraInvariants,
            currentZoom,
            currentRotation,
            currentOrientation,
            currentViewSize
        ),

    // ═══════════════════════════════════════════════════════════
    // RESET
    // ═══════════════════════════════════════════════════════════

    resetHuntStore: () => {
        set({
            session: { ...initialSession },
            cameraInvariants: null,
        });
    },
}));

// ==================== SELECTORS ====================

export const selectHuntSession = (s: HuntStore) => s.session;
export const selectHuntStatus = (s: HuntStore) => s.session.status;
export const selectSelectedGun = (s: HuntStore) => s.session.selectedGunProfile;
export const selectCalibrationResult = (s: HuntStore) => s.session.calibrationResult;
export const selectCameraInvariants = (s: HuntStore) => s.cameraInvariants;
export const selectCameraLayout = (s: HuntStore) => s.cameraInvariants?.cameraLayout ?? null;
export const selectIsHuntActive = (s: HuntStore) => s.session.status === "active";
