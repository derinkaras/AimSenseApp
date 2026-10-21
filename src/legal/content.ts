// ============================================================
// src/legal/content.ts - Privacy Policy and Terms of Service text
// ============================================================
// One place for the legal text, shown in the app (Profile > Help & legal) and meant to be
// published at a public URL too (the App Store needs a Privacy Policy URL).
//
// Keep it TRUE to what the app does. If you add a data source (analytics, crash reporting,
// location, cloud photo uploads, in-app purchases...), update the matching section here,
// bump LEGAL_EFFECTIVE_DATE, and update the App Privacy answers in App Store Connect.
//
// Each section's `blocks` render in order: a string is a paragraph, a string[] is a bullet
// list. A bullet written "Label: text" shows the label in bold.

// TODO before release: fill these in (Apple requires the developer's name and contact details)
export const LEGAL_DEVELOPER_NAME = "AimSense"; // your legal name or company name
export const LEGAL_DEVELOPER_ADDRESS = "[Street address, City, Province/State, Country]";
export const LEGAL_GOVERNING_LAW = "[Province/State, Country]";

export const LEGAL_EFFECTIVE_DATE = "October 20, 2026"; // bump when the text changes
export const PRIVACY_EMAIL = "privacy@aimsense.app";
export const LEGAL_EMAIL = "legal@aimsense.app";

export type LegalBlock = string | string[];

export interface LegalSection {
    title: string;
    blocks: LegalBlock[];
}

export interface LegalDocument {
    title: string;
    intro: string;
    sections: LegalSection[];
}

// ==================== PRIVACY POLICY ====================

export const PRIVACY_POLICY: LegalDocument = {
    title: "Privacy Policy",
    intro:
        `This Privacy Policy explains what information the AimSense app ("AimSense", "we", "us") collects, how it is used, and the choices you have. AimSense is provided by ${LEGAL_DEVELOPER_NAME}. We collect only what the app needs to work, and we never sell your data.`,
    sections: [
        {
            title: "Information we collect",
            blocks: [
                "Information you give us, stored with your account:",
                [
                    "Account details: your email address and password, used to sign you in. Your password is handled by Google Firebase Authentication and is never visible to us.",
                    "Sign in with Apple or Google: if you choose this, we receive the email address and name that Apple or Google shares with us, and no password. With Apple you can choose to hide your email, in which case we only receive a private relay address from Apple.",
                    "Profile details (optional): your first and last name.",
                    "Rifle profiles: the details you enter for each rifle, such as its name, caliber, bullet weight, ballistic coefficient, muzzle velocity, zero distance, scope height, unit system, turret click value and scope magnification.",
                    "Account identifier: a random user ID created by Firebase so your data is linked to your account.",
                ],
            ],
        },
        {
            title: "Information that stays on your device",
            blocks: [
                "Some information is saved only on your phone and is never sent to us:",
                [
                    "Photos: if you add a profile or rifle photo, the image stays on your device. We save only a reference to it with your profile so the app can show it.",
                    "Scope calibration: the calibration for each rifle (camera zoom, rotation, crosshair position and level baseline).",
                    "Shot conditions and preferences: altitude, temperature and pressure you enter, your rangefinder mode, your preferred distance unit, and which tips you have dismissed.",
                    "Offline copies: a copy of your rifle profiles and any changes waiting to sync, so the app works without a connection.",
                ],
                "This information is removed when you delete the app, and the account data is removed when you delete your account.",
            ],
        },
        {
            title: "Device permissions",
            blocks: [
                "AimSense asks for permission before using these features. You can turn each one off at any time in your device Settings.",
                [
                    "Camera: shows the live view through your scope and draws the aiming overlay. The video is processed on your device in real time. AimSense does not record, save or upload any images or video.",
                    "Motion sensors: read how your phone is tilted to keep the rifle level and correct for cant and shot angle. This is processed on your device and not sent to us.",
                    "Photo library: lets you pick a profile or rifle photo. AimSense only accesses the photo you choose.",
                    "Microphone and speech recognition (optional): only used when you tap \"Say it instead\" to speak the distance and wind. Your speech is converted to text by your device's speech recognition service (Apple on iPhone, Google on Android), which may process the audio on its own servers under its own privacy policy. AimSense receives only the text, uses it to fill in the form, and does not save the audio or the text.",
                ],
            ],
        },
        {
            title: "What we do not collect",
            blocks: [
                [
                    "We do not collect your location.",
                    "We do not use advertising, advertising identifiers or third-party analytics.",
                    "We do not track you across other companies' apps or websites.",
                    "We do not sell, rent or share your personal information for advertising.",
                ],
            ],
        },
        {
            title: "How we use your information",
            blocks: [
                [
                    "To create and secure your account and sign you in.",
                    "To save your rifle profiles and make them available when you sign in.",
                    "To calculate bullet drop, wind drift and holdover for your shots.",
                    "To respond when you contact us for support.",
                ],
                "We use your information only to provide AimSense to you. Where the law requires a legal basis, we rely on providing the service you asked for (our contract with you) and, for optional features such as the microphone, your consent, which you can withdraw at any time.",
            ],
        },
        {
            title: "Service providers",
            blocks: [
                "We use Google Firebase (Firebase Authentication and Cloud Firestore), provided by Google LLC, to run sign-in and store your account and rifle profiles. Google processes this data on our behalf to provide the service and may store it on servers outside your country, including in the United States. Learn more at firebase.google.com/support/privacy.",
                "If you sign in with Apple or Google, they confirm who you are and share your name and email with us as described above, under their own privacy policies.",
                "If you use voice input, your speech is handled by Apple or Google as described above.",
                "We do not share your information with anyone else, except if required by law or to protect the safety of any person.",
            ],
        },
        {
            title: "How long we keep it",
            blocks: [
                "We keep your account and rifle profiles for as long as you have an account. When you delete your account, your profile, rifle profiles and sign-in account are permanently deleted from our systems, and if you signed in with Apple or Google, AimSense's access to that account is revoked. Any copies kept by our service provider for backup or security are removed on its standard schedule.",
            ],
        },
        {
            title: "Your choices and rights",
            blocks: [
                [
                    "Access and edit: view and change your profile and rifle profiles in the app at any time.",
                    "Delete: delete any rifle profile, or delete your whole account in the app under Profile > Account > Delete Account.",
                    "Get a copy: email us to request a copy of your data.",
                    "Permissions: turn camera, microphone, speech recognition, motion or photo access on or off in your device Settings.",
                ],
                "Depending on where you live (for example the EU, UK, Canada or California), you may have additional rights, such as to object to or restrict processing or to complain to your data protection authority. To use any of these rights, contact us at the email below. We will not treat you differently for using them.",
            ],
        },
        {
            title: "Security",
            blocks: [
                "Your data is sent over encrypted connections and stored by Google Firebase, which encrypts data at rest. No method of storage or transmission is completely secure, but we work to protect your information and limit access to it.",
            ],
        },
        {
            title: "Age requirement",
            blocks: [
                "AimSense is intended for adults. You must be at least 18 years old to create an account. We do not knowingly collect information from anyone under 18. If you believe a minor has created an account, contact us and we will delete it.",
            ],
        },
        {
            title: "Changes to this policy",
            blocks: [
                "If we change how we handle your information, we will update this policy and the effective date above. If the changes are significant, we will tell you in the app before they take effect.",
            ],
        },
        {
            title: "Contact us",
            blocks: [
                `Questions or requests about your privacy: ${PRIVACY_EMAIL}`,
                `${LEGAL_DEVELOPER_NAME}, ${LEGAL_DEVELOPER_ADDRESS}`,
            ],
        },
    ],
};

