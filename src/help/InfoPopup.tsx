// ============================================================
// src/help/InfoPopup.tsx - Help sheet that explains one topic
// ============================================================
// Pass the topic to show, or null to hide it.

import React from "react";
import HelpSheet from "./HelpSheet";
import HelpTopicBody from "./HelpTopicBody";
import { HELP_TOPICS, type HelpTopicKey } from "./content";

interface InfoPopupProps {
    topic: HelpTopicKey | null;
    onClose: () => void;
}

export default function InfoPopup({ topic, onClose }: InfoPopupProps) {
    if (topic === null) return null;

    return (
        <HelpSheet visible onClose={onClose} eyebrow="How it works" title={HELP_TOPICS[topic].title}>
            <HelpTopicBody topic={topic} />
        </HelpSheet>
    );
}
