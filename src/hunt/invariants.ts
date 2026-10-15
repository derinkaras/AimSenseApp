// ============================================================
// src/hunt/invariants.ts - Camera checks between calibration and hunt
// ============================================================
// Pixel positions from calibration are only valid if the camera setup is the same
// during the hunt (spec 14.2). Pure function, no React or store access.

import type { CameraLayoutConfig, CameraViewSize } from "../calibration/types";

/** Camera setup captured at calibration time. */
export interface CameraInvariants {
    zoom: number;
    screenRotation: number;
    mountOrientation: string;
    cameraViewSize: CameraViewSize;
    cameraAspectRatio: number;
    // ⚠️ CRITICAL: cameraLayout must be restored EXACTLY (zero tolerance)
    // This ensures scopeCenterPx and all pixel coordinates map correctly
    cameraLayout: CameraLayoutConfig;
}

export interface InvariantCheckResult {
    valid: boolean;
    errors: string[];
}

/** Compare the current camera setup with what was captured at calibration. */
export function validateCameraInvariants(
    invariants: CameraInvariants | null,
    currentZoom: number,
    currentRotation: number,
    currentOrientation: string,
    currentViewSize?: CameraViewSize
): InvariantCheckResult {
    const errors: string[] = [];

    if (!invariants) {
        return { valid: false, errors: ["No camera invariants stored from calibration"] };
    }

    // Check zoom (allow small tolerance for floating point)
    const zoomTolerance = 0.01;
    if (Math.abs(currentZoom - invariants.zoom) > zoomTolerance) {
        errors.push(
            `Zoom mismatch: expected ${invariants.zoom.toFixed(2)}, got ${currentZoom.toFixed(2)}`
        );
    }

    // Check rotation (allow 0.5 degree tolerance)
    const rotationTolerance = 0.5;
    if (Math.abs(currentRotation - invariants.screenRotation) > rotationTolerance) {
        errors.push(
            `Rotation mismatch: expected ${invariants.screenRotation}°, got ${currentRotation}°`
        );
    }

    // Check orientation
    if (currentOrientation !== invariants.mountOrientation) {
        errors.push(
            `Orientation mismatch: expected ${invariants.mountOrientation}, got ${currentOrientation}`
        );
    }

    // Check camera view size (spec 14.2 - critical for px/unit accuracy)
    if (currentViewSize && invariants.cameraViewSize) {
        const sizeTolerance = 2; // Allow 2px tolerance for rounding
        const widthDiff = Math.abs(currentViewSize.width - invariants.cameraViewSize.width);
        const heightDiff = Math.abs(currentViewSize.height - invariants.cameraViewSize.height);

        if (widthDiff > sizeTolerance || heightDiff > sizeTolerance) {
            errors.push(
                `View size mismatch: expected ${invariants.cameraViewSize.width}x${invariants.cameraViewSize.height}, ` +
                `got ${currentViewSize.width}x${currentViewSize.height}. Recalibration required.`
            );
        }

        // Also check aspect ratio (more sensitive to distortion)
        const currentAspect = currentViewSize.width / currentViewSize.height;
        const aspectTolerance = 0.01;
        if (Math.abs(currentAspect - invariants.cameraAspectRatio) > aspectTolerance) {
            errors.push(
                `Aspect ratio mismatch: expected ${invariants.cameraAspectRatio.toFixed(3)}, ` +
                `got ${currentAspect.toFixed(3)}. This will cause calibration inaccuracy.`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
