// ============================================================
// src/help/HelpButton.tsx - The small round "?" button
// ============================================================

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface HelpButtonProps {
    onPress: () => void;
    /** Diameter in points */
    size?: number;
}

export default function HelpButton({ onPress, size = 28 }: HelpButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Help"
            style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        >
            <Text style={[styles.text, { fontSize: size * 0.55 }]}>?</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(11, 127, 79, 0.15)", // brand-greenLight
        borderWidth: 1,
        borderColor: "rgba(11, 127, 79, 0.6)",
    },
    text: {
        color: "#0b7f4f",
        fontWeight: "700",
    },
});
