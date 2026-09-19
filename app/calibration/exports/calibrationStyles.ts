// ============================================================
// calibrationStyles.ts - Shared Styles for Calibration Steps
// ============================================================
// StyleSheet styles for crosshairs, magnifiers, guides, and modals
// used across multiple calibration steps (5, 6, 7, 8).

import { StyleSheet } from "react-native";

// ==================== PRECISION CROSSHAIR STYLES ====================
// Ultra-thin crosshair for pixel-perfect scope center alignment
// - 1px lines for maximum precision
// - Small gap at center to see exact alignment point
// - High contrast with dark outline for visibility on any background

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

// ==================== ALTERNATIVE PRECISION CROSSHAIR ====================
// Even finer crosshair for maximum precision (use for final alignment)
export const precisionCrosshairStyles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  // Main crosshair lines - 1px, with gap at center
  lineVertical: {
    position: "absolute",
    width: 1,
    height: 100,
    backgroundColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 0.5,
    elevation: 2,
  },
  lineHorizontal: {
    position: "absolute",
    width: 100,
    height: 1,
    backgroundColor: "#22c55e",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 0.5,
    elevation: 2,
  },
  // Center gap mask (to create gap at intersection)
  centerGap: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "transparent",
  },
  // Tiny center point - 1x1 pixel (the actual center)
  centerPixel: {
    position: "absolute",
    width: 1,
    height: 1,
    backgroundColor: "#ff0000",
  },
  // Center ring for visibility (doesn't obscure center point)
  centerRing: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: "transparent",
  },
});

// ==================== MAGNIFIER STYLES ====================
export const magnifierStyles = StyleSheet.create({
  container: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#0b7f4f",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    overflow: "hidden",
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    position: "absolute",
    bottom: 4,
    color: "#0b7f4f",
    fontSize: 10,
    fontFamily: "monospace",
  },
  crosshair: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  // Ultra-thin crosshair lines for magnified view
  crosshairV: {
    position: "absolute",
    width: 1,
    height: 60,
    backgroundColor: "#22c55e",
  },
  crosshairH: {
    position: "absolute",
    width: 60,
    height: 1,
    backgroundColor: "#22c55e",
  },
  // Tiny center dot - 2x2 pixel for precise center
  crosshairDot: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 0, // Square for pixel precision
    backgroundColor: "#ff0000", // Red for visibility
  },
  // Optional: center ring that doesn't obscure the dot
  crosshairRing: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.6)",
    backgroundColor: "transparent",
  },
});

// ==================== GUIDE OVERLAY STYLES ====================
export const guideStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(11, 127, 79, 0.4)",
    alignItems: "center",
  },
  text: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  subtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 4,
  },
});

// ==================== MODAL STYLES ====================
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    backgroundColor: "#0a0a0a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(11, 127, 79, 0.4)",
    padding: 24,
    width: "100%",
    maxWidth: 340,
    maxHeight: "85%",
  },
  contentCompact: {
    maxWidth: 320,
    maxHeight: "90%",
    padding: 16,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(11, 127, 79, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(11, 127, 79, 0.4)",
  },
  optionText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  optionSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#0b7f4f",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(11, 127, 79, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(11, 127, 79, 0.4)",
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

// ==================== ARROW INDICATOR STYLES ====================
export const arrowStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  vertical: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  horizontal: {
    width: 80,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});

// ==================== FOCUS INDICATOR STYLES ====================
export const focusStyles = StyleSheet.create({
  indicator: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#22c55e",
    backgroundColor: "transparent",
  },
  ringAnimating: {
    borderWidth: 3,
    borderColor: "#eab308",
  },
  ringLocked: {
    borderWidth: 2,
    borderColor: "#22c55e",
  },
  lockedContainer: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  lockedInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
});