// ============================================================
// _layout.tsx - Calibration Flow Layout
// ============================================================
// Manages camera context so only one screen renders camera at a time.
// Supports 7-step calibration flow.

import React, { createContext, useContext, useState } from "react";
import { Stack } from "expo-router";

type CameraContextType = {
    activeScreen: string | null;
    setActiveScreen: (screen: string | null) => void;
};

const CameraContext = createContext<CameraContextType>({
    activeScreen: null,
    setActiveScreen: () => {},
});

export default function CalibrationLayout() {
    const [activeScreen, setActiveScreen] = useState<string | null>("step1");

    return (
        <CameraContext.Provider value={{ activeScreen, setActiveScreen }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                    gestureEnabled: false,
                }}
            />
        </CameraContext.Provider>
    );
}

export const useCameraContext = () => useContext(CameraContext);