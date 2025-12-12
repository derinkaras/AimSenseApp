import React from 'react';
import { View, Text, Image } from 'react-native';
import icons from "@/app/constants/icons";

const PremiumBadge = () => {
    return (
        <View className="px-4 py-1.5 rounded-full bg-brand-greenLight border border-brand-green/50 flex-row items-center justify-center">
            <Image
                source={icons.diamond}
                className="w-4 h-4 mr-1.5"
                tintColor="#ffffff"
                resizeMode="contain"
            />
            <Text className="text-white text-xs font-semibold">
                Premium
            </Text>
        </View>
    );
};

export default PremiumBadge;