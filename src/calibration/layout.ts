// ============================================================
// src/calibration/layout.ts - Camera panel layout
// ============================================================
// ⚠️ CRITICAL: These values MUST be used consistently across ALL calibration steps
// (and hunt mode) to ensure pixel-perfect alignment of crosshair positions.
// DO NOT define local layout values in individual step files!

import { clampValue } from "./math";
import type { CameraLayoutConfig } from "./types";

// Layout constants - SINGLE SOURCE OF TRUTH
const LAYOUT_CONSTANTS = {
    // Side panel content width range (landscape). The notch / Dynamic Island inset on the
    // panel's side is added on top, so it never eats into the content.
    SIDE_PANEL_WIDTH_PERCENT: 0.38,
    SIDE_PANEL_WIDTH_MIN: 280,
    SIDE_PANEL_WIDTH_MAX: 340,

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
} as const;

/**
 * Get camera layout configuration - MUST be called with same params in ALL steps
 * to ensure consistent positioning across calibration flow.
 */
export function getCameraLayoutConfig(
    screenWidth: number,
    screenHeight: number,
    isLandscapeMode: boolean,
    safeAreaBottom: number,
    safeAreaRight = 0
): CameraLayoutConfig {
    const bottomPadding = Math.max(safeAreaBottom, LAYOUT_CONSTANTS.MIN_BOTTOM_PADDING);

    if (isLandscapeMode) {
        // Landscape: side panel on right
        const sidePanelWidth =
            clampValue(
                screenWidth * LAYOUT_CONSTANTS.SIDE_PANEL_WIDTH_PERCENT,
                LAYOUT_CONSTANTS.SIDE_PANEL_WIDTH_MIN,
                LAYOUT_CONSTANTS.SIDE_PANEL_WIDTH_MAX
            ) + safeAreaRight;

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
