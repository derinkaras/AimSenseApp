// ============================================================
// src/components/AppSheet.tsx - The app's standard sheet + its buttons
// ============================================================
// Slides up in portrait, floats as a wide card in landscape, never runs past the safe areas.
// Fixed header (green eyebrow, title, optional close button), a scrolling body, and a fixed
// footer for the actions. Colors are the brand palette (tailwind.config.js):
//   buttons brand-green, accents brand-greenLight, cards brand-greenDark with brand-green borders.

import React, { ReactNode } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import icons from "@/constants/icons";
import { getSheetFrame } from "./sheetFrame";
import { MAX_FONT_SCALE } from "@/constants/fontScale";

interface AppSheetProps {
    visible: boolean;
    /** Leave out to make the sheet a required choice (no close button, no tap-outside) */
    onClose?: () => void;
    /** Small green label above the title */
    eyebrow: string;
    title: string;
    children: ReactNode;
    /** Actions pinned under the scrolling body */
    footer?: ReactNode;
    /** The body has text inputs: shrink the sheet above the keyboard instead of under it */
    avoidKeyboard?: boolean;
}

export default function AppSheet({ visible, onClose, eyebrow, title, children, footer, avoidKeyboard = false }: AppSheetProps) {
    const window = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const frame = getSheetFrame(window, insets);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose ?? (() => {})}
            supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
        >
            <KeyboardAvoidingView
                className="flex-1 justify-end"
                style={frame.rootStyle}
                behavior={avoidKeyboard && Platform.OS === "ios" ? "padding" : undefined}
                enabled={avoidKeyboard}
            >
                <Pressable
                    className="absolute inset-0 bg-black/70"
                    onPress={onClose}
                    disabled={!onClose}
                    accessibilityLabel={onClose ? "Close" : undefined}
                />
                <View
                    className={
                        frame.landscape
                            ? "self-center rounded-[28px] bg-brand-black border border-brand-green/60"
                            : "w-full rounded-t-[28px] bg-brand-black border border-brand-green/60"
                    }
                    style={frame.sheetStyle}
                >
                    <View className="self-center w-10 h-1 rounded-full bg-white/20 mt-2.5" />

                    <View className="flex-row items-start gap-3 px-5 pt-3">
                        <View className="flex-1">
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-brand-greenLight text-[11px] font-bold uppercase tracking-[0.16em]">
                                {eyebrow}
                            </Text>
                            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-2xl font-bold mt-0.5">{title}</Text>
                        </View>
                        {onClose && (
                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                hitSlop={10}
                                className="w-8 h-8 rounded-full bg-brand-greenDark border border-brand-green/60 items-center justify-center mt-1"
                            >
                                <Image source={icons.cancel} className="w-3 h-3" resizeMode="contain" style={{ tintColor: "#ffffff" }} />
                            </Pressable>
                        )}
                    </View>

                    <ScrollView
                        style={frame.scrollStyle}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>

                    {footer && (
                        <View className="px-5 pt-3 gap-2.5" style={{ paddingBottom: frame.footerPaddingBottom }}>
                            {footer}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ==================== BUTTONS ====================

type SheetButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_CLASSES: Record<SheetButtonVariant, string> = {
    primary: "bg-brand-green border border-brand-greenLight/50",
    secondary: "bg-brand-greenDark/70 border border-brand-green/60",
    danger: "bg-red-950/60 border border-red-500/50",
};

const BUTTON_TEXT: Record<SheetButtonVariant, string> = {
    primary: "text-white",
    secondary: "text-white/90",
    danger: "text-red-200",
};

interface SheetButtonProps {
    label: string;
    onPress: () => void;
    variant?: SheetButtonVariant;
    disabled?: boolean;
    busy?: boolean;
}

/** Full-width sheet action in the brand style. */
export function SheetButton({ label, onPress, variant = "primary", disabled = false, busy = false }: SheetButtonProps) {
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            disabled={disabled || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || busy }}
            className={`h-14 rounded-2xl items-center justify-center ${BUTTON_CLASSES[variant]} ${disabled ? "opacity-40" : ""}`}
        >
            {busy ? (
                <ActivityIndicator color="#ffffff" />
            ) : (
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className={`text-base font-semibold ${BUTTON_TEXT[variant]}`}>{label}</Text>
            )}
        </Pressable>
    );
}

// ==================== OPTION CARD ====================

interface OptionCardProps {
    title: string;
    description: string;
    selected: boolean;
    onPress: () => void;
}

/** A selectable card with a radio mark, for choosing one of a few options. */
export function OptionCard({ title, description, selected, onPress }: OptionCardProps) {
    return (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync();
                onPress();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`flex-row items-center rounded-2xl border p-4 gap-3 ${
                selected ? "bg-brand-greenDark border-brand-greenLight" : "bg-brand-greenDark/40 border-brand-green/50"
            }`}
        >
            <View className="flex-1">
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-base font-semibold">{title}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/60 text-sm leading-5 mt-1">{description}</Text>
            </View>
            <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selected ? "border-brand-greenLight" : "border-white/25"
                }`}
            >
                {selected && <View className="w-3 h-3 rounded-full bg-brand-greenLight" />}
            </View>
        </Pressable>
    );
}
