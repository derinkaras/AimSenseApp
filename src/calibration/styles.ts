// ============================================================
// styles.ts - Class name helper for the calibration screens
// ============================================================

/** Join NativeWind class names, skipping false/empty ones. */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
