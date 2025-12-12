import React from "react";
import { View, Text, Image } from "react-native";
import icons from "@/app/constants/icons";

const PremiumBadge = () => {
    return (
        <View className="px-5 py-2 rounded-full bg-brand-greenLight border border-brand-green/60 flex-row items-center justify-center">
            <Image
                source={icons.diamond}
                className="w-5 h-5 mr-2"
                tintColor="#ffffff"
                resizeMode="contain"
            />
            <Text className="text-white text-sm font-semibold">
                Premium
            </Text>
        </View>
    );
};

export default PremiumBadge;
