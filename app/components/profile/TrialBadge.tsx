import React from 'react';
import { View, Text } from 'react-native';

const TrialBadge = () => {
    return (
        <View className="px-4 py-1.5 rounded-full bg-brand-greenLight border border-brand-green/50">
            <Text className="text-white text-xs font-semibold">
                Trial Active
            </Text>
        </View>
    );
};

export default TrialBadge;