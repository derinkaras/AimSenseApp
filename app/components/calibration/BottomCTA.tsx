import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

export function BottomCTA({
                              children,
                              compact = false,
                          }: {
    children: React.ReactNode;
    compact?: boolean;
}) {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    // Compact = tighter spacing (useful when the UI is rotated+scaled)
    const bottomPadding = compact
        ? Math.max(tabBarHeight, 8)
        : tabBarHeight + insets.bottom + 12;

    return (
        <View style={{ paddingBottom: bottomPadding }} className="mt-auto">
            {children}
        </View>
    );
}
