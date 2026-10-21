import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import icons from "@/constants/icons";

interface LogoutContentProps {
    onConfirm?: () => Promise<unknown> | void;
    onCancel?: () => void;
}

const LogoutContent = ({ onConfirm, onCancel }: LogoutContentProps) => {
    const [busy, setBusy] = useState(false);

    const handleConfirm = async () => {
        setBusy(true);
        try {
            await onConfirm?.();
        } finally {
            setBusy(false);
        }
    };

    return (
        <View>
            {/* Icon */}
            <View className="size-12 rounded-full bg-white/5 border border-white/10 items-center justify-center self-center">
                <Image source={icons.power} className="size-5" tintColor="rgba(255,255,255,0.85)" resizeMode="contain" />
            </View>

            {/* Message */}
            <Text className="text-white text-lg font-semibold text-center mt-4">Log out of AimSense?</Text>
            <Text className="text-white/55 text-sm leading-5 text-center mt-1.5 px-2">
                You&apos;ll need to sign in again. Your rifles stay saved to your account.
            </Text>

            {/* Actions: the quiet choice on the left, the action on the right */}
            <View className="flex-row gap-2.5 mt-6">
                <TouchableOpacity
                    onPress={onCancel}
                    disabled={busy}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
                >
                    <Text className="text-white/85 font-semibold text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={busy}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    className="flex-1 h-12 rounded-2xl bg-brand-green border border-brand-greenLight/50 items-center justify-center"
                >
                    {busy ? <ActivityIndicator color="#ffffff" /> : <Text className="text-white font-semibold text-base">Log out</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default LogoutContent;
