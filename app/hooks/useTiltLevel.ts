import { useEffect, useRef, useState } from "react";
import { DeviceMotion } from "expo-sensors";
import { MountOrientation } from "@/app/calibration/exports";

function radToDeg(r: number) {
    return (r * 180) / Math.PI;
}

function ema(prev: number, next: number, alpha: number) {
    return prev === Infinity ? next : prev * (1 - alpha) + next * alpha;
}

/**
 * Remap gravity vector into a canonical "portrait" frame,
 * so the leveling behavior stays consistent across mount orientations.
 */
function remapGravityToPortrait(gx: number, gy: number, gz: number, o: MountOrientation) {
    switch (o) {
        case "portrait":
            return { x: gx, y: gy, z: gz };

        case "portrait-upside-down":
            // rotate 180° around Z
            return { x: -gx, y: -gy, z: gz };

        case "landscape-left":
            // rotate -90° around Z
            return { x: gy, y: -gx, z: gz };

        case "landscape-right":
            // rotate +90° around Z
            return { x: -gy, y: gx, z: gz };

        default:
            return { x: gx, y: gy, z: gz };
    }
}

export interface TiltLevelResult {
    /** Display-friendly level angle (integer degrees for UI bubble) */
    levelDeg: number;
    /** Whether the device is level (near 0°) and stable */
    isLevel: boolean;
    /** Whether the device is being held steady (stable readings, any angle) */
    isStable: boolean;
    /** Raw smoothed roll angle (degrees) - store this as roll0 */
    rollNow: number;
    /** Raw smoothed pitch angle (degrees) - store this as pitch0 */
    pitchNow: number;
}

export interface TiltLevelControls {
    /** When false, stops DeviceMotion subscription (recommended for production). */
    enabled?: boolean;
    /** DeviceMotion update interval in ms (defaults to 60). */
    updateIntervalMs?: number;
}

/**
 * Measure-like leveling (Expo approximation):
 * - Auto-selects FLAT vs UPRIGHT mode based on |gz| fraction (with hysteresis)
 * - Shows signed integer degrees (-2..-1..0..1..2) for UI
 * - isLevel: device is near 0° AND stable (for level-requiring steps)
 * - isStable: device readings are stable at ANY angle (for baseline capture)
 * - Returns raw rollNow/pitchNow for baseline capture
 *
 * CALIBRATION RULE:
 * - For baseline capture, use isStable (not isLevel)
 * - isStable means the values haven't changed much over stabilityMs
 * - This allows capturing the baseline at whatever angle the mount holds the phone
 */
