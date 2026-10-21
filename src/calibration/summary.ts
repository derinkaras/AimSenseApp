// ============================================================
// src/calibration/summary.ts - Console summary of a finished calibration
// ============================================================

import type { CalibrationResult } from "./types";

/** Print a readable calibration summary (debug aid, no side effects). */
export function logCalibrationSummary(result: CalibrationResult): void {
    // The dialed amount varies (the user may have been asked to dial further), so recover it
    const unitsDialed =
        Math.hypot(result.elevationEndPx.x - result.scopeCenterPx.x, result.elevationEndPx.y - result.scopeCenterPx.y) /
        result.pxPerUnit;
    const clicks = Math.round(unitsDialed / result.clickSize);
    const tiltDeg = (Math.atan2(result.upAxis.x, -result.upAxis.y) * 180) / Math.PI;

    console.log(`
══════════════════════════════════════════════════════════════
                CALIBRATION COMPLETE → HUNT MODE
══════════════════════════════════════════════════════════════
  Rifle:              ${result.gunId}
  Mount Orientation:  ${result.mountOrientation}
  Screen Rotation:    ${result.screenRotation}°
  Camera Zoom:        ${(result.cameraZoom * 100).toFixed(0)}%
  Scope:              ${result.clickSize} ${result.scopeUnit}/click at ${result.scopeMagnification}x
──────────────────────────────────────────────────────────────
  Scope Center:       (${result.scopeCenterPx.x}, ${result.scopeCenterPx.y})
  Mark after ${clicks} clicks UP: (${result.elevationEndPx.x}, ${result.elevationEndPx.y})
  Pixels per ${result.scopeUnit}:     ${result.pxPerUnit.toFixed(2)}
  Dial-up direction:  ${tiltDeg.toFixed(1)}° from screen up
──────────────────────────────────────────────────────────────
  Roll₀ / Pitch₀:     ${result.roll0.toFixed(2)}° / ${result.pitch0.toFixed(2)}°
══════════════════════════════════════════════════════════════
`);
}
