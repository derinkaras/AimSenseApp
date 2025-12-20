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

// ==================== CALIBRATION CLICK COUNT ====================
// Target angular movement for calibration
export const TARGET_MOA_MOVEMENT = 4;  // 4 MOA total movement for MOA scopes
export const TARGET_MIL_MOVEMENT = 1;  // 1 MIL total movement for MIL scopes

/**
 * Calculate how many clicks to request based on scope unit and click size.
 * This ensures the target angular movement (4 MOA or 1 MIL) is achieved.
 *
 * Examples:
 * - ¼ MOA (0.25): 4 / 0.25 = 16 clicks
 * - ½ MOA (0.5): 4 / 0.5 = 8 clicks
 * - ⅛ MOA (0.125): 4 / 0.125 = 32 clicks
 * - 0.1 MIL: 1 / 0.1 = 10 clicks
 * - 0.2 MIL: 1 / 0.2 = 5 clicks
 * - 0.05 MIL: 1 / 0.05 = 20 clicks
 */
export function getCalibrationClickCount(scopeUnit: ScopeUnit, clickSize: number): number {
    const targetMovement = scopeUnit === "MOA" ? TARGET_MOA_MOVEMENT : TARGET_MIL_MOVEMENT;
    return Math.round(targetMovement / clickSize);
}

/**
 * Get the target movement string for display
 */
export function getTargetMovementLabel(scopeUnit: ScopeUnit): string {
    return scopeUnit === "MOA" ? `${TARGET_MOA_MOVEMENT} MOA` : `${TARGET_MIL_MOVEMENT} MIL`;
}

// Legacy constant - kept for backward compatibility but should use getCalibrationClickCount()
export const CALIBRATION_CLICK_COUNT = 20;

