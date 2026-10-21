import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import icons from "@/constants/icons";

interface LogoutContentProps {
    onConfirm?: () => void;
    onCancel?: () => void;
}

const LogoutContent = ({ onConfirm, onCancel }: LogoutContentProps) => {
    return (
        <View>
            {/* Icon */}
            <View className="items-center">
                <View className="size-16 rounded-2xl bg-brand-greenDark border border-brand-green/60 items-center justify-center">
                    <Image source={icons.power} className="size-7" tintColor="#0b7f4f" resizeMode="contain" />
                </View>
            </View>

            {/* Message */}
            <Text className="text-white text-xl font-bold text-center mt-4">Log out?</Text>
            <Text className="text-white/60 text-sm leading-5 text-center mt-2 px-2">
                You&apos;ll need to sign in again to use AimSense. Your rifle profiles stay saved to your account.
            </Text>

            {/* Actions */}
            <View className="gap-2.5 mt-6">
                <TouchableOpacity
                    onPress={onConfirm}
                    activeOpacity={0.85}
                    className="rounded-2xl bg-red-600/90 border border-red-400/40 py-3.5 items-center"
                >
                    <Text className="text-white font-bold text-base">Log out</Text>
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

export default LogoutContent;
