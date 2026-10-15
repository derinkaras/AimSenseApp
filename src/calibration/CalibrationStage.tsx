// ============================================================
// src/calibration/CalibrationStage.tsx - Shared layout for the camera calibration screens
// ============================================================
// Full-bleed scope camera with one control panel: a bottom sheet in portrait, a side panel
// in landscape. The camera area is exactly the area hunt mode uses (getCameraLayoutConfig),
// so every pixel measured here lines up with what is drawn in hunt mode.
//
// Each screen shows a step label with a progress bar, one title, a short message, its own
// controls, and a single primary action. Back lives in the header, away from the primary
// action. Content is kept short enough to fit the panel without scrolling on phones; the
// panel only scrolls if a screen is unusually small.

import React, { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import icons from "@/constants/icons";
import { MAX_FONT_SCALE } from "@/constants/fontScale";
import { ScopeCamera } from "./components";
import { crosshairStyles } from "./calibrationStyles";
import { cn } from "./styles";
import type { CameraLayoutConfig, CameraViewSize, PixelPoint } from "./types";

const ORANGE = "#f97316";


export interface StageAction {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    busy?: boolean;
}

interface CalibrationStageProps {
    layout: CameraLayoutConfig;
    showCamera: boolean;
    zoom: number;
    focusLocked: boolean;
    rotation: number;
    cameraRef?: React.Ref<CameraView>;
    /** When set, tapping the camera reports the point (camera-area pixels) */
    onCameraTap?: (point: PixelPoint) => void;
    onCameraLayout?: (size: CameraViewSize) => void;
    /** Markers and hints drawn over the camera */
    overlay?: ReactNode;
    stepLabel: string;
    /** Which segment of the progress bar is lit (1-based); leave out for no bar */
    progress?: { step: number; total: number };
    title: string;
    message?: string;
    /** Extra controls under the message */
    children?: ReactNode;
    primary: StageAction;
    onBack?: () => void;
}

export function CalibrationStage({
    layout,
    showCamera,
    zoom,
    focusLocked,
    rotation,
    cameraRef,
    onCameraTap,
    onCameraLayout,
    overlay,
    stepLabel,
    progress,
    title,
    message,
    children,
    primary,
    onBack,
}: CalibrationStageProps) {
    const landscape = layout.isLandscapeMode;

    const handleLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        onCameraLayout?.({ width, height });
    };

    const handleTap = (e: GestureResponderEvent) => {
        if (!onCameraTap) return;
        Haptics.selectionAsync();
        onCameraTap({ x: Math.round(e.nativeEvent.locationX), y: Math.round(e.nativeEvent.locationY) });
    };

    const camera = (
        <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${rotation}deg` }] }]} pointerEvents="none">
            <ScopeCamera ref={cameraRef} zoom={zoom} focusLocked={focusLocked} />
        </View>
    );

    const header = (
        <View className="flex-row items-center gap-3">
            {onBack && (
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        onBack();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    hitSlop={10}
                    className="w-9 h-9 rounded-full bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center"
                >
                    <Image source={icons.chevronLeft} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#ffffff" }} />
                </Pressable>
            )}
            <View className="flex-1">
                <Text
                    className="text-brand-greenLight text-[11px] font-bold uppercase tracking-[0.14em]"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                >
                    {stepLabel}
                </Text>
                {progress && (
                    <View className="flex-row gap-1.5 mt-1.5">
                        {Array.from({ length: progress.total }, (_, i) => (
                            <View
                                key={i}
                                className={cn("flex-1 h-1 rounded-full", i < progress.step ? "bg-brand-greenLight" : "bg-white/15")}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );

    const primaryButton = (
        <Pressable
            onPress={primary.onPress}
            disabled={primary.disabled || primary.busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!(primary.disabled || primary.busy) }}
            className={cn(
                "h-12 px-4 rounded-2xl items-center justify-center",
                primary.disabled ? "bg-brand-green/40" : "bg-brand-green border border-brand-greenLight/50"
            )}
        >
            {primary.busy ? (
                <ActivityIndicator color="#ffffff" />
            ) : (
                <Text
                    className={cn("text-base font-semibold", primary.disabled ? "text-white/40" : "text-white")}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                >
                    {primary.label}
                </Text>
            )}
        </Pressable>
    );

    const body = (
        <>
            {message ? (
                <Text className="text-white/65 text-sm leading-5" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {message}
                </Text>
            ) : null}
            {children}
        </>
    );

    const portraitPanel = (
        <>
            {header}
            <Text className="text-white text-xl font-bold mt-2" numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {title}
            </Text>
            <ScrollView
                className="flex-1 mt-1"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 8, gap: 10 }}
            >
                {body}
            </ScrollView>
            <View className="pt-1">{primaryButton}</View>
        </>
    );

    const landscapePanel = (
        <>
            {header}
            <ScrollView
                className="flex-1 mt-3"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            >
                <Text className="text-white text-xl font-bold" numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {title}
                </Text>
                {body}
            </ScrollView>
            <View className="pt-2">{primaryButton}</View>
        </>
    );

    return (
        <View className="flex-1 bg-brand-black">
            <View
                onLayout={handleLayout}
                style={[
                    StyleSheet.absoluteFill,
                    landscape ? { right: layout.cameraInsets.padRight } : { bottom: layout.bottomPanelTotalHeight },
                ]}
            >
                {showCamera &&
                    (onCameraTap ? (
                        <Pressable onPress={handleTap} style={StyleSheet.absoluteFill} accessibilityLabel="Camera view">
                            {camera}
                        </Pressable>
                    ) : (
                        camera
                    ))}
                {overlay}
            </View>

            {landscape ? (
                <SafeAreaView
                    edges={["top", "bottom", "right"]}
                    className="absolute top-0 bottom-0 right-0 bg-brand-black border-l border-white/10"
                    style={{ width: layout.sidePanelWidth }}
                >
                    <View className="flex-1 px-5 pt-3 pb-3">{landscapePanel}</View>
                </SafeAreaView>
            ) : (
                <View
                    className="absolute bottom-0 left-0 right-0 bg-brand-black border-t border-white/10 px-5 pt-4"
                    style={{ height: layout.bottomPanelTotalHeight, paddingBottom: layout.bottomPadding }}
                >
                    {portraitPanel}
                </View>
            )}
        </View>
    );
}

// ==================== OVERLAYS ====================

/** Crosshair marker drawn on the camera. Green = the scope's crosshair, orange = the target mark. */
export function Marker({ point, color = "green" }: { point: PixelPoint; color?: "green" | "orange" }) {
    const tint = color === "orange" ? { backgroundColor: ORANGE } : null;
    return (
        <View style={[crosshairStyles.container, { left: point.x - 60, top: point.y - 60 }]} pointerEvents="none">
            <View style={[crosshairStyles.top, tint]} />
            <View style={[crosshairStyles.bottom, tint]} />
            <View style={[crosshairStyles.left, tint]} />
            <View style={[crosshairStyles.right, tint]} />
            <View style={crosshairStyles.center} />
        </View>
    );
}

/** Short instruction floating at the top of the camera view, below the notch / Dynamic Island. */
export function CameraHint({ text }: { text: string }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[overlayStyles.hintWrap, { top: insets.top + 12 }]} pointerEvents="none">
            <View style={overlayStyles.hint}>
                <Text style={overlayStyles.hintText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {text}
                </Text>
            </View>
        </View>
    );
}

type NudgeDirection = "up" | "down" | "left" | "right";

/** Four arrows for moving a marker one pixel at a time (long press = 5 px). */
export function NudgePad({ onNudge }: { onNudge: (direction: NudgeDirection, step: number) => void }) {
    const button = (direction: NudgeDirection, icon: any, style: object) => (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync();
                onNudge(direction, 1);
            }}
            onLongPress={() => {
                Haptics.selectionAsync();
                onNudge(direction, 5);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Move marker ${direction}`}
            style={[overlayStyles.nudgeButton, style]}
        >
            <Image source={icon} style={overlayStyles.nudgeIcon} resizeMode="contain" />
        </Pressable>
    );
    return (
        <View style={overlayStyles.nudgePad} pointerEvents="box-none">
            {button("up", icons.chevronUp, { top: 0, left: 40 })}
            {button("left", icons.chevronLeft, { top: 40, left: 0 })}
            {button("right", icons.chevronRight, { top: 40, left: 80 })}
            {button("down", icons.chevronDown, { top: 80, left: 40 })}
        </View>
    );
}

const overlayStyles = StyleSheet.create({
    hintWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
    },
    hint: {
        backgroundColor: "rgba(0,0,0,0.75)",
        borderColor: "rgba(11,127,79,0.6)",
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    hintText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },
    nudgePad: {
        position: "absolute",
        right: 12,
        bottom: 12,
        width: 116,
        height: 116,
    },
    nudgeButton: {
        position: "absolute",
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.7)",
        borderWidth: 1,
        borderColor: "rgba(11,127,79,0.6)",
        alignItems: "center",
        justifyContent: "center",
    },
    nudgeIcon: {
        width: 16,
        height: 16,
        tintColor: "#0b7f4f",
    },
});
