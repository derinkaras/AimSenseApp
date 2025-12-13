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

    // Compact = tighter spacing + no tab bar (useful when the UI is rotated+scaled during calibration)
    // Non-compact = normal spacing + account for tab bar (dashboard state)
    const bottomPadding = compact
        ? Math.max(insets.bottom, 8)
        : tabBarHeight + insets.bottom + 12;

    return (
        <View style={{ paddingBottom: bottomPadding }} className="mt-auto">
            {children}
        </View>
    );
}