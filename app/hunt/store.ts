// ============================================================
// app/hunt/store.ts - Hunt Mode State Management
// ============================================================
// Manages hunt session state including selected gun profile,
// and provides access to calibration data during active hunts.

import { create } from "zustand";
import type { GunProfile } from "@/app/types/apiTypes";
import type { CalibrationResult, CameraResolution, CameraLayoutConfig } from "@/app/calibration/exports";

// ==================== TYPES ====================

export type HuntSessionStatus =
    | "idle"           // No active hunt
    | "selecting_gun"  // User is choosing a gun profile
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
    // ⚠️ CRITICAL: cameraLayout must be restored EXACTLY (zero tolerance)
    // This ensures scopeCenterPx and all pixel coordinates map correctly
    cameraInvariants: {
        zoom: number;
        screenRotation: number;
        mountOrientation: string;
        cameraResolution: CameraResolution;
        cameraAspectRatio: number;
        cameraLayout: CameraLayoutConfig;
    } | null;
}

interface HuntActions {
    // Initialize hunt with calibration data
    initializeHunt: (calibrationResult: CalibrationResult) => void;

    // Gun selection
    selectGunProfile: (gun: GunProfile) => void;
    clearGunSelection: () => void;

    // Session control
    startHunt: () => void;
    pauseHunt: () => void;
    resumeHunt: () => void;
    endHunt: () => void;

    // Validation - now includes camera resolution (spec 14.2)
    validateCameraInvariants: (
        currentZoom: number,
        currentRotation: number,
        currentOrientation: string,
        currentResolution?: CameraResolution
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

export const useHuntStore = create<HuntStore>((set, get) => ({
    // Initial state
    session: { ...initialSession },
    cameraInvariants: null,

    // ═══════════════════════════════════════════════════════════
    // INITIALIZE HUNT
    // ═══════════════════════════════════════════════════════════

    initializeHunt: (calibrationResult) => {
        console.log("🎯 Initializing hunt with calibration:", {
            orientation: calibrationResult.mountOrientation,
            zoom: calibrationResult.cameraZoom,
            rotation: calibrationResult.screenRotation,
            resolution: calibrationResult.cameraResolution,
            aspectRatio: calibrationResult.cameraAspectRatio,
            cameraLayout: calibrationResult.cameraLayout,
            pxPerUnitX: calibrationResult.pxPerUnitX,
            pxPerUnitY: calibrationResult.pxPerUnitY,
        });

        set({
            session: {
                status: "selecting_gun",
                selectedGunProfile: null,
                calibrationResult,
                startedAt: null,
            },
            cameraInvariants: {
                zoom: calibrationResult.cameraZoom,
                screenRotation: calibrationResult.screenRotation,
                mountOrientation: calibrationResult.mountOrientation,
                cameraResolution: calibrationResult.cameraResolution,
                cameraAspectRatio: calibrationResult.cameraAspectRatio,
                cameraLayout: calibrationResult.cameraLayout,
            },
        });
    },

    // ═══════════════════════════════════════════════════════════
    // GUN SELECTION
    // ═══════════════════════════════════════════════════════════

    selectGunProfile: (gun) => {
        const { session } = get();

        if (session.status !== "selecting_gun") {
            console.warn("⚠️ Cannot select gun outside of selection phase");
            return;
        }

        console.log("🔫 Gun profile selected:", gun.name);

        set({
            session: {
                ...session,
                selectedGunProfile: gun,
            },
        });
    },

    clearGunSelection: () => {
        const { session } = get();

        set({
            session: {
                ...session,
                selectedGunProfile: null,
                status: "selecting_gun",
            },
        });
    },

    // ═══════════════════════════════════════════════════════════
    // SESSION CONTROL
    // ═══════════════════════════════════════════════════════════

    startHunt: () => {
        const { session } = get();

        if (!session.selectedGunProfile) {
            console.warn("⚠️ Cannot start hunt without selected gun");
            return;
        }

        if (!session.calibrationResult) {
            console.warn("⚠️ Cannot start hunt without calibration data");
            return;
        }

        console.log("🎯 Hunt started with:", session.selectedGunProfile.name);

        set({
            session: {
                ...session,
                status: "active",
                startedAt: Date.now(),
            },
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

    validateCameraInvariants: (currentZoom, currentRotation, currentOrientation, currentResolution) => {
        const { cameraInvariants } = get();
        const errors: string[] = [];

        if (!cameraInvariants) {
            return { valid: false, errors: ["No camera invariants stored from calibration"] };
        }

        // Check zoom (allow small tolerance for floating point)
        const zoomTolerance = 0.01;
        if (Math.abs(currentZoom - cameraInvariants.zoom) > zoomTolerance) {
            errors.push(
                `Zoom mismatch: expected ${cameraInvariants.zoom.toFixed(2)}, got ${currentZoom.toFixed(2)}`
            );
        }

        // Check rotation (allow 0.5 degree tolerance)
        const rotationTolerance = 0.5;
        if (Math.abs(currentRotation - cameraInvariants.screenRotation) > rotationTolerance) {
            errors.push(
                `Rotation mismatch: expected ${cameraInvariants.screenRotation}°, got ${currentRotation}°`
            );
        }

        // Check orientation
        if (currentOrientation !== cameraInvariants.mountOrientation) {
            errors.push(
                `Orientation mismatch: expected ${cameraInvariants.mountOrientation}, got ${currentOrientation}`
            );
        }

        // Check camera resolution (spec 14.2 - critical for px/unit accuracy)
        if (currentResolution && cameraInvariants.cameraResolution) {
            const resolutionTolerance = 2; // Allow 2px tolerance for rounding
            const widthDiff = Math.abs(currentResolution.width - cameraInvariants.cameraResolution.width);
            const heightDiff = Math.abs(currentResolution.height - cameraInvariants.cameraResolution.height);

            if (widthDiff > resolutionTolerance || heightDiff > resolutionTolerance) {
                errors.push(
                    `Resolution mismatch: expected ${cameraInvariants.cameraResolution.width}x${cameraInvariants.cameraResolution.height}, ` +
                    `got ${currentResolution.width}x${currentResolution.height}. Recalibration required.`
                );
            }

            // Also check aspect ratio (more sensitive to distortion)
            const currentAspect = currentResolution.width / currentResolution.height;
            const aspectTolerance = 0.01;
            if (Math.abs(currentAspect - cameraInvariants.cameraAspectRatio) > aspectTolerance) {
                errors.push(
                    `Aspect ratio mismatch: expected ${cameraInvariants.cameraAspectRatio.toFixed(3)}, ` +
                    `got ${currentAspect.toFixed(3)}. This will cause calibration inaccuracy.`
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    },

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
export const selectCanStartHunt = (s: HuntStore) =>
    s.session.selectedGunProfile !== null && s.session.calibrationResult !== null;