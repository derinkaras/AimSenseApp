// ============================================================
// src/hunt/speech.ts - Optional voice input (expo-speech-recognition)
// ============================================================
// expo-speech-recognition ships native code that Expo Go doesn't include, and importing it
// there crashes the screen. We only load the library when its native module is present, so
// in Expo Go (and on web) voice input is simply unavailable and the form stays typed-only.

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import type * as SpeechRecognition from "expo-speech-recognition";

type SpeechLib = typeof SpeechRecognition;

const speechLib: SpeechLib | null =
    Platform.OS !== "web" && requireOptionalNativeModule("ExpoSpeechRecognition")
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: only load when the native module exists
          (require("expo-speech-recognition") as SpeechLib)
        : null;

/** True when this build can do speech recognition (dev/production builds, not Expo Go or web) */
export const VOICE_AVAILABLE = speechLib !== null;

/** The native module, or null when voice input isn't available */
export const SpeechModule = speechLib?.ExpoSpeechRecognitionModule ?? null;

/** Same as useSpeechRecognitionEvent; a no-op when voice input isn't available */
export const useSpeechEvent: SpeechLib["useSpeechRecognitionEvent"] =
    speechLib?.useSpeechRecognitionEvent ?? (() => {});
