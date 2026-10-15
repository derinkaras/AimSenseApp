// ============================================================
// src/help/content.ts - Everything the user can read about how AimSense works
// ============================================================
// One place for all help text, so it stays consistent and is easy to update.
// Numbers that come from the calculations (warning angles, standard air) are read from the
// same constants the maths uses, so this text cannot quietly drift out of date.
// If you change how something is calculated, update the matching text here.

import { CANT_BAD_DEG, CANT_WARN_DEG } from "../hunt/aim";
import { SEA_LEVEL_PRESSURE_INHG, SEA_LEVEL_TEMP_F } from "../hunt/atmosphere";

const STANDARD_AIR = `sea level, ${SEA_LEVEL_TEMP_F}°F, ${SEA_LEVEL_PRESSURE_INHG.toFixed(2)} inHg`;

// ==================== SHORT TOPICS (the "?" popups) ====================

export type HelpTopicKey = "calibrationIntro" | "shotSetup";

export interface HelpTopic {
    title: string;
    intro: string;
    points: string[];
}

export const HELP_TOPICS: Record<HelpTopicKey, HelpTopic> = {
    calibrationIntro: {
        title: "How setup works",
        intro:
            "Setup teaches the app how your phone and scope line up, so hunt mode can put its aiming mark in exactly the right place. You do it once per rifle.",
        points: [
            "Pick your rifle, its turret click value and the magnification you hunt at, and how the phone sits in its mount.",
            "Line up: zoom until the scope view fills the screen, rotate until the crosshair looks square, and tap the crosshair center.",
            "Measure: with the rifle rested and the crosshair on a sharp mark, turn the elevation turret UP a set number of clicks and tap where the mark moved. The crosshair stays in the middle and the picture moves behind it. That one move tells the app how big one MOA or MIL is on your screen.",
            "Next time you pick that rifle, you only check the green marker is still on your crosshair.",
            "If you change the scope, its magnification, or how the phone is mounted, choose Recalibrate.",
        ],
    },

    shotSetup: {
        title: "Distance, wind and air conditions",
        intro: "Only the distance is required. Everything else is optional.",
        points: [
            "Distance: what your rangefinder shows. A line-of-sight rangefinder is corrected for uphill and downhill angle using the phone's tilt sensor. An angle-compensated (\"shoot-to\") rangefinder is used as given. Set the type in the rangefinder box.",
            "Wind: enter the speed and the direction it comes from as a clock position, looking from the rifle to the target. 12 is a headwind, 3 is from your right, 6 is a tailwind, 9 is from your left. The orange crosshair moves to cancel the drift.",
            `Altitude, temperature and pressure: thinner air means less drop. Leave them blank for standard air (${STANDARD_AIR}). Pressure is the actual pressure where you are, not the sea-level figure from weather reports. These are remembered for next time. Wind is not.`,
            "The app cannot measure wind or air. The result is only as good as what you enter.",
        ],
    },
};

// ==================== FULL GUIDE ====================

export interface GuideSection {
    title: string;
    /** Optional lead paragraph */
    body?: string;
    bullets?: string[];
}

export const GUIDE_TITLE = "How it works & limits";

export const GUIDE_INTRO =
    "AimSense is an aiming aid. This page explains what it does, what it assumes, and where its limits are, so you know how much to trust each number.";

