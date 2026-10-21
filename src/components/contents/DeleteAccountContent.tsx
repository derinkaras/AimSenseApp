import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, TextInput } from "react-native";
import icons from "@/constants/icons";
import authService from "@/services/authService";

interface DeleteAccountContentProps {
    // Firebase requires a recent sign-in to delete an account, so the password is collected here
    onConfirm?: (password: string) => void;
    onCancel?: () => void;
    /** The signed-in email, so a forgotten password can be reset from here */
    email?: string | null;
}

const REMOVED = [
    "Your account, email, name and profile photo",
    "All rifle profiles and ballistic data",
    "Your app preferences",
];

const DeleteAccountContent = ({ onConfirm, onCancel, email }: DeleteAccountContentProps) => {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");
    // Shown inline: a toast would appear behind this modal on iOS
    const [resetError, setResetError] = useState<string | null>(null);

    const handleForgotPassword = async () => {
        if (!email) return;
        setResetState("sending");
        setResetError(null);
        const result = await authService.sendPasswordReset(email);
        if (result.success) {
            setResetState("sent");
        } else {
            setResetState("idle");
            setResetError(result.message);
        }
    };

    return (
        <View>
            {/* Icon */}
            <View className="items-center">
                <View className="size-16 rounded-2xl bg-red-950/50 border border-red-500/40 items-center justify-center">
                    <Image source={icons.trash} className="size-7" tintColor="#f87171" resizeMode="contain" />
                </View>
            </View>

            {/* Message */}
            <Text className="text-white text-xl font-bold text-center mt-4">Delete your account?</Text>
            <Text className="text-white/60 text-sm text-center mt-1">This can&apos;t be undone.</Text>

            {/* What gets removed */}
            <View className="mt-5 rounded-2xl bg-red-950/25 border border-red-500/30 p-4">
                <Text className="text-red-300 text-[11px] font-bold tracking-[0.14em] mb-1">PERMANENTLY DELETED</Text>
                {REMOVED.map((item) => (
                    <View key={item} className="flex-row items-start mt-2">
                        <Image source={icons.cancel} className="size-2.5 mt-1 mr-2.5" tintColor="#f87171" resizeMode="contain" />
                        <Text className="text-white/75 text-sm flex-1">{item}</Text>
                    </View>
                ))}
            </View>

            {/* Password confirmation */}
            <Text className="text-white/70 text-xs font-semibold mt-5 mb-2">Enter your password to confirm</Text>
            <View className="h-12 flex-row items-center rounded-xl bg-brand-greenDark/60 border border-brand-green/60 px-4">
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    className="flex-1 h-full text-white"
                    // No platform padding or line height (text-base adds one), so the text sits level with the icon
                    style={{ fontSize: 16, paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" }}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8} accessibilityRole="button">
                    <Text className="text-brand-greenLight text-xs font-semibold">{showPassword ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
            </View>

            {/* Forgot the password: email a reset link so they can still delete the account */}
            {email ? (
                resetState === "sent" ? (
                    <View className="mt-3 flex-row items-start rounded-xl bg-brand-greenDark/60 border border-brand-green/60 px-3 py-2.5">
                        <Image source={icons.mail} className="size-3.5 mt-0.5 mr-2" tintColor="#0b7f4f" resizeMode="contain" />
                        <Text className="text-white/75 text-xs leading-4 flex-1">
                            Reset link sent to <Text className="text-white font-semibold">{email}</Text>. Choose a new password
                            from the email, then come back here to delete your account.
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={handleForgotPassword}
                        disabled={resetState === "sending"}
                        hitSlop={8}
                        accessibilityRole="button"
                        className="mt-2.5 self-start"
                    >
                        <Text className="text-brand-greenLight text-xs font-semibold">
                            {resetState === "sending" ? "Sending reset link..." : "Forgot your password?"}
                        </Text>
                    </TouchableOpacity>
                )
            ) : null}
            {resetError && <Text className="text-red-400 text-xs mt-1.5">{resetError}</Text>}

            {/* Actions */}
            <View className="gap-2.5 mt-6">
                <TouchableOpacity
                    onPress={() => onConfirm?.(password)}
                    disabled={!password}
                    activeOpacity={0.85}
                    className={`rounded-2xl bg-red-600/90 border border-red-400/40 py-3.5 items-center ${!password ? "opacity-40" : ""}`}
                >
                    <Text className="text-white font-bold text-base">Delete my account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onCancel}
                    activeOpacity={0.85}
                    className="rounded-2xl bg-brand-green border border-brand-greenLight/60 py-3.5 items-center"
                >
                    <Text className="text-white font-semibold text-base">Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default DeleteAccountContent;
