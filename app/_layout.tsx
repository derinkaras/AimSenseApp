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
                backgroundColor: "#284a37", // brand.green
                borderLeftColor: "#0b7f4f", // brand.greenLight
                borderRadius: 12,
                elevation: 5,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
            }}
            contentContainerStyle={{
                paddingHorizontal: 16,
                alignItems: "center",
            }}
            text1Style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "center",
            }}
            text2Style={{
                fontSize: 14,
                color: "#e4eee8",
                textAlign: "center",
            }}
        />
    ),

    error: (props: BaseToastProps) => (
        <ErrorToast
            {...props}
            style={{
                backgroundColor: "#0e2018", // brand.greenDark
                borderLeftColor: "#EF4444", // danger red accent
                borderRadius: 12,
                elevation: 5,
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
            }}
            contentContainerStyle={{
                paddingHorizontal: 16,
                alignItems: "center",
            }}
            text1Style={{
                fontSize: 16,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "center",
            }}
            text2Style={{
                fontSize: 14,
                color: "#dbe4de",
                textAlign: "center",
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
