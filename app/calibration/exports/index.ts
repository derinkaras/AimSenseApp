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
 * This is the ONLY function that should be used for layout calculations.
 *
 * @param screenWidth - Screen width from useWindowDimensions
 * @param screenHeight - Screen height from useWindowDimensions (unused but kept for future)
 * @param isLandscapeMode - Whether device is in landscape orientation
 * @param bottomSafeArea - Bottom safe area inset (insets.bottom)
 */
export function getCameraLayoutConfig(
    screenWidth: number,
    _screenHeight: number,
    isLandscapeMode: boolean,
    bottomSafeArea: number
): CameraLayoutConfig {
    const C = LAYOUT_CONSTANTS;

    // Bottom padding with minimum
    const bottomPadding = Math.max(bottomSafeArea, C.MIN_BOTTOM_PADDING);

    // Side panel width for landscape
    const sidePanelWidth = clampValue(
        Math.round(screenWidth * C.SIDE_PANEL_WIDTH_PERCENT),
        C.SIDE_PANEL_WIDTH_MIN,
        C.SIDE_PANEL_WIDTH_MAX
    );

    // Bottom panel heights for portrait
    const bottomPanelHeight = C.BOTTOM_PANEL_HEIGHT;
    const bottomPanelTotalHeight = bottomPanelHeight + bottomPadding;

    // Camera insets depend on orientation
    const cameraInsets = isLandscapeMode
        ? { padRight: sidePanelWidth, padBottom: 0 }
        : { padRight: 0, padBottom: bottomPanelTotalHeight };

    // Magnifier size (scales with screen, different ranges for landscape/portrait)
    const magnifierBase = isLandscapeMode
        ? screenWidth * C.MAGNIFIER_LANDSCAPE_PERCENT
        : screenWidth * C.MAGNIFIER_PORTRAIT_PERCENT;
    const magnifierSize = clampValue(
        Math.round(magnifierBase),
        isLandscapeMode ? C.MAGNIFIER_LANDSCAPE_MIN : C.MAGNIFIER_PORTRAIT_MIN,
        isLandscapeMode ? C.MAGNIFIER_LANDSCAPE_MAX : C.MAGNIFIER_PORTRAIT_MAX
    );

    return {
        sidePanelWidth,
        bottomPanelHeight,
        bottomPanelTotalHeight,
        bottomPadding,
        cameraInsets,
        magnifierSize,
        isLandscapeMode,
    };
}

/**
 * Get magnifier position within camera bounds
 * Uses centralized constants for consistent positioning.
 */
export function getMagnifierPosition(
    crosshairX: number,
    crosshairY: number,
    cameraWidth: number,
    cameraHeight: number,
    magnifierSize: number,
    screenWidth: number,
    topInset: number
): { left: number; top: number } {
    const C = LAYOUT_CONSTANTS;

    // Safe padding from left edge (scales with device)
    const leftSafePad = clampValue(
        Math.round(screenWidth * C.LEFT_SAFE_PAD_PERCENT),
        C.LEFT_SAFE_PAD_MIN,
        C.LEFT_SAFE_PAD_MAX
    );

    // Default position: above and centered on crosshair
    let left = crosshairX - magnifierSize / 2;
    let top = crosshairY - magnifierSize - C.MAGNIFIER_OFFSET;

    // If too high, flip to below crosshair
    if (top < topInset + C.MAGNIFIER_MARGIN) {
        top = crosshairY + C.MAGNIFIER_OFFSET;
    }

    // Clamp horizontal position
    const leftMin = leftSafePad;
    const leftMax = Math.max(leftMin, cameraWidth - magnifierSize - C.MAGNIFIER_MARGIN);
    left = clampValue(left, leftMin, leftMax);

    // Clamp vertical position
    const topMin = topInset + C.MAGNIFIER_MARGIN;
    const topMax = Math.max(topMin, cameraHeight - magnifierSize - C.MAGNIFIER_MARGIN);
    top = clampValue(top, topMin, topMax);

    return { left, top };
}

/**
 * React hook for camera layout - convenience wrapper
 * Use this in components to get consistent layout config.
 *
 * Usage:
 * const { width, height } = useWindowDimensions();
 * const insets = useSafeAreaInsets();
 * const layoutConfig = useCameraLayout(width, height, isLandscapeMode, insets.bottom);
 */
export function createCameraLayoutConfig(
    width: number,
    height: number,
    isLandscapeMode: boolean,
    bottomInset: number
): CameraLayoutConfig {
    return getCameraLayoutConfig(width, height, isLandscapeMode, bottomInset);
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

    // Step 2: Reference (baseline IMU)
    roll0: number;
    pitch0: number;

    // Step 3: Scope setup
    scopeUnit: ScopeUnit;
    clickSize: number;

    // Step 4: Camera zoom, focus, and LAYOUT (captured once, used everywhere)
    cameraZoom: number;
    focusPoint: FocusPoint | null;
    screenRotation: number; // Degrees to rotate camera view
    cameraLayout: CameraLayoutConfig | null; // ⚠️ CRITICAL: Set once in step4, read in all subsequent steps

    // Step 5: Scope center alignment
    scopeCenterPx: ScopeCenterPx | null;

    // Step 6: Elevation calibration
    elevationStartPx: ScopeCenterPx | null;
    elevationEndPx: ScopeCenterPx | null;

    // Step 7: Windage calibration
    windageStartPx: ScopeCenterPx | null;
    windageEndPx: ScopeCenterPx | null;

    // Axes swapped: true if user turned wrong turret in step6
    // (turned windage when asked for elevation)
    // Step 7 will then calibrate elevation instead of windage
    axesSwapped: boolean;

    // Computed pixel scales
    pxPerUnitX: number;
    pxPerUnitY: number;

    // Saved result
    savedResult: CalibrationResult | null;
}

