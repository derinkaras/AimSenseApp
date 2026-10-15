import React from "react";
import { View, Text } from "react-native";

const FreeBadge = () => {
    return (
        <View className="px-5 py-2 rounded-full bg-brand-black border border-brand-green/40">
            <Text className="text-gray-300 text-sm font-semibold">
                Free
            </Text>
        </View>
    );
};

export default FreeBadge;
