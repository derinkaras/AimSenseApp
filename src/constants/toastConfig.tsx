// ============================================================
// src/constants/toastConfig.tsx - The app's toasts
// ============================================================
// One look for every toast, matching the modals and sheets: a dark brand surface with a thin
// border, a small round icon, a white title and a muted message. Use Toast.show with
// type "success", "error" or "info".

import React from "react";
import { Image, ImageSourcePropType, Text, View } from "react-native";
import type { ToastConfigParams } from "react-native-toast-message";
import icons from "@/constants/icons";
import { MAX_FONT_SCALE } from "@/constants/fontScale";

interface ToastStyle {
    icon: ImageSourcePropType;
    iconColor: string;
    iconCircle: string; // icon circle background + border
    border: string;
}

const STYLES: Record<"success" | "error" | "info", ToastStyle> = {
    success: {
        icon: icons.check,
        iconColor: "#0b7f4f", // brand-greenLight
        iconCircle: "bg-brand-greenLight/15 border-brand-greenLight/40",
        border: "border-brand-green/60",
    },
    error: {
        icon: icons.cancel,
        iconColor: "#f87171", // red-400
        iconCircle: "bg-red-500/15 border-red-500/40",
        border: "border-red-500/40",
    },
    info: {
        icon: icons.info,
        iconColor: "rgba(255,255,255,0.85)",
        iconCircle: "bg-white/5 border-white/15",
        border: "border-white/15",
    },
};

function AppToast({ text1, text2, kind }: ToastConfigParams<unknown> & { kind: keyof typeof STYLES }) {
    const s = STYLES[kind];
    return (
        <View
            className={`w-[92%] max-w-md flex-row items-center rounded-2xl bg-brand-black border ${s.border} px-3.5 py-3`}
            style={{
                // Float above everything, including modals' dimmed backdrops
                elevation: 20,
                shadowColor: "#000",
                shadowOpacity: 0.4,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 16,
            }}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <View className={`size-8 rounded-full border items-center justify-center mr-3 ${s.iconCircle}`}>
                <Image source={s.icon} className="size-3.5" resizeMode="contain" tintColor={s.iconColor} />
            </View>
            <View className="flex-1">
                {!!text1 && (
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-[15px] font-semibold" numberOfLines={2}>
                        {text1}
                    </Text>
                )}
                {!!text2 && (
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/60 text-[13px] leading-[18px] mt-0.5" numberOfLines={3}>
                        {text2}
                    </Text>
                )}
            </View>
        </View>
    );
}

export const toastConfig = {
    success: (props: ToastConfigParams<unknown>) => <AppToast {...props} kind="success" />,
    error: (props: ToastConfigParams<unknown>) => <AppToast {...props} kind="error" />,
    info: (props: ToastConfigParams<unknown>) => <AppToast {...props} kind="info" />,
};
