import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import icons from '@/app/constants/icons';

interface DeleteAccountContentProps {
    onConfirm?: () => void;
    onCancel?: () => void;
}

const DeleteAccountContent = ({ onConfirm, onCancel }: DeleteAccountContentProps) => {
    return (
        <View className="gap-6 py-2">
            {/* Icon */}
            <View className="items-center justify-center">
                <View className="bg-red-500/10 p-6 rounded-full border-2 border-red-500/30">
                    <Image
                        source={icons.trash} // or icons.delete if you have it
                        className="size-12"
                        tintColor="#ef4444"
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Message */}
            <View className="gap-2">
                <Text className="text-white text-xl font-semibold text-center">
                    Delete Account
                </Text>
                <Text className="text-gray-400 text-base text-center px-4">
                    This action cannot be undone
                </Text>
            </View>

            {/* Warning Details */}
            <ScrollView className="max-h-48 px-2" showsVerticalScrollIndicator={true}>
                <View className="gap-3">
                    <Text className="text-gray-400 text-base">
                        When you delete your account, the following data will be
                        <Text className="text-red-500 font-semibold"> permanently removed</Text>:
                    </Text>

                    <View className="gap-2 pl-2">
                        <Text className="text-gray-400 text-base">
                            • Your account information (email, name, profile photo)
                        </Text>
                        <Text className="text-gray-400 text-base">
                            • All saved rifle profiles and ballistic data
                        </Text>
                        <Text className="text-gray-400 text-base">
                            • App preferences and settings
                        </Text>
                    </View>

                    <Text className="text-gray-400 text-base mt-2">
                        This data <Text className="text-white font-semibold">cannot be recovered</Text> after
                        deletion. You will need to create a new account to use AimSense again.
                    </Text>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="gap-3 mt-2">
                <TouchableOpacity
                    onPress={onConfirm}
                    className="bg-red-600 rounded-xl py-4 px-6"
                    activeOpacity={0.7}
                >
                    <Text className="text-white text-center font-semibold text-base">
                        Yes, Delete My Account
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

export default DeleteAccountContent;