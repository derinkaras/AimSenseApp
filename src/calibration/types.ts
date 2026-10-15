// ============================================================
// src/calibration/types.ts - Shared calibration types
// ============================================================
// Types only, no runtime code. Everything here is re-exported from "@/calibration".

/** How the phone is mounted on the scope. */
export type MountOrientation =
    | "portrait"
    | "landscape-left"
    | "landscape-right"
    | "portrait-upside-down";

/** Angular unit printed on the scope's turrets. */
export type ScopeUnit = "MOA" | "MIL";

/** A point in screen pixels, relative to the camera view. */
export interface PixelPoint {
    x: number;
    y: number;
}

export interface FocusPoint {
    // Pixel coordinates (for UI display)
    x: number;
    y: number;
    // Normalized coordinates (0-1) for camera focus API
    normalizedX: number;
    normalizedY: number;
}

/** Size of the on-screen camera area in layout pixels (not the camera sensor resolution). */
export interface CameraViewSize {
    width: number;
    height: number;
}

/** Camera layout configuration for calibration steps */
export interface CameraLayoutConfig {
    /** Width of side panel in landscape mode */
    sidePanelWidth: number;
    /** Height of bottom panel in portrait mode (without safe area) */
    bottomPanelHeight: number;
    /** Total bottom panel height including safe area padding */
    bottomPanelTotalHeight: number;
    /** Bottom padding (safe area or minimum) */
    bottomPadding: number;
    /** Camera insets (how much to shrink camera view for UI panels) */
    cameraInsets: {
        padRight: number;
        padBottom: number;
    };
    /** Magnifier size */
    magnifierSize: number;
    /** Whether in landscape mode */
    isLandscapeMode: boolean;
}

/** A direction on screen, length 1 (screen y grows downward). */
export interface UnitVector {
    x: number;
    y: number;
}

/** The scope details calibration needs. They live on the gun profile. */
export interface ScopeSetup {
    scopeUnit: ScopeUnit;
    clickSize: number;
    /** Magnification the rifle is hunted at. The pixel scale is only valid at this magnification. */
    scopeMagnification: number;
}

/**
 * Everything calibration produces for one rifle. Hunt mode reads this and never changes it.
 *
 * Only the elevation turret is measured: screen pixels are square, so one MOA spans the
 * same pixels sideways as vertically, and dialing RIGHT always moves the image at a right
 * angle to dialing UP. One measurement gives the scale and both directions.
 */
export interface CalibrationResult extends ScopeSetup {
    gunId: string;
    mountOrientation: MountOrientation;
    // IMU reading with the rifle level (cant and shot angle are measured from these)
    roll0: number;
    pitch0: number;
    // Camera settings
    cameraZoom: number;
    focusPoint: FocusPoint | null;
    screenRotation: number; // Degrees the preview is rotated so the crosshair looks square on screen
    // Camera invariants for validation (spec 14.2)
    cameraViewSize: CameraViewSize;
    cameraAspectRatio: number; // width / height
    // Camera layout - MUST be restored exactly in hunt mode (zero tolerance)
    // This defines the exact panel dimensions that determine camera view bounds
    cameraLayout: CameraLayoutConfig;
    // The scope's crosshair on screen (the zero)
    scopeCenterPx: PixelPoint;
    // Where the target mark moved to after the elevation turret was dialed UP (shown when re-checking)
    elevationEndPx: PixelPoint;
    // Screen pixels per MOA or MIL
    pxPerUnit: number;
    // Screen direction the IMAGE moves when the elevation turret is dialed UP
    upAxis: UnitVector;
    calibratedAt: number;
}

/** Tuning knobs for the useTiltLevel hook. */
export interface TiltLevelConfig {
    toleranceDeg: number;
    holdMs: number;
    zeroEnterDeg: number;
    zeroExitDeg: number;
    smoothingAlpha: number;
    flatEnterGz: number;
    flatExitGz: number;
}