// ==================== TERMS OF SERVICE ====================

export const TERMS_OF_SERVICE: LegalDocument = {
    title: "Terms of Service",
    intro:
        `These Terms of Service ("Terms") are an agreement between you and ${LEGAL_DEVELOPER_NAME} ("we", "us") for your use of the AimSense app. By creating an account or using AimSense, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the app.`,
    sections: [
        {
            title: "1. What AimSense is",
            blocks: [
                "AimSense is an aiming aid for lawful sport shooting, target practice and regulated hunting. It uses your phone's camera and motion sensors, and the rifle details you enter, to estimate bullet drop, wind drift and holdover.",
                "AimSense provides estimates for information only. It is not a substitute for proper training, practice at known distances, or your own judgment.",
            ],
        },
        {
            title: "2. Safety comes first",
            blocks: [
                [
                    "Always follow safe firearm handling rules and the rules of the range or hunting area you are in.",
                    "Never point a firearm at anything you are not willing to destroy, and always be sure of your target and what is beyond it.",
                    "Check every result against your own data and confirm your zero at known distances before relying on AimSense.",
                    "Never use the app in a way that distracts you from handling a firearm safely.",
                ],
            ],
        },
        {
            title: "3. Accuracy and limitations",
            blocks: [
                "Results depend on many things outside our control, including the accuracy of the data you enter, your ammunition, your scope, how the phone is mounted and calibrated, sensor limits and changing weather. Results can be wrong.",
                "You are solely responsible for every shot you take and for verifying every calculation.",
            ],
        },
        {
            title: "4. Lawful use only",
            blocks: [
                "You must follow all laws that apply to you, including firearm ownership, transport and use laws, and hunting, licensing, season and wildlife regulations. You may not use AimSense:",
                [
                    "For any unlawful purpose, including poaching or hunting out of season or without a licence.",
                    "In any way that endangers people, animals or property.",
                    "To harm, threaten or harass anyone.",
                ],
            ],
        },
        {
            title: "5. Eligibility and your account",
            blocks: [
                "You must be at least 18 years old and legally allowed to use firearms where you live to use AimSense.",
                "Keep your password secure. You are responsible for activity under your account. Tell us right away if you think someone else has accessed it.",
                "You can delete your account at any time in the app under Profile > Account > Delete Account.",
            ],
        },
        {
            title: "6. Subscriptions and purchases",
            blocks: [
                "If AimSense offers paid features or subscriptions, they are purchased through the Apple App Store or Google Play and are subject to their terms:",
                [
                    "Payment is charged to your Apple ID or Google account when you confirm the purchase.",
                    "Subscriptions renew automatically unless you turn off auto-renew at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the period ends.",
                    "You can manage or cancel subscriptions in your device's account settings. Deleting the app or your account does not cancel a subscription.",
                    "If a free trial is offered, any unused part of it ends when you buy a subscription.",
                    "Refunds are handled by Apple or Google under their policies.",
                ],
            ],
        },
        {
            title: "7. Your content",
            blocks: [
                "You own the rifle profiles and other information you enter. You give us permission to store and process it only to provide AimSense to you, as described in our Privacy Policy.",
            ],
        },
        {
            title: "8. Our app and licence",
            blocks: [
                "We give you a personal, non-exclusive, non-transferable, revocable licence to use AimSense on devices you own or control, for your own non-commercial use, under these Terms and any App Store usage rules.",
                "AimSense, including its code, design and calculations, belongs to us and is protected by intellectual property laws. You may not copy, modify, reverse engineer, resell or redistribute the app.",
            ],
        },
        {
            title: "9. Changes and availability",
            blocks: [
                "We may update, change or stop parts of AimSense at any time, for example to improve calculations. We try to keep the app available but do not promise it will always work without interruption or errors.",
            ],
        },
        {
            title: "10. Disclaimer of warranties",
            blocks: [
                "To the fullest extent allowed by law, AimSense is provided \"as is\" and \"as available\", without warranties of any kind, including any warranty that results are accurate, that the app is fit for a particular purpose, or that it will be error free. Some places do not allow these exclusions, so some may not apply to you.",
            ],
        },
        {
            title: "11. Limitation of liability",
            blocks: [
                "To the fullest extent allowed by law, we are not liable for any indirect, incidental, special or consequential damages, or for any injury, death, property damage, missed or wounded game, legal penalty or other loss arising from your use of AimSense or reliance on its results. Our total liability for any claim is limited to the amount you paid us for AimSense in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law.",
            ],
        },
        {
            title: "12. Indemnity",
            blocks: [
                "You agree to cover any claims, losses or costs (including reasonable legal fees) brought against us because of your misuse of AimSense, your breach of these Terms or your breach of any law.",
            ],
        },
        {
            title: "13. Ending these Terms",
            blocks: [
                "You can stop using AimSense and delete your account at any time. We may suspend or end your access if you break these Terms or use the app unlawfully. Sections 3 and 10 to 15 continue to apply after these Terms end.",
            ],
        },
        {
            title: "14. Apple App Store terms",
            blocks: [
                "If you downloaded AimSense from the Apple App Store, you and we agree that:",
                [
                    "These Terms are between you and us only, not Apple. We, not Apple, are solely responsible for AimSense and its content.",
                    "Apple has no obligation to provide any maintenance or support for AimSense.",
                    "If AimSense fails to meet any warranty that applies, you may notify Apple and Apple will refund the purchase price (if any). To the extent allowed by law, Apple has no other warranty obligation for AimSense.",
                    "We, not Apple, are responsible for handling any claims about AimSense, including product liability claims, claims that it fails to meet legal or regulatory requirements, and consumer protection or privacy claims.",
                    "We, not Apple, are responsible for investigating and handling any claim that AimSense infringes someone's intellectual property.",
                    "You confirm you are not located in a country subject to a U.S. Government embargo or listed as a terrorist-supporting country, and you are not on any U.S. Government list of prohibited or restricted parties.",
                    "You must follow any third-party terms that apply when using AimSense, such as your wireless data agreement.",
                    "Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you.",
                ],
            ],
        },
        {
            title: "15. Governing law",
            blocks: [
                `These Terms are governed by the laws of ${LEGAL_GOVERNING_LAW}, except where the laws of the place you live give you rights that cannot be waived.`,
            ],
        },
        {
            title: "16. Changes to these Terms",
            blocks: [
                "We may update these Terms. We will change the effective date above and, for significant changes, tell you in the app before they take effect. If you keep using AimSense after changes take effect, you accept the updated Terms.",
            ],
        },
        {
            title: "17. Contact us",
            blocks: [
                `Questions about these Terms: ${LEGAL_EMAIL}`,
                `${LEGAL_DEVELOPER_NAME}, ${LEGAL_DEVELOPER_ADDRESS}`,
            ],
        },
    ],
};
