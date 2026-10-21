// ============================================================
// src/services/socialAuth.ts - Sign in with Apple / Google (Firebase)
// ============================================================
// Apple: native sheet (expo-apple-authentication) -> Firebase OAuthProvider("apple.com").
//   Firebase needs a nonce: we send Apple the SHA-256 of a random string and give Firebase
//   the raw string, so the token can't be replayed.
// Google: native sheet (@react-native-google-signin) -> Firebase GoogleAuthProvider.
//
// Both need a development build. Google's native module is missing in Expo Go and crashes on
// import, so it is only loaded when present (same trick as src/hunt/speech.ts).
//
// Setup (once): enable Apple + Google in Firebase Console -> Authentication -> Sign-in method,
// put the Google client IDs in .env (see .env.example) and the reversed iOS client ID in
// app.json (google-signin plugin -> iosUrlScheme).

import { Platform, TurboModuleRegistry } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
    GoogleAuthProvider,
    OAuthProvider,
    getAdditionalUserInfo,
    reauthenticateWithCredential,
    revokeAccessToken,
    signInWithCredential,
    type User,
    type UserCredential,
} from "firebase/auth";
import type * as GoogleSignInLib from "@react-native-google-signin/google-signin";
import { auth } from "@/services/firebase";

export type SocialProvider = "apple.com" | "google.com";

const googleLib: typeof GoogleSignInLib | null =
    Platform.OS !== "web" && TurboModuleRegistry.get("RNGoogleSignin")
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: only load when the native module exists
          (require("@react-native-google-signin/google-signin") as typeof GoogleSignInLib)
        : null;

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** True when this build can show Google sign-in (native module present and client ID set). */
export const GOOGLE_SIGN_IN_AVAILABLE = googleLib !== null && !!GOOGLE_WEB_CLIENT_ID;

let googleConfigured = false;
function google() {
    if (!googleLib || !GOOGLE_WEB_CLIENT_ID) throw new Error("Google sign-in is not set up in this build.");
    if (!googleConfigured) {
        googleLib.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
        googleConfigured = true;
    }
    return googleLib;
}

/** Sign in with Apple only exists on iOS 13+ (and is required there if Google is offered). */
export async function isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    try {
        return await AppleAuthentication.isAvailableAsync();
    } catch {
        return false;
    }
}

/** Thrown-away result: the user closed the Apple / Google sheet. */
export class SignInCancelled extends Error {
    constructor() {
        super("Sign-in cancelled");
    }
}

export interface SocialSignInResult {
    user: User;
    isNewUser: boolean;
    /** Name from the provider, if it shared one (Apple only does on the very first sign-in) */
    firstName: string | null;
    lastName: string | null;
}

// ==================== APPLE ====================

async function appleCredential() {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    let apple: AppleAuthentication.AppleAuthenticationCredential;
    try {
        apple = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
        });
    } catch (error: any) {
        if (error?.code === "ERR_REQUEST_CANCELED") throw new SignInCancelled();
        throw error;
    }
    if (!apple.identityToken) throw new Error("Apple did not return a sign-in token. Please try again.");

    const credential = new OAuthProvider("apple.com").credential({ idToken: apple.identityToken, rawNonce });
    return { credential, apple };
}

export async function signInWithApple(): Promise<SocialSignInResult> {
    const { credential, apple } = await appleCredential();
    const result = await signInWithCredential(auth, credential);
    return toResult(result, apple.fullName?.givenName ?? null, apple.fullName?.familyName ?? null);
}

// ==================== GOOGLE ====================

async function googleCredential() {
    const lib = google();
    if (Platform.OS === "android") {
        await lib.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    let response: GoogleSignInLib.SignInResponse;
    try {
        response = await lib.GoogleSignin.signIn();
    } catch (error) {
        if (lib.isErrorWithCode(error) && error.code === lib.statusCodes.SIGN_IN_CANCELLED) throw new SignInCancelled();
        throw error;
    }
    if (!lib.isSuccessResponse(response)) throw new SignInCancelled();
    if (!response.data.idToken) throw new Error("Google did not return a sign-in token. Please try again.");

    return { credential: GoogleAuthProvider.credential(response.data.idToken), profile: response.data.user };
}

export async function signInWithGoogle(): Promise<SocialSignInResult> {
    const { credential, profile } = await googleCredential();
    const result = await signInWithCredential(auth, credential);
    return toResult(result, profile.givenName, profile.familyName);
}

function toResult(result: UserCredential, firstName: string | null, lastName: string | null): SocialSignInResult {
    return {
        user: result.user,
        isNewUser: getAdditionalUserInfo(result)?.isNewUser ?? false,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
    };
}

// ==================== ACCOUNT HELPERS ====================

/** The Apple / Google provider this account signs in with, or null for email + password. */
export function socialProviderOf(user: User | null): SocialProvider | null {
    const ids = user?.providerData.map((p) => p.providerId) ?? [];
    if (ids.includes("apple.com")) return "apple.com";
    if (ids.includes("google.com")) return "google.com";
    return null;
}

/**
 * Firebase only deletes an account after a fresh sign-in. Social accounts have no password, so
 * the user confirms through Apple / Google instead. For Apple this also returns what is needed
 * to revoke the app's Apple access after deletion (an App Store requirement).
 */
export async function reauthenticateSocial(user: User, provider: SocialProvider): Promise<{ appleAuthorizationCode: string | null }> {
    if (provider === "apple.com") {
        const { credential, apple } = await appleCredential();
        await reauthenticateWithCredential(user, credential);
        return { appleAuthorizationCode: apple.authorizationCode ?? null };
    }
    const { credential } = await googleCredential();
    await reauthenticateWithCredential(user, credential);
    return { appleAuthorizationCode: null };
}

/**
 * Revoke Apple's token / Google's grant so the link to the provider is fully removed.
 * Call it just BEFORE deleting the Firebase user: Firebase's Apple revoke needs a signed-in user.
 */
export async function revokeSocialAccess(provider: SocialProvider, appleAuthorizationCode: string | null) {
    try {
        if (provider === "apple.com" && appleAuthorizationCode) {
            await revokeAccessToken(auth, appleAuthorizationCode);
        } else if (provider === "google.com" && googleLib) {
            await google().GoogleSignin.revokeAccess();
        }
    } catch (error) {
        // A failed revoke must not block the user from deleting their account
        console.log("Revoking provider access failed (non-fatal):", error);
    }
}

/** Forget the Google account on this device, so the next sign-in can pick another one. */
export async function signOutSocial() {
    try {
        if (googleLib && googleConfigured) await googleLib.GoogleSignin.signOut();
    } catch (error) {
        console.log("Google sign-out failed (non-fatal):", error);
    }
}
