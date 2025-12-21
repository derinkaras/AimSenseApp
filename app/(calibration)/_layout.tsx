// ============================================================
// _layout.tsx - Calibration Flow Layout
// ============================================================
// Manages camera context so only one screen renders camera at a time.
// Supports 8-step calibration flow with shared state.

import React, { createContext, useContext, useState, useCallback } from "react";
import { Stack } from "expo-router";

// ==================== TYPES ====================
type CameraContextType = {
  activeScreen: string | null;
  setActiveScreen: (screen: string | null) => void;
};

// ==================== CONTEXT ====================
const CameraContext = createContext<CameraContextType>({
  activeScreen: null,
  setActiveScreen: () => {},
});

// ==================== LAYOUT COMPONENT ====================
export default function CalibrationLayout() {
  const [activeScreen, setActiveScreen] = useState<string | null>("step1");

  // Memoize setActiveScreen to prevent unnecessary rerenders
  const handleSetActiveScreen = useCallback((screen: string | null) => {
    setActiveScreen(screen);
  }, []);

  return (
    <CameraContext.Provider
      value={{
        activeScreen,
        setActiveScreen: handleSetActiveScreen,
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: false,
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      />
    </CameraContext.Provider>
  );
}

// ==================== HOOK ====================
export const useCameraContext = () => useContext(CameraContext);
