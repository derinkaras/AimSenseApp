import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/app/contexts/AuthContext";

export default function Layout() {
    const { user, initializing } = useAuth();

    // While checking initial auth, show loader
    if (initializing) {
        return (
            <View className="flex-1 bg-brand-black items-center justify-center">
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#0b7f4f" />
            </View>
        );
    }

    // ✅ If a user is signed in, redirect to main app (using Redirect, not useRouter)
    if (user) {
        return <Redirect href="/(tabs)/Home" />;
    }

    // No user → normal onboarding stack (index + Authentication)
    return (
        <View className="flex-1 bg-brand-black">
            <StatusBar style="light" />
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