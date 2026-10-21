import React from "react";
import icons from "@/constants/icons";
import LegalDocumentView from "@/legal/LegalDocumentView";
import { PRIVACY_POLICY } from "@/legal/content";

type PrivacyPolicyContentProps = {
    onClose: () => void;
};

// The policy text lives in src/legal/content.ts
const PrivacyPolicyContent = ({ onClose }: PrivacyPolicyContentProps) => (
    <LegalDocumentView document={PRIVACY_POLICY} icon={icons.privacy} onClose={onClose} />
);

export default PrivacyPolicyContent;
