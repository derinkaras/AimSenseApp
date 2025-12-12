import React from 'react';
import { View, Text } from 'react-native';

const FreeBadge = () => {
    return (
        <View className="px-4 py-1.5 rounded-full bg-brand-black border border-brand-green/30">
            <Text className="text-gray-400 text-xs font-semibold">
                Free
            </Text>
        </View>
    );
};

export default FreeBadge;