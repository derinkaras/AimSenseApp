// ============================================================
// src/calibration/geometry.ts - Touch and pixel geometry
// ============================================================
// Pure helpers for the calibration screens (previously copy-pasted in each step).

import { clampValue } from "./math";
import type { PixelPoint } from "./types";

export type Direction = "up" | "down" | "left" | "right";

/** Size of the camera view in pixels. */
export interface ViewSize {
    width: number;
    height: number;
}

/**
 * Move a point one step in a direction, keeping it inside the camera view.
 * Used by the micro-adjust arrows in steps 5, 6 and 7.
 */
export function nudgePoint(
    point: PixelPoint,
    direction: Direction,
    step: number,
    view: ViewSize
): PixelPoint {
    const next = { ...point };
    if (direction === "up") next.y = Math.max(0, point.y - step);
    if (direction === "down") next.y = Math.min(view.height, point.y + step);
    if (direction === "left") next.x = Math.max(0, point.x - step);
    if (direction === "right") next.x = Math.min(view.width, point.x + step);
    return next;
}

/** Round to the nearest 0.5 (the rotation slider works in half-degree steps). */
export function snapToHalfDegree(value: number): number {
    return Math.round(value * 2) / 2;
}

/**
 * Convert a tap on the (rotated) camera view to the 0-1 coordinates expected by the
 * camera's focus API. The preview is rotated by `rotationDeg` to align with the scope
 * crosshair, so the tap is rotated back around the view center first.
 */
export function tapToNormalizedCameraPoint(
    tapX: number,
    tapY: number,
    view: ViewSize,
    rotationDeg: number
): { normalizedX: number; normalizedY: number } {
    const centerX = view.width / 2;
    const centerY = view.height / 2;
    const angleRad = (-rotationDeg * Math.PI) / 180;
    const dx = tapX - centerX;
    const dy = tapY - centerY;
    const cameraX = centerX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
    const cameraY = centerY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    return {
        normalizedX: clampValue(cameraX / view.width, 0, 1),
        normalizedY: clampValue(cameraY / view.height, 0, 1),
    };
}
