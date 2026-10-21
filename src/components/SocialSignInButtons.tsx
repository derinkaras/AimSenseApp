// ============================================================
// src/components/SocialSignInButtons.tsx - "Continue with Apple / Google" on the auth screen
// ============================================================
// Apple's button is the official native one (App Review requires Apple's own styling).
// Google's follows Google's branding: white button, colour "G" logo.
// Renders nothing when neither is available in this build (e.g. Expo Go on Android).

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { GOOGLE_SIGN_IN_AVAILABLE, isAppleSignInAvailable, type SocialProvider } from "@/services/socialAuth";

const BUTTON_HEIGHT = 50;
const RADIUS = 14;

type Props = {
    onSignIn: (provider: SocialProvider) => void;
    /** Which provider is signing in right now (shows a spinner and blocks double taps) */
    busy: SocialProvider | null;
};

function GoogleLogo() {
    return (
        <Svg width={18} height={18} viewBox="0 0 48 48">
            <Path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <Path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <Path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <Path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
        </Svg>
    );
}

export default function SocialSignInButtons({ onSignIn, busy }: Props) {
    const [appleAvailable, setAppleAvailable] = useState(false);

    useEffect(() => {
        isAppleSignInAvailable().then(setAppleAvailable);
    }, []);

    if (!appleAvailable && !GOOGLE_SIGN_IN_AVAILABLE) return null;

    return (
        <View>
            {/* Divider */}
            <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-brand-green/60" />
                <Text className="text-white/40 text-xs font-semibold mx-3 tracking-[0.14em]">OR</Text>
                <View className="flex-1 h-px bg-brand-green/60" />
            </View>

            <View className="gap-3">
                {appleAvailable && (
                    <View pointerEvents={busy ? "none" : "auto"} style={{ opacity: busy && busy !== "apple.com" ? 0.5 : 1 }}>
                        <AppleAuthentication.AppleAuthenticationButton
                            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                            cornerRadius={RADIUS}
                            style={{ width: "100%", height: BUTTON_HEIGHT }}
                            onPress={() => onSignIn("apple.com")}
                        />
                    </View>
                )}

                {GOOGLE_SIGN_IN_AVAILABLE && (
                    <Pressable
                        onPress={() => onSignIn("google.com")}
                        disabled={!!busy}
                        accessibilityRole="button"
                        accessibilityLabel="Continue with Google"
                        className="flex-row items-center justify-center bg-white active:opacity-80"
                        style={{ height: BUTTON_HEIGHT, borderRadius: RADIUS, opacity: busy && busy !== "google.com" ? 0.5 : 1 }}
                    >
                        {busy === "google.com" ? (
                            <ActivityIndicator color="#121212" />
                        ) : (
                            <>
                                <GoogleLogo />
                                <Text
                                    className="text-[#1f1f1f] ml-2.5"
                                    style={{ fontSize: 17, fontWeight: Platform.OS === "ios" ? "600" : "500" }}
                                >
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </Pressable>
                )}
            </View>
        </View>
    );
}
