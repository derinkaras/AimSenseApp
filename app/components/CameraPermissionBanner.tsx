import React, { useEffect } from "react";
import { View, Text, Pressable, Linking, Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";

/**
 * Non-blocking permission banner.
 * - Auto-requests once (only if canAskAgain)
 * - Shows Enable button (request again)
 * - If user denied permanently, shows Settings guide + Open Settings button
 *
 * Usage:
 * <CameraPermissionBanner />
 */
export const CameraPermissionBanner = ({
                                           title = "Camera access disabled",
                                           message = "Camera access is required for AimSense scope mode. You can keep using the app without it.",
                                       }: {
    title?: string;
    message?: string;
}) => {
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        if (!permission) return;
        if (!permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    // Don't show anything if camera is enabled
    if (permission?.granted) return null;

    const guide =
        Platform.OS === "ios"
            ? "Settings → AimSense → Camera → Allow"
            : "Settings → Apps → AimSense → Permissions → Camera → Allow";

    return (
        <View className="bg-black/70 rounded-2xl p-5">
            <Text className="text-white text-lg font-semibold mb-2">{title}</Text>

            <Text className="text-gray-300 mb-4 leading-5">{message}</Text>

            {permission?.canAskAgain ? (
                <Pressable
                    onPress={requestPermission}
                    className="bg-brand-green py-4 rounded-xl active:bg-brand-greenLight"
                >
                    <Text className="text-white text-center text-lg font-semibold">
                        Enable Camera
                    </Text>
                </Pressable>
            ) : (
                <>
                    <Text className="text-gray-400 mb-3">{guide}</Text>

                    <Pressable
                        onPress={() => Linking.openSettings()}
                        className="bg-brand-green py-4 rounded-xl active:bg-brand-greenLight"
                    >
                        <Text className="text-white text-center text-lg font-semibold">
                            Open Settings
                        </Text>
                    </Pressable>
                </>
            )}
        </View>
    );
};
