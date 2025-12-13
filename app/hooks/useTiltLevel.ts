import { useEffect, useRef, useState } from "react";
import { DeviceMotion } from "expo-sensors";
import { MountOrientation } from "@/app/calibration/types";

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

/**
 * Measure-like leveling (Expo approximation):
 * - Auto-selects FLAT vs UPRIGHT mode based on |gz| fraction (with hysteresis)
 * - Shows signed integer degrees (-2..-1..0..1..2)
 * - isLevel is based on the true smoothed angle (not the integer)
 */
export function useTiltLevel(
    mountOrientation: MountOrientation,
    opts?: {
        toleranceDeg?: number;
        holdMs?: number;

        zeroEnterDeg?: number;
        zeroExitDeg?: number;
        smoothingAlpha?: number;

        flatEnterGz?: number;
        flatExitGz?: number;
    }
) {
    const toleranceDeg = opts?.toleranceDeg ?? 0.5;
    const holdMs = opts?.holdMs ?? 600;

    const zeroEnterDeg = opts?.zeroEnterDeg ?? 0.12;
    const zeroExitDeg = opts?.zeroExitDeg ?? 0.6;
    const smoothingAlpha = opts?.smoothingAlpha ?? 0.18;

    const flatEnterGz = opts?.flatEnterGz ?? 0.85;
    const flatExitGz = opts?.flatExitGz ?? 0.75;

    const [levelDeg, setLevelDeg] = useState<number>(0);
    const [isLevel, setIsLevel] = useState(false);

    const stableSince = useRef<number | null>(null);
    const logicalRef = useRef<number>(Infinity); // smoothed signed degrees
    const displayRef = useRef<number>(0);
    const modeRef = useRef<"FLAT" | "UPRIGHT">("UPRIGHT");

    useEffect(() => {
        DeviceMotion.setUpdateInterval(60);

        const sub = DeviceMotion.addListener((data) => {
            const g = data.accelerationIncludingGravity;
            if (!g) return;

            const gx0 = g.x ?? 0;
            const gy0 = g.y ?? 0;
            const gz0 = g.z ?? 0;

            // ✅ Remap to portrait-like frame based on mount orientation
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
            const roll = radToDeg(Math.atan2(gy, gz));
            const pitch = radToDeg(Math.atan2(-gx, Math.sqrt(gy * gy + gz * gz)));

            let chosenSigned: number;

            if (modeRef.current === "FLAT") {
                // Signed "slope" like Measure (wrap to [-90, 90] to avoid flips)
                let r = ((roll + 180) % 360) - 180;
                if (r > 90) r -= 180;
                if (r < -90) r += 180;
                chosenSigned = r;
            } else {
                // Upright: treat "no cant" as near 90°
                const abs = Math.abs(roll);
                chosenSigned = Math.sign(roll || 1) * (abs - 90);
            }

            // Smooth signed logical angle
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

            if (next !== current) {
                displayRef.current = next;
                setLevelDeg(next);
            } else {
                setLevelDeg(next);
            }

            // Logic gate uses the true smoothed angle (not integer)
            const within = Math.abs(logical) <= toleranceDeg;
            const now = Date.now();

            if (within) {
                if (stableSince.current == null) stableSince.current = now;
                if (now - stableSince.current >= holdMs) setIsLevel(true);
            } else {
                stableSince.current = null;
                setIsLevel(false);
            }
        });

        return () => sub.remove();
    }, [
        mountOrientation,
        toleranceDeg,
        holdMs,
        zeroEnterDeg,
        zeroExitDeg,
        smoothingAlpha,
        flatEnterGz,
        flatExitGz,
    ]);

    return { levelDeg, isLevel };
}