export interface ScopeCenterPx {
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

export interface CalibrationResult {
    mountOrientation: MountOrientation;
    roll0: number;
    pitch0: number;
    scopeUnit: ScopeUnit;
    clickSize: number;
    // Camera settings
    cameraZoom: number;
    focusPoint: FocusPoint | null;
    screenRotation: number; // Degrees to rotate camera view to align with crosshair
    // Scope center
    scopeCenterPx: ScopeCenterPx;
    // Elevation calibration positions (for debugging/verification)
    elevationStartPx: ScopeCenterPx;
    elevationEndPx: ScopeCenterPx;
    // Windage calibration positions (for debugging/verification)
    windageStartPx: ScopeCenterPx;
    windageEndPx: ScopeCenterPx;
    // Computed pixel scales
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

// ==================== CAMERA LAYOUT CONFIG ====================
// ⚠️ CRITICAL: These values MUST be used consistently across ALL calibration steps
// to ensure pixel-perfect alignment of crosshair positions.
// DO NOT define local layout values in individual step files!

/** Clamp a value between min and max */
export function clampValue(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
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

// Layout constants - SINGLE SOURCE OF TRUTH
const LAYOUT_CONSTANTS = {
    // Side panel width range (landscape)
    SIDE_PANEL_WIDTH_PERCENT: 0.34,
    SIDE_PANEL_WIDTH_MIN: 220,
    SIDE_PANEL_WIDTH_MAX: 280,

    // Bottom panel height (portrait) - FIXED
    BOTTOM_PANEL_HEIGHT: 240,

    // Minimum bottom padding
    MIN_BOTTOM_PADDING: 8,

    // Magnifier sizing
    MAGNIFIER_LANDSCAPE_PERCENT: 0.12,
    MAGNIFIER_PORTRAIT_PERCENT: 0.22,
    MAGNIFIER_LANDSCAPE_MIN: 84,
    MAGNIFIER_LANDSCAPE_MAX: 120,
    MAGNIFIER_PORTRAIT_MIN: 100,
    MAGNIFIER_PORTRAIT_MAX: 140,

    // Magnifier positioning
    MAGNIFIER_MARGIN: 10,
    MAGNIFIER_OFFSET: 70,
    LEFT_SAFE_PAD_PERCENT: 0.06,
    LEFT_SAFE_PAD_MIN: 24,
    LEFT_SAFE_PAD_MAX: 44,
} as const;

/**
 * Get camera layout configuration - MUST be called with same params in ALL steps
 * to ensure consistent positioning across calibration flow.
 */
export function getCameraLayoutConfig(
    screenWidth: number,
    screenHeight: number,
    isLandscapeMode: boolean,
    safeAreaBottom: number
): CameraLayoutConfig {
    const bottomPadding = Math.max(safeAreaBottom, LAYOUT_CONSTANTS.MIN_BOTTOM_PADDING);

    if (isLandscapeMode) {
        // Landscape: side panel on right
        const sidePanelWidth = clampValue(
            screenWidth * LAYOUT_CONSTANTS.SIDE_PANEL_WIDTH_PERCENT,
            LAYOUT_CONSTANTS.SIDE_PANEL_WIDTH_MIN,
            LAYOUT_CONSTANTS.SIDE_PANEL_WIDTH_MAX
        );

        const magnifierSize = clampValue(
            screenHeight * LAYOUT_CONSTANTS.MAGNIFIER_LANDSCAPE_PERCENT,
            LAYOUT_CONSTANTS.MAGNIFIER_LANDSCAPE_MIN,
            LAYOUT_CONSTANTS.MAGNIFIER_LANDSCAPE_MAX
        );

        return {
            sidePanelWidth,
            bottomPanelHeight: 0,
            bottomPanelTotalHeight: 0,
            bottomPadding,
            cameraInsets: {
                padRight: sidePanelWidth,
                padBottom: 0,
            },
            magnifierSize,
            isLandscapeMode: true,
        };
    } else {
        // Portrait: bottom panel
        const bottomPanelHeight = LAYOUT_CONSTANTS.BOTTOM_PANEL_HEIGHT;
        const bottomPanelTotalHeight = bottomPanelHeight + bottomPadding;

        const magnifierSize = clampValue(
            screenWidth * LAYOUT_CONSTANTS.MAGNIFIER_PORTRAIT_PERCENT,
            LAYOUT_CONSTANTS.MAGNIFIER_PORTRAIT_MIN,
            LAYOUT_CONSTANTS.MAGNIFIER_PORTRAIT_MAX
        );

        return {
            sidePanelWidth: 0,
            bottomPanelHeight,
            bottomPanelTotalHeight,
            bottomPadding,
            cameraInsets: {
                padRight: 0,
                padBottom: bottomPanelTotalHeight,
            },
            magnifierSize,
            isLandscapeMode: false,
        };
    }
}

/**
 * Calculate magnifier position that stays within camera bounds
 * and respects safe areas.
 */
export function getMagnifierPosition(
    tapX: number,
    tapY: number,
    containerWidth: number,
    containerHeight: number,
    magnifierSize: number,
    screenWidth: number,
    safeAreaTop: number
): { x: number; y: number } {
    const halfMag = magnifierSize / 2;
    const margin = LAYOUT_CONSTANTS.MAGNIFIER_MARGIN;
    const offset = LAYOUT_CONSTANTS.MAGNIFIER_OFFSET;

    // Calculate left safe padding
    const leftSafePad = clampValue(
        screenWidth * LAYOUT_CONSTANTS.LEFT_SAFE_PAD_PERCENT,
        LAYOUT_CONSTANTS.LEFT_SAFE_PAD_MIN,
        LAYOUT_CONSTANTS.LEFT_SAFE_PAD_MAX
    );

    // Default: offset from tap position
    let magX = tapX + offset;
    let magY = tapY - offset;

    // Flip horizontally if would go off right edge
    if (magX + halfMag + margin > containerWidth) {
        magX = tapX - offset - magnifierSize;
    }

    // Ensure minimum left padding
    if (magX - halfMag < leftSafePad) {
        magX = leftSafePad + halfMag + margin;
    }

    // Clamp to container bounds
    magX = clampValue(magX, halfMag + margin, containerWidth - halfMag - margin);
    magY = clampValue(magY, safeAreaTop + halfMag + margin, containerHeight - halfMag - margin);

    return { x: magX, y: magY };
}

// ==================== ORIENTATION LOCKING ====================
export async function lockOrientation(orientation: MountOrientation) {
    const lockMap: Record<MountOrientation, ScreenOrientation.OrientationLock> = {
        portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
        "landscape-left": ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
        "landscape-right": ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
        "portrait-upside-down": ScreenOrientation.OrientationLock.PORTRAIT_DOWN,
    };
    await ScreenOrientation.lockAsync(lockMap[orientation]);
}

export async function lockToPortrait() {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

// ==================== STORE ====================
interface CalibrationState {
    // Mount orientation
    mountOrientation: MountOrientation;
    pendingOrientation: MountOrientation;

    // Scope settings
    scopeUnit: ScopeUnit;
    clickSize: number;

    // Camera settings
    cameraZoom: number;
    focusPoint: FocusPoint | null;
    screenRotation: number;
    cameraLayout: CameraLayoutConfig | null;

    // Calibration points
    scopeCenterPx: ScopeCenterPx | null;
    elevationStartPx: ScopeCenterPx | null;
    elevationEndPx: ScopeCenterPx | null;
    windageStartPx: ScopeCenterPx | null;
    windageEndPx: ScopeCenterPx | null;

    // Axes swap flag (if user turned wrong turret in step6)
    axesSwapped: boolean;

    // Computed scales
    pxPerUnitX: number;
    pxPerUnitY: number;

    // IMU baseline
    roll0: number;
    pitch0: number;

    // Saved result
    savedResult: CalibrationResult | null;
}

interface CalibrationActions {
    // Step 1: Orientation
    setPendingOrientation: (orientation: MountOrientation) => void;
    confirmOrientation: () => Promise<void>;

    // Step 2: Scope settings
    setScopeUnit: (unit: ScopeUnit) => void;
    setClickSize: (size: number) => void;

    // Step 3: Camera settings
    setCameraZoom: (zoom: number) => void;
    setFocusPoint: (point: FocusPoint | null) => void;

    // Step 4: IMU baseline + Camera layout
    captureBaseline: (roll: number, pitch: number) => void;
    setCameraLayout: (layout: CameraLayoutConfig) => void;

    // Step 5: Scope center + rotation
    setScopeCenterPx: (pos: ScopeCenterPx) => void;
    setScreenRotation: (degrees: number) => void;

    // Step 6: Elevation calibration
    setElevationStartPx: (pos: ScopeCenterPx) => void;
    setElevationEndPx: (pos: ScopeCenterPx) => void;
    calculateElevationScale: () => void;

    // Step 7: Windage calibration
    setWindageStartPx: (pos: ScopeCenterPx) => void;
    setWindageEndPx: (pos: ScopeCenterPx) => void;
    calculateWindageScale: () => void;

    // Axes swap handling
    setAxesSwapped: (swapped: boolean) => void;

    // Finish calibration
    finishCalibration: () => Promise<CalibrationResult>;
    beginHunt: () => Promise<CalibrationResult>;
    resetCalibration: () => Promise<void>;
    clearSavedCalibration: () => Promise<void>;
}

type CalibrationStore = CalibrationState & CalibrationActions;

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    // Initial state
    mountOrientation: "portrait",
    pendingOrientation: "portrait",
    scopeUnit: "MOA",
    clickSize: 0.25,
    cameraZoom: 0,
    focusPoint: null,
    screenRotation: 0,
    cameraLayout: null,
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

    // Step 1: Orientation
    setPendingOrientation: (orientation) => set({ pendingOrientation: orientation }),

    confirmOrientation: async () => {
        const { pendingOrientation } = get();
        await lockOrientation(pendingOrientation);
        set({ mountOrientation: pendingOrientation });
    },

    // Step 2: Scope settings
    setScopeUnit: (unit) => {
        // Reset click size to default for the new unit
        const defaultClickSize = unit === "MOA" ? 0.25 : 0.1;
        set({ scopeUnit: unit, clickSize: defaultClickSize });
    },

    setClickSize: (size) => set({ clickSize: size }),

    // Step 3: Camera settings
    setCameraZoom: (zoom) => set({ cameraZoom: zoom }),

    setFocusPoint: (point) => set({ focusPoint: point }),

    // Step 4: IMU baseline + Camera layout
    captureBaseline: (roll, pitch) => set({ roll0: roll, pitch0: pitch }),

    setCameraLayout: (layout) => set({ cameraLayout: layout }),

    // Step 5: Scope center + rotation
    setScopeCenterPx: (pos) => set({ scopeCenterPx: pos }),

    setScreenRotation: (degrees) => set({ screenRotation: degrees }),

    // Step 6: Elevation calibration
    setElevationStartPx: (pos) => set({ elevationStartPx: pos }),

    setElevationEndPx: (pos) => set({ elevationEndPx: pos }),

    calculateElevationScale: () => {
        const { elevationStartPx, elevationEndPx, clickSize, scopeUnit, scopeCenterPx } = get();
        if (!elevationStartPx || !elevationEndPx) {
            console.warn("⚠️ calculateElevationScale: Missing data", {
                elevationStartPx,
                elevationEndPx,
                scopeCenterPx
            });
            return;
        }

        // Get dynamic click count based on scope unit and click size
        const clickCount = getCalibrationClickCount(scopeUnit, clickSize);

        // Calculate vertical pixel movement from scope center (the true zero)
        const deltaPxY = elevationEndPx.y - scopeCenterPx!.y;
        const pxPerUnitY = calculatePxPerUnit(deltaPxY, clickCount, clickSize);
        console.log("📐 Elevation scale calculated:", {
            scopeCenter: scopeCenterPx,
            elevationEnd: elevationEndPx,
            deltaPxY,
            clickCount,
            clickSize,
            pxPerUnitY
        });
        set({ pxPerUnitY });
    },

    // Step 7: Windage calibration
    setWindageStartPx: (pos) => set({ windageStartPx: pos }),

    setWindageEndPx: (pos) => set({ windageEndPx: pos }),

    calculateWindageScale: () => {
        const { windageStartPx, windageEndPx, clickSize, scopeUnit, scopeCenterPx } = get();
        if (!windageStartPx || !windageEndPx) {
            console.warn("⚠️ calculateWindageScale: Missing data", {
                windageStartPx,
                windageEndPx,
                scopeCenterPx
            });
            return;
        }

        // Get dynamic click count based on scope unit and click size
        const clickCount = getCalibrationClickCount(scopeUnit, clickSize);

        // Calculate horizontal pixel movement from scope center (the true zero)
        const deltaPxX = windageEndPx.x - scopeCenterPx!.x;
        const pxPerUnitX = calculatePxPerUnit(deltaPxX, clickCount, clickSize);
        console.log("📐 Windage scale calculated:", {
            scopeCenter: scopeCenterPx,
            windageEnd: windageEndPx,
            deltaPxX,
            clickCount,
            clickSize,
            pxPerUnitX
        });
        set({ pxPerUnitX });
    },

    // Axes swap handling
    setAxesSwapped: (swapped) => set({ axesSwapped: swapped }),

    // Finish calibration (saves and resets camera settings - returns to tabs)
    finishCalibration: async () => {
        const {
            mountOrientation,
            roll0,
            pitch0,
            scopeUnit,
            clickSize,
            cameraZoom,
            focusPoint,
            screenRotation,
            scopeCenterPx,
            elevationStartPx,
            elevationEndPx,
            windageStartPx,
            windageEndPx,
            pxPerUnitX,
            pxPerUnitY,
        } = get();

        if (!scopeCenterPx) {
            throw new Error("Scope center not calibrated");
        }
        if (!elevationStartPx || !elevationEndPx) {
            throw new Error("Elevation not calibrated");
        }
        if (!windageStartPx || !windageEndPx) {
            throw new Error("Windage not calibrated");
        }

        const result: CalibrationResult = {
            mountOrientation,
            roll0,
            pitch0,
            scopeUnit,
            clickSize,
            cameraZoom,
            focusPoint,
            screenRotation,
            scopeCenterPx,
            elevationStartPx,
            elevationEndPx,
            windageStartPx,
            windageEndPx,
            pxPerUnitX,
            pxPerUnitY,
            calibratedAt: Date.now(),
        };

        await lockToPortrait();

        set({
            savedResult: result,
            pendingOrientation: "portrait",
            mountOrientation: "portrait",
            cameraZoom: 0,
            focusPoint: null,
            screenRotation: 0,
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

        // Format readable calibration summary
        const totalClicks = getCalibrationClickCount(result.scopeUnit, result.clickSize);
        const totalUnits = totalClicks * result.clickSize;

        // Both elevation and windage are measured from scope center
        // (user dials back to zero after each calibration step)
        const elevDeltaX = result.elevationEndPx.x - result.scopeCenterPx.x;
        const elevDeltaY = result.elevationEndPx.y - result.scopeCenterPx.y;
        const windDeltaX = result.windageEndPx.x - result.scopeCenterPx.x;
        const windDeltaY = result.windageEndPx.y - result.scopeCenterPx.y;

        console.log(`
══════════════════════════════════════════════════════════════
                    CALIBRATION COMPLETE                       
══════════════════════════════════════════════════════════════
  DEVICE SETUP                                                 
    Mount Orientation:  ${result.mountOrientation}
    Screen Rotation:    ${result.screenRotation}°
    Camera Zoom:        ${(result.cameraZoom * 100).toFixed(0)}%
    Focus Point:        (${result.focusPoint?.x ?? 'N/A'}, ${result.focusPoint?.y ?? 'N/A'})
──────────────────────────────────────────────────────────────
  SCOPE SETTINGS                                               
    Unit:               ${result.scopeUnit}
    Click Size:         ${result.clickSize} ${result.scopeUnit}/click
──────────────────────────────────────────────────────────────
  CALIBRATION POINTS (from Scope Center)                       
    Scope Center:       (${result.scopeCenterPx.x}, ${result.scopeCenterPx.y})
    After ${totalClicks} Elev clicks:  (${result.elevationEndPx.x}, ${result.elevationEndPx.y})  Δ(${elevDeltaX}, ${elevDeltaY})
    After ${totalClicks} Wind clicks:  (${result.windageEndPx.x}, ${result.windageEndPx.y})  Δ(${windDeltaX}, ${windDeltaY})
──────────────────────────────────────────────────────────────
  COMPUTED SCALE (${totalClicks} clicks = ${totalUnits} ${result.scopeUnit})
    Pixels per ${result.scopeUnit} (X):  ${result.pxPerUnitX.toFixed(2)}
    Pixels per ${result.scopeUnit} (Y):  ${result.pxPerUnitY.toFixed(2)}
──────────────────────────────────────────────────────────────
  IMU REFERENCE                                                
    Roll₀:              ${result.roll0.toFixed(2)}°
    Pitch₀:             ${result.pitch0.toFixed(2)}°
══════════════════════════════════════════════════════════════
        `);
        return result;
    },

    // ═══════════════════════════════════════════════════════════════
    // BEGIN HUNT - Save calibration but PRESERVE camera settings
    // ═══════════════════════════════════════════════════════════════
    // Unlike finishCalibration(), this does NOT reset camera settings.
    // This allows Hunt Mode to use the exact same camera configuration
    // that was established during calibration.
    beginHunt: async () => {
        const {
            mountOrientation,
            roll0,
            pitch0,
            scopeUnit,
            clickSize,
            cameraZoom,
            focusPoint,
            screenRotation,
            scopeCenterPx,
            elevationStartPx,
            elevationEndPx,
            windageStartPx,
            windageEndPx,
            pxPerUnitX,
            pxPerUnitY,
        } = get();

        if (!scopeCenterPx) {
            throw new Error("Scope center not calibrated");
        }
        if (!elevationStartPx || !elevationEndPx) {
            throw new Error("Elevation not calibrated");
        }
        if (!windageStartPx || !windageEndPx) {
            throw new Error("Windage not calibrated");
        }

        const result: CalibrationResult = {
            mountOrientation,
            roll0,
            pitch0,
            scopeUnit,
            clickSize,
            cameraZoom,
            focusPoint,
            screenRotation,
            scopeCenterPx,
            elevationStartPx,
            elevationEndPx,
            windageStartPx,
            windageEndPx,
            pxPerUnitX,
            pxPerUnitY,
            calibratedAt: Date.now(),
        };

        // ⚠️ CRITICAL DIFFERENCE FROM finishCalibration():
        // We save the result but DO NOT reset camera settings or lock to portrait.
        // This preserves camera config for Hunt Mode.
        set({ savedResult: result });

        // Format readable calibration summary
        const totalClicks = getCalibrationClickCount(result.scopeUnit, result.clickSize);
        const totalUnits = totalClicks * result.clickSize;

        const elevDeltaX = result.elevationEndPx.x - result.scopeCenterPx.x;
        const elevDeltaY = result.elevationEndPx.y - result.scopeCenterPx.y;
        const windDeltaX = result.windageEndPx.x - result.scopeCenterPx.x;
        const windDeltaY = result.windageEndPx.y - result.scopeCenterPx.y;

        console.log(`
══════════════════════════════════════════════════════════════
                CALIBRATION COMPLETE → HUNT MODE               
══════════════════════════════════════════════════════════════
  DEVICE SETUP (PRESERVED FOR HUNT)                            
    Mount Orientation:  ${result.mountOrientation}
    Screen Rotation:    ${result.screenRotation}°
    Camera Zoom:        ${(result.cameraZoom * 100).toFixed(0)}%
    Focus Point:        (${result.focusPoint?.x ?? 'N/A'}, ${result.focusPoint?.y ?? 'N/A'})
──────────────────────────────────────────────────────────────
  SCOPE SETTINGS                                               
    Unit:               ${result.scopeUnit}
    Click Size:         ${result.clickSize} ${result.scopeUnit}/click
──────────────────────────────────────────────────────────────
  CALIBRATION POINTS (from Scope Center)                       
    Scope Center:       (${result.scopeCenterPx.x}, ${result.scopeCenterPx.y})
    After ${totalClicks} Elev clicks:  (${result.elevationEndPx.x}, ${result.elevationEndPx.y})  Δ(${elevDeltaX}, ${elevDeltaY})
    After ${totalClicks} Wind clicks:  (${result.windageEndPx.x}, ${result.windageEndPx.y})  Δ(${windDeltaX}, ${windDeltaY})
──────────────────────────────────────────────────────────────
  COMPUTED SCALE (${totalClicks} clicks = ${totalUnits} ${result.scopeUnit})
    Pixels per ${result.scopeUnit} (X):  ${result.pxPerUnitX.toFixed(2)}
    Pixels per ${result.scopeUnit} (Y):  ${result.pxPerUnitY.toFixed(2)}
──────────────────────────────────────────────────────────────
  IMU REFERENCE                                                
    Roll₀:              ${result.roll0.toFixed(2)}°
    Pitch₀:             ${result.pitch0.toFixed(2)}°
══════════════════════════════════════════════════════════════
        `);

        return result;
    },

    resetCalibration: async () => {
        await lockToPortrait();
        set({
            mountOrientation: "portrait",
            pendingOrientation: "portrait",
            scopeUnit: "MOA",
            clickSize: 0.25,
            cameraZoom: 0,
            focusPoint: null,
            screenRotation: 0,
            cameraLayout: null, // Reset camera layout
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
export const selectCameraZoom = (s: CalibrationStore) => s.cameraZoom;
export const selectFocusPoint = (s: CalibrationStore) => s.focusPoint;
export const selectScreenRotation = (s: CalibrationStore) => s.screenRotation;
export const selectCameraLayout = (s: CalibrationStore) => s.cameraLayout; // ⚠️ Use this in all steps
export const selectScopeCenterPx = (s: CalibrationStore) => s.scopeCenterPx;
export const selectElevationStartPx = (s: CalibrationStore) => s.elevationStartPx;
export const selectElevationEndPx = (s: CalibrationStore) => s.elevationEndPx;
export const selectWindageStartPx = (s: CalibrationStore) => s.windageStartPx;
export const selectWindageEndPx = (s: CalibrationStore) => s.windageEndPx;
export const selectPxPerUnitX = (s: CalibrationStore) => s.pxPerUnitX;
export const selectPxPerUnitY = (s: CalibrationStore) => s.pxPerUnitY;
export const selectRoll0 = (s: CalibrationStore) => s.roll0;
export const selectPitch0 = (s: CalibrationStore) => s.pitch0;
export const selectAxesSwapped = (s: CalibrationStore) => s.axesSwapped;