interface CalibrationActions {
    // Step 1: Phone orientation
    setPendingOrientation: (o: MountOrientation) => void;
    confirmOrientation: () => Promise<void>;

    // Step 2: Reference capture
    captureBaseline: (roll0: number, pitch0: number) => void;

    // Step 3: Scope setup
    setScopeUnit: (unit: ScopeUnit) => void;
    setClickSize: (size: number) => void;

    // Step 4: Camera zoom, focus, and layout
    setCameraZoom: (zoom: number) => void;
    setFocusPoint: (point: FocusPoint | null) => void;
    setScreenRotation: (degrees: number) => void;
    setCameraLayout: (config: CameraLayoutConfig) => void; // ⚠️ Set once, read everywhere

    // Step 5: Scope center
    setScopeCenterPx: (center: ScopeCenterPx) => void;

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

    // Finish & reset
    finishCalibration: () => Promise<CalibrationResult>;
    beginHunt: () => Promise<CalibrationResult>; // NEW: Save calibration and transition to hunt mode
    resetCalibration: () => Promise<void>;
    clearSavedCalibration: () => Promise<void>;
}

type CalibrationStore = CalibrationState & CalibrationActions;

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
    // Initial state
    mountOrientation: "portrait",
    pendingOrientation: "portrait",
    roll0: 0,
    pitch0: 0,
    scopeUnit: "MOA",
    clickSize: 0.25, // Default ¼ MOA
    cameraZoom: 0,
    focusPoint: null,
    screenRotation: 0,
    cameraLayout: null, // ⚠️ Set once in step4, read everywhere
    scopeCenterPx: null,
    elevationStartPx: null,
    elevationEndPx: null,
    windageStartPx: null,
    windageEndPx: null,
    axesSwapped: false,
    pxPerUnitX: 0,
    pxPerUnitY: 0,
    savedResult: null,

    // Step 1: Phone orientation
    setPendingOrientation: (o) => set({ pendingOrientation: o }),

    confirmOrientation: async () => {
        const { pendingOrientation } = get();
        await lockOrientation(pendingOrientation);
        set({ mountOrientation: pendingOrientation });
    },

    // Step 2: Reference capture
    captureBaseline: (roll0, pitch0) => set({ roll0, pitch0 }),

    // Step 3: Scope setup
    setScopeUnit: (unit) => {
        // Reset click size to default when unit changes
        const defaultClickSize = unit === "MOA" ? 0.25 : 0.1;
        set({ scopeUnit: unit, clickSize: defaultClickSize });
    },

    setClickSize: (size) => set({ clickSize: size }),

    // Step 4: Camera zoom, focus, and layout
    setCameraZoom: (zoom) => set({ cameraZoom: zoom }),
    setFocusPoint: (point) => set({ focusPoint: point }),
    setScreenRotation: (degrees) => set({ screenRotation: degrees }),
    setCameraLayout: (config) => {
        console.log("📐 Camera layout stored:", config);
        set({ cameraLayout: config });
    },

    // Step 5: Scope center
    setScopeCenterPx: (center) => set({ scopeCenterPx: center }),

    // Step 6: Elevation calibration
    setElevationStartPx: (pos) => set({ elevationStartPx: pos }),

    setElevationEndPx: (pos) => set({ elevationEndPx: pos }),

    calculateElevationScale: () => {
        const { elevationStartPx, elevationEndPx, clickSize, scopeCenterPx } = get();
        if (!elevationStartPx || !elevationEndPx) {
            console.warn("⚠️ calculateElevationScale: Missing data", {
                elevationStartPx,
                elevationEndPx,
                scopeCenterPx
            });
            return;
        }

        // Calculate vertical pixel movement from scope center (the true zero)
        const deltaPxY = elevationEndPx.y - scopeCenterPx!.y;
        const pxPerUnitY = calculatePxPerUnit(deltaPxY, CALIBRATION_CLICK_COUNT, clickSize);
        console.log("📐 Elevation scale calculated:", {
            scopeCenter: scopeCenterPx,
            elevationEnd: elevationEndPx,
            deltaPxY,
            pxPerUnitY
        });
        set({ pxPerUnitY });
    },

    // Step 7: Windage calibration
    setWindageStartPx: (pos) => set({ windageStartPx: pos }),

    setWindageEndPx: (pos) => set({ windageEndPx: pos }),

    calculateWindageScale: () => {
        const { windageStartPx, windageEndPx, clickSize, scopeCenterPx } = get();
        if (!windageStartPx || !windageEndPx) {
            console.warn("⚠️ calculateWindageScale: Missing data", {
                windageStartPx,
                windageEndPx,
                scopeCenterPx
            });
            return;
        }

        // Calculate horizontal pixel movement from scope center (the true zero)
        const deltaPxX = windageEndPx.x - scopeCenterPx!.x;
        const pxPerUnitX = calculatePxPerUnit(deltaPxX, CALIBRATION_CLICK_COUNT, clickSize);
        console.log("📐 Windage scale calculated:", {
            scopeCenter: scopeCenterPx,
            windageEnd: windageEndPx,
            deltaPxX,
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
        const totalClicks = CALIBRATION_CLICK_COUNT;
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
        const totalClicks = CALIBRATION_CLICK_COUNT;
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