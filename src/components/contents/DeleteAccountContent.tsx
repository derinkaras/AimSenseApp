import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, TextInput } from "react-native";
import icons from "@/constants/icons";

interface DeleteAccountContentProps {
    // Firebase requires a recent sign-in to delete an account, so the password is collected here
    onConfirm?: (password: string) => void;
    onCancel?: () => void;
}

const REMOVED = [
    "Your account, email, name and profile photo",
    "All rifle profiles and ballistic data",
    "Your app preferences",
];

const DeleteAccountContent = ({ onConfirm, onCancel }: DeleteAccountContentProps) => {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

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
            <View className="flex-row items-center rounded-xl bg-brand-greenDark/60 border border-brand-green/60 px-4">
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    className="flex-1 py-3 text-white text-base"
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8} accessibilityRole="button">
                    <Text className="text-brand-greenLight text-xs font-semibold">{showPassword ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
            </View>

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
