import React from "react";
import icons from "@/constants/icons";
import LegalDocumentView from "@/legal/LegalDocumentView";
import { TERMS_OF_SERVICE } from "@/legal/content";

type TermsOfServiceContentProps = {
    onClose: () => void;
};

// The terms text lives in src/legal/content.ts
const TermsOfServiceContent = ({ onClose }: TermsOfServiceContentProps) => (
    <LegalDocumentView document={TERMS_OF_SERVICE} icon={icons.file} onClose={onClose} />
);

export default TermsOfServiceContent;
