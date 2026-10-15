// ============================================================
// components.tsx - Shared camera component for calibration and hunt mode
// ============================================================

import React from "react";
import { StyleSheet } from "react-native";
import { CameraView } from "expo-camera";

// ==================== SCOPE CAMERA ====================
// The back camera for every screen that measures or draws scope positions. Calibration
// pixels are only valid if the preview is identical in hunt mode, so all of those screens
// use this one component instead of configuring CameraView themselves:
//  - stabilization off: it would slide the picture around inside the frame
//  - one fixed physical lens (iOS): switching lenses with zoom would change the scale
interface ScopeCameraProps {
  zoom: number;
  focusLocked: boolean;
  ref?: React.Ref<CameraView>;
}

export function ScopeCamera({ zoom, focusLocked, ref }: ScopeCameraProps) {
  return (
    <CameraView
      ref={ref}
      style={StyleSheet.absoluteFill}
      facing="back"
      zoom={zoom}
      autofocus={focusLocked ? "off" : "on"}
      videoStabilizationMode="off"
      selectedLens="builtInWideAngleCamera"
    />
  );
}
