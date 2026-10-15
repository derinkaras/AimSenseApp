// ============================================================
// calibrationStyles.ts - The crosshair marker style
// ============================================================
// Used by the calibration screens and hunt mode, so the green marker looks identical in both.
// Ultra-thin crosshair for pixel-perfect scope center alignment:
// - 1px lines for maximum precision
// - Small gap at center to see exact alignment point
// - High contrast with dark outline for visibility on any background

import { StyleSheet } from "react-native";

export const crosshairStyles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  // Outer lines - longer, thinner for precise alignment
  top: {
    position: "absolute",
    width: 1,
    height: 50,
    top: 0,
    backgroundColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 2,
  },
  bottom: {
    position: "absolute",
    width: 1,
    height: 50,
    bottom: 0,
    backgroundColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 2,
  },
  left: {
    position: "absolute",
    width: 50,
    height: 1,
    left: 0,
    backgroundColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 2,
  },
  right: {
    position: "absolute",
    width: 50,
    height: 1,
    right: 0,
    backgroundColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 2,
  },
  // Center dot - tiny 2x2 pixel for exact center indication
  center: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 0,
    backgroundColor: "#ff0000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 1,
    elevation: 3,
  },
  // Inner crosshair lines - short lines near center for fine alignment
  innerTop: {
    position: "absolute",
    width: 1,
    height: 8,
    top: 52,
    backgroundColor: "#22c55e",
  },
  innerBottom: {
    position: "absolute",
    width: 1,
    height: 8,
    bottom: 52,
    backgroundColor: "#22c55e",
  },
  innerLeft: {
    position: "absolute",
    width: 8,
    height: 1,
    left: 52,
    backgroundColor: "#22c55e",
  },
  innerRight: {
    position: "absolute",
    width: 8,
    height: 1,
    right: 52,
    backgroundColor: "#22c55e",
  },
});
