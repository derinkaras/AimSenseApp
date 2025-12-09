import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import icons from '@/app/constants/icons';

interface LogoutContentProps {
    onConfirm?: () => void;
    onCancel?: () => void;
}

const LogoutContent = ({ onConfirm, onCancel }: LogoutContentProps) => {
    return (
        <View className="gap-6 py-2">
            {/* Icon */}
            <View className="items-center justify-center">
                <View className="bg-red-500/10 p-6 rounded-full border-2 border-red-500/30">
                    <Image
                        source={icons.power}
                        className="size-12"
                        tintColor="#ef4444"
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Message */}
            <View className="gap-2">
                <Text className="text-white text-xl font-semibold text-center">
                    Logout Confirmation
                </Text>
                <Text className="text-gray-400 text-base text-center px-4">
                    Are you sure you want to logout? You'll need to sign in again to access your account.
                </Text>
            </View>

            {/* Action Buttons */}
            <View className="gap-3 mt-2">
                <TouchableOpacity
                    onPress={onConfirm}
                    className="bg-red-600 rounded-xl py-4 px-6"
                    activeOpacity={0.7}
                >
                    <Text className="text-white text-center font-semibold text-base">
                        Yes, Logout
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onCancel}
                    className="bg-brand-green rounded-xl py-4 px-6"
                    activeOpacity={0.7}
                >
                    <Text className="text-white text-center font-semibold text-base">
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default LogoutContent;