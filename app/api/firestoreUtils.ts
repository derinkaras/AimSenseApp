// app/api/firestoreUtils.ts
// Shared helpers for the Firestore-backed API modules.
import { collection, doc } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";

export const READ_TIMEOUT_MS = 3000;
export const WRITE_TIMEOUT_MS = 8000;

export const requireUid = (): string => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not signed in");
    return uid;
};

export const userDoc = (uid: string) => doc(db, "users", uid);
export const gunProfilesCol = (uid: string) => collection(db, "users", uid, "gunProfiles");
export const gunProfileDoc = (uid: string, id: string) => doc(db, "users", uid, "gunProfiles", id);

/**
 * Firestore's JS SDK has no on-disk cache in React Native: while offline, reads reject
 * after a long delay and writes never resolve. Racing against a timeout lets the callers
 * fall back to apiCache / the pending-operation queue exactly like the old fetch flow.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Request timed out - connection too slow")), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });

export const isNetworkOrTimeoutError = (error: any): boolean => {
    const code = error?.code || "";
    const message = (error?.message || "").toLowerCase();
    return (
        code === "unavailable" ||
        code === "deadline-exceeded" ||
        code === "auth/network-request-failed" ||
        message.includes("offline") ||
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("timed out") ||
        message.includes("timeout")
    );
};
