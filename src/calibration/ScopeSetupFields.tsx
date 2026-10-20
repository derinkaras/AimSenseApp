// ============================================================
// src/calibration/ScopeSetupFields.tsx - Scope and phone-mount inputs
// ============================================================
// Shared by the rifle setup sheet (calibration) and the gun profile form.

import React, { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import icons from "@/constants/icons";
import { MAX_SCOPE_MAGNIFICATION, MIN_SCOPE_MAGNIFICATION, SCOPE_CLICK_OPTIONS } from "./constants";
import { cn } from "./styles";
import { MAX_FONT_SCALE } from "@/constants/fontScale";
import type { MountOrientation, ScopeUnit } from "./types";

// ==================== CLICK VALUE ====================

interface ClickValuePickerProps {
    scopeUnit: ScopeUnit | null;
    clickSize: number | null;
    onChange: (scopeUnit: ScopeUnit, clickSize: number) => void;
}

/** One grid of the common turret click values (unit and size together). */
export function ClickValuePicker({ scopeUnit, clickSize, onChange }: ClickValuePickerProps) {
    return (
        <View className="flex-row flex-wrap gap-2">
            {SCOPE_CLICK_OPTIONS.map((option) => {
                const selected = option.scopeUnit === scopeUnit && option.clickSize === clickSize;
                return (
                    <Pressable
                        key={option.label}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onChange(option.scopeUnit, option.clickSize);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        className={cn(
                            "rounded-xl border items-center justify-center py-3",
                            selected ? "bg-brand-greenDark border-brand-greenLight" : "bg-brand-greenDark/60 border-brand-green/50"
                        )}
                        style={{ width: "31.5%" }}
                    >
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className={cn("text-base font-semibold", selected ? "text-white" : "text-white/70")}>
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ==================== MAGNIFICATION ====================

interface MagnificationFieldProps {
    value: number | null;
    onChange: (value: number | null) => void;
}

// The number and the "×" share one font size with no line height or font padding, set here
// rather than with text-xl, whose line height makes Android draw the TextInput text lower
const MAGNIFICATION_TEXT = { fontSize: 20, includeFontPadding: false } as const;

/** The magnification a typed text stands for, or null if it is not usable. */
function parseMagnification(text: string): number | null {
    const parsed = parseFloat(text);
    return parsed >= MIN_SCOPE_MAGNIFICATION && parsed <= MAX_SCOPE_MAGNIFICATION ? parsed : null;
}

/** Stepper with a typed value in the middle. Reports null until the value is usable. */
export function MagnificationField({ value, onChange }: MagnificationFieldProps) {
    const [text, setText] = useState(value ? String(value) : "");
    const [inputWidth, setInputWidth] = useState(16);

    // Follow outside changes (e.g. a profile loading in) without fighting the user's typing
    if (value !== null && value !== parseMagnification(text)) {
        setText(String(value));
    }

    const commit = (raw: string) => {
        const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
        setText(cleaned);
        onChange(parseMagnification(cleaned));
    };

    const step = (delta: number) => {
        Haptics.selectionAsync();
        const base = value ?? 0;
        const next = Math.min(MAX_SCOPE_MAGNIFICATION, Math.max(MIN_SCOPE_MAGNIFICATION, Math.round(base + delta)));
        commit(String(next));
    };

    const invalid = text !== "" && value === null;

    return (
        <View>
            <View className="flex-row items-center gap-2">
                <StepButton label="−" accessibilityLabel="Lower magnification" onPress={() => step(-1)} />
                <View
                    className={cn(
                        "flex-1 h-12 flex-row items-center justify-center rounded-xl border bg-brand-greenDark/60",
                        invalid ? "border-red-500/70" : "border-brand-green/50"
                    )}
                >
                    {/* Invisible copy of the digits: its width sizes the input so "9×" centers as one unit
                        (a TextInput does not shrink to its content on its own) */}
                    <Text
                        maxFontSizeMultiplier={MAX_FONT_SCALE}
                        className="font-semibold absolute opacity-0"
                        style={MAGNIFICATION_TEXT}
                        onLayout={(e) => setInputWidth(Math.ceil(e.nativeEvent.layout.width) + 2)}
                    >
                        {text || "9"}
                    </Text>
                    <TextInput
                        value={text}
                        onChangeText={commit}
                        placeholder="9"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        maxLength={4}
                        accessibilityLabel="Scope magnification"
                        maxFontSizeMultiplier={MAX_FONT_SCALE}
                        className="text-white font-semibold text-center"
                        style={[MAGNIFICATION_TEXT, { width: inputWidth, padding: 0, margin: 0, textAlignVertical: "center" }]}
                    />
                    <Text
                        maxFontSizeMultiplier={MAX_FONT_SCALE}
                        className="text-white/50 font-semibold"
                        style={MAGNIFICATION_TEXT}
                    >
                        ×
                    </Text>
                </View>
                <StepButton label="+" accessibilityLabel="Raise magnification" onPress={() => step(1)} />
            </View>
            {invalid && (
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-red-400 text-xs mt-2">
                    Enter a magnification between {MIN_SCOPE_MAGNIFICATION} and {MAX_SCOPE_MAGNIFICATION}.
                </Text>
            )}
        </View>
    );
}

function StepButton({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            className="w-12 h-12 rounded-xl bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center"
        >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-brand-greenLight text-2xl font-semibold">{label}</Text>
        </Pressable>
    );
}

// ==================== PHONE MOUNT ====================

const MOUNT_OPTIONS: { key: MountOrientation; label: string; icon: any }[] = [
    { key: "portrait", label: "Upright", icon: icons.phonePortrait },
    { key: "landscape-left", label: "Rotated left", icon: icons.phoneLandscapeLeft },
    { key: "landscape-right", label: "Rotated right", icon: icons.phoneLandscapeRight },
];

interface MountPickerProps {
    value: MountOrientation | null;
    onChange: (value: MountOrientation) => void;
}

/** How the phone sits in its scope mount. */
export function MountPicker({ value, onChange }: MountPickerProps) {
    return (
        <View className="flex-row gap-2">
            {MOUNT_OPTIONS.map((option) => {
                const selected = option.key === value;
                return (
                    <Pressable
                        key={option.key}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onChange(option.key);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={option.label}
                        className={cn(
                            "flex-1 rounded-xl border items-center py-3 px-1",
                            selected ? "bg-brand-greenDark border-brand-greenLight" : "bg-brand-greenDark/60 border-brand-green/50"
                        )}
                    >
                        <Image
                            source={option.icon}
                            className="w-7 h-7"
                            resizeMode="contain"
                            style={{ tintColor: selected ? "#0b7f4f" : "#9ca3af" }}
                        />
                        <Text maxFontSizeMultiplier={MAX_FONT_SCALE}
                            className={cn("text-xs font-semibold text-center mt-2", selected ? "text-white" : "text-white/60")}
                            numberOfLines={2}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
