import React from "react";
import { Stack } from "expo-router";
import "../global.css";
import Toast from "react-native-toast-message";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkStatusProvider } from "@/contexts/NetworkStatusContext";
import { GunProfilesDirtyProvider } from "@/contexts/GunProfilesDirtyContext";
import { toastConfig } from "@/constants/toastConfig";

export default function RootLayout() {
    return (
        <AuthProvider>
            <NetworkStatusProvider>
                <GunProfilesDirtyProvider>
                    <Stack screenOptions={{ headerShown: false }} />

                    <Toast
                        position="top"
                        visibilityTime={2000}
                        topOffset={60}
                        config={toastConfig}
                    />
                </GunProfilesDirtyProvider>
            </NetworkStatusProvider>
        </AuthProvider>
    );
}
