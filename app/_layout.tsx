import React from "react";
import { Stack } from "expo-router";
import "../global.css";
import Toast, {
    BaseToast,
    ErrorToast,
    BaseToastProps,
} from "react-native-toast-message";
import { AuthProvider } from "@/app/contexts/AuthContext";

export const toastConfig = {
    success: (props: BaseToastProps) => (
        <BaseToast
            {...props}
            style={{
                backgroundColor: "#0f1815",     // SOLID dark surface
                borderLeftWidth: 4,
                borderLeftColor: "#22c55e",     // emerald accent
                borderRadius: 14,
                paddingVertical: 10,

                // Make sure it floats ON TOP
                elevation: 20,
                shadowColor: "#000",
                shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                zIndex: 99999,
            }}
            contentContainerStyle={{
                paddingHorizontal: 16,
            }}
            text1Style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#ffffff",
            }}
            text2Style={{
                fontSize: 13,
                color: "#d1e7db",
            }}
        />
    ),

    error: (props: BaseToastProps) => (
        <ErrorToast
            {...props}
            style={{
                backgroundColor: "#1f1414",      // SOLID dark red surface
                borderLeftWidth: 4,
                borderLeftColor: "#ef4444",      // red accent
                borderRadius: 14,
                paddingVertical: 10,

                // On top
                elevation: 20,
                shadowColor: "#000",
                shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 12,
                zIndex: 99999,
            }}
            contentContainerStyle={{
                paddingHorizontal: 16,
            }}
            text1Style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#ffffff",
            }}
            text2Style={{
                fontSize: 13,
                color: "#f2d6d6",
            }}
        />
    ),
};


export default function RootLayout() {

    return (
        <AuthProvider>
            <>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                        name="(onboarding)"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="(tabs)"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="(pages)"
                        options={{
                            headerShown: false,
                        }}
                    />
                </Stack>

                <Toast
                    position="top"
                    visibilityTime={2000}
                    topOffset={60}
                    config={toastConfig}
                />
            </>
        </AuthProvider>
    );
}
