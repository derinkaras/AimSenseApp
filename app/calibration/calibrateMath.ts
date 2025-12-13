import { MountOrientation } from "./types";

export function rotationFor(o: MountOrientation): string {
    switch (o) {
        case "portrait":
            return "0deg";
        case "landscape-left":
            return "90deg";
        case "landscape-right":
            return "-90deg";
        case "portrait-upside-down":
            return "180deg";
    }
}

export function smooth(prev: number, next: number, alpha = 0.2) {
    return prev === Infinity ? next : prev * (1 - alpha) + next * alpha;
}
