// ============================================================
// src/hunt/index.ts - Public API of the hunt feature
// ============================================================
// Import from "@/hunt". Where things live:
//   store.ts        hunt session state (Zustand): selected gun, calibration, status
//   aim.ts          drop solution, cant filtering, holdover position on screen
//   ballistics.ts   G1 trajectory solver (zeroing, drag, wind), g1DragTable.ts is its data
//   atmosphere.ts   air density and speed of sound from altitude / temperature / pressure
//   wind.ts         wind speed + clock direction -> components
//   conditions.ts   the optional entries the shooter can make (wind, altitude, ...) and their units
//   units.ts        metric / imperial conversions
//   invariants.ts   checks that the camera matches what calibration captured
//   voiceParse.ts   turns a spoken shot-setup transcript into the same values the manual form uses

export * from "./store";
export * from "./aim";
export * from "./ballistics";
export * from "./atmosphere";
export * from "./wind";
export * from "./conditions";
export * from "./units";
export * from "./invariants";
export * from "./voiceParse";