export const GUIDE_SECTIONS: GuideSection[] = [
    {
        title: "What AimSense does",
        body:
            "AimSense turns your phone into an aiming aid for your scope. You calibrate once. In hunt mode it works out how much to hold over for the bullet drop (and for wind, if you enter it) and shows it as an orange crosshair on the phone screen. Line your target up under the orange crosshair. Your scope's own crosshair will then sit above the target, and into the wind, by the right amount.",
    },
    {
        title: "How it works",
        bullets: [
            "Calibration: you mark where your scope's crosshair appears on screen, then how far a mark on your target moves when you turn the elevation turret UP a known number of clicks. That gives the app the pixels per MOA or MIL on your screen and which way is up. Windage uses the same scale at a right angle.",
            "Gun profile: muzzle velocity, ballistic coefficient (G1), sight height above the bore, and zero distance.",
            "Hunt mode: you enter the distance. The app simulates the bullet's flight, zeroed at your zero distance, and finds how far it drops (and drifts) at the target.",
            "It converts that into screen pixels using your calibration and draws the orange crosshair.",
            "The phone's tilt sensor measures the shot angle and any rifle cant, and the orange crosshair rotates with cant.",
        ],
    },
    {
        title: "What it calculates",
        bullets: [
            "Bullet drop at your distance, using the standard G1 drag model.",
            "Shot angle: for line-of-sight rangefinders, the horizontal distance (the cosine rule).",
            `Rifle cant: it rotates the holdover, warns you to check it above ${CANT_WARN_DEG}° and to level the rifle above ${CANT_BAD_DEG}°.`,
            "Wind drift (optional): from the speed and direction you enter, including headwind and tailwind effects.",
            "Air density (optional): from the altitude, temperature and pressure you enter.",
        ],
    },
    {
        title: "What it does not calculate",
        bullets: [
            "Humidity, spin drift, the Coriolis effect, or aerodynamic jump.",
            "Wind that changes along the bullet's path, vertical wind, or moving targets.",
            "How muzzle velocity changes with temperature. Enter the muzzle velocity that matches your conditions.",
        ],
    },
    {
        title: "What it assumes",
        bullets: [
            `The air is standard (${STANDARD_AIR}) unless you enter conditions.`,
            "Your rifle was zeroed in about the same air you are shooting in. If you zeroed at a very different altitude with a long zero distance, expect a small error.",
            "Your gun profile is accurate. A published ballistic coefficient is often a little optimistic, and the standard G1 drag curve is only an approximation of a real bullet.",
            "The wind is steady along the whole flight.",
            "Your rangefinder reading is correct and you chose the right rangefinder type.",
        ],
    },
    {
        title: "What accuracy depends on",
        bullets: [
            "Calibration precision. Keep the rifle rested and still while dialing, mark points carefully with the nudge arrows, and use camera zoom so the movement is large on screen.",
            "A solid mount. If the phone or scope shifts, or you change the scope's magnification, recalibrate the rifle.",
            "Honest inputs: muzzle velocity, ballistic coefficient, sight height and zero distance.",
            "A good wind estimate. Wind is usually the biggest source of error at longer range. For a typical .308 load, a 10 mph crosswind moves the bullet about 3 MOA at 400 yards.",
        ],
    },
    {
        title: "While you are hunting",
        bullets: [
            "The orange crosshair marks where your target should sit on the screen. It is not a second aiming point for your scope.",
            "Inside your zero distance the bullet stays near your line of sight, above it for most of that range. Where it is above the line of sight the app shows no holdover, so it never tells you to hold under.",
            "At long range the orange crosshair can move past the edge of the screen. The app warns you. Use your turret instead.",
            "Use Verify Zero to check that the green crosshair still sits on your scope's crosshair. If it has drifted, recalibrate the rifle.",
        ],
    },
    {
        title: "Before you rely on it",
        bullets: [
            "Confirm your zero, then confirm your drops with live fire at several distances (for example 300 and 500 yards) and compare them with what the app shows.",
            "Know your effective range and stay within it. The app is an aid. It does not replace your judgment, your marksmanship, or your knowledge of the target and what lies beyond it.",
            "Follow your local hunting laws and the rules of your range.",
        ],
    },
];

// ==================== BEFORE-YOU-HUNT BRIEFING ====================

/** Bump this whenever the briefing changes in a way users must see again. */
export const BRIEFING_VERSION = 1;

export const BRIEFING_TITLE = "Before you hunt";

export const BRIEFING_INTRO = "A quick reminder of what AimSense can and can't do.";

export const BRIEFING_POINTS: string[] = [
    "AimSense is an aiming aid. It does not replace your judgment, your knowledge of your rifle, your effective range, or safe shooting practice.",
    "Check your zero with Verify Zero, and confirm your drops with live fire before you rely on them.",
    "Hunt with the same scope magnification and phone zoom you calibrated with. If anything moved, calibrate again.",
    "Results depend on your inputs: muzzle velocity, ballistic coefficient, distance and wind.",
    "The app assumes standard air unless you enter conditions, and it cannot measure wind.",
    "Not included: humidity, spin drift, changing wind and moving targets.",
    "If the orange crosshair goes off the screen, use your turret instead.",
];
