// ============================================================
// src/calibration/index.ts - Public API of the calibration feature
// ============================================================
// Import from "@/calibration". Where things live:
//   types.ts        types shared by calibration and hunt mode
//   constants.ts    click size options, defaults, tilt config
//   math.ts         pure calibration math (click count, px per unit)
//   layout.ts       camera panel layout (single source of truth)
//   geometry.ts     nudge / tap-to-camera helpers used by the steps
//   labels.ts       display text
//   orientation.ts  mount orientation + screen lock
//   store.ts        calibration flow state (Zustand) and finish()
//   savedCalibration.ts  calibrations kept on the device, one per rifle
//   summary.ts      console summary of a finished calibration
//   components.tsx  ScopeCamera, the one camera setup shared with hunt mode
//   CalibrationStage.tsx / ScopeSetupFields.tsx  shared calibration screen UI
//   calibrationStyles.ts  the crosshair marker style

export * from "./types";
export * from "./constants";
export * from "./math";
export * from "./layout";
export * from "./geometry";
export * from "./labels";
export * from "./orientation";
export * from "./store";
export * from "./savedCalibration";
