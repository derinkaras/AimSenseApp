import React, {useEffect, useRef} from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/app/contexts/AuthContext";

export default function Layout() {
    const { session, loading } = useAuth();
    const router = useRouter();
    const hasCheckedInitialSession = useRef(false)

    // When auth finishes we have a session → go to main app
    useEffect(() => {
        if (loading) return;

        if (session) {
            console.log("[OnboardingLayout] Session found, router.replace to /(tabs)/Home");
            hasCheckedInitialSession.current = true;
            router.replace("/(tabs)/Home");
        } else {
            hasCheckedInitialSession.current = true;
            console.log("[OnboardingLayout] No session, staying on onboarding");
        }
    }, [loading, session, router]);

    // While loading auth OR while redirecting, show a simple loader
    if (loading && !hasCheckedInitialSession.current) {
        return (
            <View className="flex-1 bg-brand-black items-center justify-center">
                <StatusBar style="light" backgroundColor="#121212" />
                <ActivityIndicator size="large" color="#0b7f4f" />
            </View>
        );
    }

    // No session → normal onboarding stack (index + Authentication)
    return (
        <View className="flex-1 bg-brand-black">
            <StatusBar style="light" backgroundColor="#121212" />
            <Stack>
                <Stack.Screen
                    name="index"
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="Authentication"
                    options={{
                        headerShown: false,
                    }}
                />
            </Stack>
        </View>
    );
}
