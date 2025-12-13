import React from "react";
import { View, Text } from "react-native";

export function CalibrationHeader({
                                      title,
                                      subtitle,
                                      compact = false,
                                  }: {
    title: string;
    subtitle: string;
    compact?: boolean;
}) {
    const containerPadding = compact ? "p-3" : "p-5";
    const titleSize = compact ? "text-xl" : "text-2xl";
    const subtitleSize = compact ? "text-sm" : "text-base";
    const subtitleMargin = compact ? "mt-1" : "mt-2";

    return (
        <View className={`bg-black/50 rounded-2xl ${containerPadding}`}>
            <Text className={`text-white ${titleSize} font-semibold`}>{title}</Text>
            <Text className={`text-white/80 ${subtitleMargin} ${subtitleSize}`}>{subtitle}</Text>
        </View>
    );
}
