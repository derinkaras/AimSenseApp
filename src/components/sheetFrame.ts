// ============================================================
// src/components/sheetFrame.ts - Size a bottom sheet to the visible screen
// ============================================================
// Every sheet in the app (rifle setup, target distance, help) uses this so it never runs
// under the notch / Dynamic Island, the home indicator, or off the screen.
//
// Layout contract: the full-screen root (justify-end) gets `rootStyle`; the sheet gets
// `sheetStyle`; inside it a fixed header, then a ScrollView with `scrollStyle` (the only part
// that shrinks), then a fixed footer with `footerPaddingBottom`. The sheet also shrinks when a
// KeyboardAvoidingView root gets smaller, so it stays below the top safe area with the keyboard up.

import type { ViewStyle } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

const TOP_GAP = 12; // space kept between the sheet and the top safe area
const LANDSCAPE_MARGIN = 12; // space around the floating sheet in landscape
const LANDSCAPE_MAX_WIDTH = 760;
const MIN_FOOTER_PADDING = 16;

export interface SheetFrame {
    landscape: boolean;
    /** Padding for the full-screen root, keeping the sheet below the top safe area */
    rootStyle: ViewStyle;
    /** Height, width and margins of the sheet container */
    sheetStyle: ViewStyle;
    /** Style for the sheet's ScrollView: never grows past its content, shrinks to fit */
    scrollStyle: ViewStyle;
    /** Bottom padding for the footer (clears the home indicator in portrait) */
    footerPaddingBottom: number;
}

export function getSheetFrame(window: { width: number; height: number }, insets: EdgeInsets): SheetFrame {
    const landscape = window.width > window.height;

    if (landscape) {
        const sideSpace = Math.max(insets.left, insets.right, LANDSCAPE_MARGIN);
        return {
            landscape,
            rootStyle: { paddingTop: insets.top + LANDSCAPE_MARGIN },
            sheetStyle: {
                flexShrink: 1,
                maxHeight: window.height - insets.top - Math.max(insets.bottom, LANDSCAPE_MARGIN) - LANDSCAPE_MARGIN,
                width: Math.min(window.width - 2 * sideSpace, LANDSCAPE_MAX_WIDTH),
                marginBottom: Math.max(insets.bottom, LANDSCAPE_MARGIN),
            },
            scrollStyle: { flexGrow: 0, flexShrink: 1 },
            footerPaddingBottom: MIN_FOOTER_PADDING,
        };
    }

    return {
        landscape,
        rootStyle: { paddingTop: insets.top + TOP_GAP },
        sheetStyle: {
            flexShrink: 1,
            maxHeight: window.height - insets.top - TOP_GAP,
        },
        scrollStyle: { flexGrow: 0, flexShrink: 1 },
        footerPaddingBottom: Math.max(insets.bottom, MIN_FOOTER_PADDING),
    };
}
