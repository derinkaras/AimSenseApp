// ============================================================
// src/help/HelpSheet.tsx - The sheet every help text opens in
// ============================================================
// The app's standard sheet (AppSheet) with one "Got it" button.

import React, { ReactNode } from "react";
import AppSheet, { SheetButton } from "@/components/AppSheet";

interface HelpSheetProps {
    visible: boolean;
    onClose: () => void;
    /** Small green label above the title */
    eyebrow: string;
    title: string;
    children: ReactNode;
    actionLabel?: string;
}

export default function HelpSheet({ visible, onClose, eyebrow, title, children, actionLabel = "Got it" }: HelpSheetProps) {
    return (
        <AppSheet
            visible={visible}
            onClose={onClose}
            eyebrow={eyebrow}
            title={title}
            footer={<SheetButton label={actionLabel} onPress={onClose} />}
        >
            {children}
        </AppSheet>
    );
}
