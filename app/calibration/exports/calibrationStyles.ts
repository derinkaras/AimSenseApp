// ============================================================
// calibrationStyles.ts - Shared Styles for Calibration Steps
// ============================================================
// StyleSheet styles for crosshairs, magnifiers, guides, and modals
// used across multiple calibration steps (5, 6, 7, 8).

import { StyleSheet } from "react-native";

// ==================== CROSSHAIR STYLES ====================
export const crosshairStyles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  top: {
    position: "absolute",
    width: 2,
    height: 32,
    top: 0,
    backgroundColor: "#22c55e",
    borderRadius: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 3,
  },
  bottom: {
    position: "absolute",
    width: 2,
    height: 32,
    bottom: 0,
    backgroundColor: "#22c55e",
    borderRadius: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 3,
  },
  left: {
    position: "absolute",
    width: 32,
    height: 2,
    left: 0,
    backgroundColor: "#22c55e",
    borderRadius: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 3,
  },
  right: {
    position: "absolute",
    width: 32,
    height: 2,
    right: 0,
    backgroundColor: "#22c55e",
    borderRadius: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 3,
  },
  center: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    borderWidth: 1.5,
    borderColor: "rgba(0, 0, 0, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
    elevation: 3,
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
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairV: {
    position: "absolute",
    width: 1,
    height: 40,
    backgroundColor: "#22c55e",
  },
  crosshairH: {
    position: "absolute",
    width: 40,
    height: 1,
    backgroundColor: "#22c55e",
  },
  crosshairDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
});

// ==================== GUIDE OVERLAY STYLES ====================
export const guideStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
