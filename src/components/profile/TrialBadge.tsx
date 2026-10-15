import React from "react";
import { View, Text } from "react-native";

const TrialBadge = () => {
    return (
        <View className="px-5 py-2 rounded-full bg-brand-greenLight border border-brand-green/60">
            <Text className="text-white text-sm font-semibold">
                Trial Active
            </Text>
        </View>
    );
};

export default TrialBadge;
