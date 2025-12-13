// CalibrationHeader.tsx
import React from "react";
import { View, Text, Image } from "react-native";
import icons from "@/app/constants/icons";

export function CalibrationHeader({
                                      title,
                                      subtitle,
                                      compact = false,
                                  }: {
    title: string;
    subtitle: string;
    compact?: boolean;
}) {
    const pad = compact ? "p-3" : "p-5";
    const titleSize = compact ? "text-xl" : "text-2xl";
    const subtitleSize = compact ? "text-sm" : "text-base";
    const gap = compact ? "mt-1" : "mt-2";

    return (
        <View className={`rounded-3xl ${pad} bg-brand-greenDark/70 border border-brand-green/60`}>
            <View className="flex-row items-center">
                <View className="size-11 rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center mr-3">
                    <Image
                        source={icons.compass}
                        className="w-6 h-6"
                        resizeMode="contain"
                        tintColor="#0b7f4f"
                    />
                </View>

                <View className="flex-1">
                    <Text className={`text-white ${titleSize} font-semibold`}>{title}</Text>
                    <Text className={`text-white/80 ${gap} ${subtitleSize}`}>{subtitle}</Text>
                </View>
            </View>
        </View>
    );
}
