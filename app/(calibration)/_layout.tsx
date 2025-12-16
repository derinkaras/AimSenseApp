// ============================================================
// _layout.tsx - ALTERNATIVE APPROACH
// ============================================================
// Instead of trying to make Stack transparent, we track which
// screen is active and only that screen renders its camera.

import React, { createContext, useContext, useState, useCallback } from "react";
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