export function useTiltLevel(
    mountOrientation: MountOrientation,
    opts?: {
        toleranceDeg?: number;
        holdMs?: number;
        stabilityThresholdDeg?: number; // Max change per reading to be considered "stable"
        stabilityMs?: number; // How long readings must be stable

        zeroEnterDeg?: number;
        zeroExitDeg?: number;
        smoothingAlpha?: number;

        flatEnterGz?: number;
        flatExitGz?: number;
    },
    controls?: TiltLevelControls
): TiltLevelResult {
    // ≤ 3° gating condition for "isLevel" (phone near 0)
    const toleranceDeg = opts?.toleranceDeg ?? 3.0;
    // How long to hold for isLevel
    const holdMs = opts?.holdMs ?? 500;

    // Stability detection (for baseline capture at any angle)
    // Max degrees of change between readings to be "stable"
    const stabilityThresholdDeg = opts?.stabilityThresholdDeg ?? 0.5;
    // How long values must be stable
    const stabilityMs = opts?.stabilityMs ?? 800;

    const zeroEnterDeg = opts?.zeroEnterDeg ?? 0.12;
    const zeroExitDeg = opts?.zeroExitDeg ?? 0.6;
    const smoothingAlpha = opts?.smoothingAlpha ?? 0.18;

    const flatEnterGz = opts?.flatEnterGz ?? 0.85;
    const flatExitGz = opts?.flatExitGz ?? 0.75;

    const enabled = controls?.enabled ?? true;
    const updateIntervalMs = controls?.updateIntervalMs ?? 60;

    const [levelDeg, setLevelDeg] = useState<number>(0);
    const [isLevel, setIsLevel] = useState(false);
    const [isStable, setIsStable] = useState(false);
    const [rollNow, setRollNow] = useState<number>(0);
    const [pitchNow, setPitchNow] = useState<number>(0);

    const stableSince = useRef<number | null>(null);
    const logicalRef = useRef<number>(Infinity);
    const displayRef = useRef<number>(0);
    const modeRef = useRef<"FLAT" | "UPRIGHT">("UPRIGHT");

    // Smoothed raw IMU values for baseline capture
    const rollRef = useRef<number>(Infinity);
    const pitchRef = useRef<number>(Infinity);

    // For stability detection - track previous values
    const prevRollRef = useRef<number>(Infinity);
    const prevPitchRef = useRef<number>(Infinity);
    const stableStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            stableSince.current = null;
            stableStartRef.current = null;
            setIsLevel(false);
            setIsStable(false);
            return;
        }

        // Fresh start when re-enabled
        stableSince.current = null;
        stableStartRef.current = null;
        logicalRef.current = Infinity;
        displayRef.current = 0;
        modeRef.current = "UPRIGHT";
        rollRef.current = Infinity;
        pitchRef.current = Infinity;
        prevRollRef.current = Infinity;
        prevPitchRef.current = Infinity;

        DeviceMotion.setUpdateInterval(updateIntervalMs);

        const sub = DeviceMotion.addListener((data) => {
            const g = data.accelerationIncludingGravity;
            if (!g) return;

            const gx0 = g.x ?? 0;
            const gy0 = g.y ?? 0;
            const gz0 = g.z ?? 0;

            // Remap to portrait-like frame based on mount orientation
            const { x: gx, y: gy, z: gz } = remapGravityToPortrait(gx0, gy0, gz0, mountOrientation);

            const norm = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
            const gzFrac = Math.abs(gz) / norm;

            // Mode selection with hysteresis
            if (modeRef.current === "UPRIGHT" && gzFrac >= flatEnterGz) {
                modeRef.current = "FLAT";
            } else if (modeRef.current === "FLAT" && gzFrac <= flatExitGz) {
                modeRef.current = "UPRIGHT";
            }

            // Roll/pitch from gravity (in remapped frame)
            const rawRoll = radToDeg(Math.atan2(gy, gz));
            const rawPitch = radToDeg(Math.atan2(-gx, Math.sqrt(gy * gy + gz * gz)));

            // Smooth raw roll and pitch for baseline capture
            rollRef.current = ema(rollRef.current, rawRoll, smoothingAlpha);
            pitchRef.current = ema(pitchRef.current, rawPitch, smoothingAlpha);

            const smoothedRoll = Number.isFinite(rollRef.current) ? rollRef.current : 0;
            const smoothedPitch = Number.isFinite(pitchRef.current) ? pitchRef.current : 0;

            setRollNow(smoothedRoll);
            setPitchNow(smoothedPitch);

            // ============================================================
            // STABILITY DETECTION (for baseline capture at any angle)
            // ============================================================
            const now = Date.now();

            if (Number.isFinite(prevRollRef.current) && Number.isFinite(prevPitchRef.current)) {
                const rollChange = Math.abs(smoothedRoll - prevRollRef.current);
                const pitchChange = Math.abs(smoothedPitch - prevPitchRef.current);
                const maxChange = Math.max(rollChange, pitchChange);

                if (maxChange <= stabilityThresholdDeg) {
                    // Values are stable
                    if (stableStartRef.current === null) {
                        stableStartRef.current = now;
                    }
                    if (now - stableStartRef.current >= stabilityMs) {
                        setIsStable(true);
                    }
                } else {
                    // Values changed too much - reset stability
                    stableStartRef.current = null;
                    setIsStable(false);
                }
            }

            prevRollRef.current = smoothedRoll;
            prevPitchRef.current = smoothedPitch;

            // ============================================================
            // LEVEL DETECTION (for UI display, near 0°)
            // ============================================================
            let chosenSigned: number;

            if (modeRef.current === "FLAT") {
                let r = ((rawRoll + 180) % 360) - 180;
                if (r > 90) r -= 180;
                if (r < -90) r += 180;
                chosenSigned = r;
            } else {
                const abs = Math.abs(rawRoll);
                chosenSigned = Math.sign(rawRoll || 1) * (abs - 90);
            }

            // Smooth signed logical angle for display
            logicalRef.current = ema(logicalRef.current, chosenSigned, smoothingAlpha);
            const logical = Number.isFinite(logicalRef.current) ? logicalRef.current : 0;

            // DISPLAY hysteresis to prevent flicker around 0
            const current = displayRef.current;
            let next = current;

            if (current === 0) {
                next =
                    Math.abs(logical) >= zeroExitDeg
                        ? Math.sign(logical) * Math.ceil(Math.abs(logical))
                        : 0;
            } else {
                next =
                    Math.abs(logical) <= zeroEnterDeg
                        ? 0
                        : Math.sign(logical) * Math.ceil(Math.abs(logical));
            }

            displayRef.current = next;
            setLevelDeg(next);

            // isLevel: near 0° AND stable for holdMs
            const withinTolerance = Math.abs(logical) <= toleranceDeg;

            if (withinTolerance) {
                if (stableSince.current == null) stableSince.current = now;
                if (now - stableSince.current >= holdMs) setIsLevel(true);
            } else {
                stableSince.current = null;
                setIsLevel(false);
            }
        });

        return () => sub.remove();
    }, [
        enabled,
        updateIntervalMs,
        mountOrientation,
        toleranceDeg,
        holdMs,
        stabilityThresholdDeg,
        stabilityMs,
        zeroEnterDeg,
        zeroExitDeg,
        smoothingAlpha,
        flatEnterGz,
        flatExitGz,
    ]);

    return { levelDeg, isLevel, isStable, rollNow, pitchNow };
}