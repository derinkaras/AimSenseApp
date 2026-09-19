// app/api/userProfile.ts
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { deleteDoc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "@/app/lib/firebase";
import { apiCache } from "./apiCache";
import {
    READ_TIMEOUT_MS,
    WRITE_TIMEOUT_MS,
    gunProfilesCol,
    isNetworkOrTimeoutError,
    requireUid,
    userDoc,
    withTimeout,
} from "./firestoreUtils";
import type {
    UserProfile,
    CreateUserProfileData,
    UpdateUserProfileData
} from "../types/apiTypes";

// The user profile lives at users/{uid} (the doc ID is the Firebase Auth uid).

export const userProfileApi = {
    /**
     * Create a new user profile
     * - Online: Writes to Firestore immediately
     * - Offline/Slow: Queues operation and saves locally
     */
    createProfile: async (data: CreateUserProfileData): Promise<UserProfile> => {
        try {
            const uid = requireUid();
            await withTimeout(
                setDoc(userDoc(uid), { ...data, updatedAt: Date.now() }, { merge: true }),
                WRITE_TIMEOUT_MS
            );

            const created: UserProfile = { ...data, id: uid };
            await apiCache.set('user_profile_me', created);

            return created;
        } catch (error) {
            console.log('Create user profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                await apiCache.addPendingOperation('CREATE', 'user_profile', data);

                const optimisticProfile = {
                    ...data,
                    _isPending: true,
                } as UserProfile & { _isPending: true };

                await apiCache.set('user_profile_me', optimisticProfile);

                console.log('✅ User profile creation queued for sync');
                return optimisticProfile;
            }

            throw error;
        }
    },

    /**
     * Get current user's profile
     * - Online: Fetches from Firestore, caches result
     * - Offline/Slow: Returns cached data immediately
     */
    getMyProfile: async (): Promise<UserProfile | null> => {
        const cacheKey = 'user_profile_me';

        try {
            const uid = requireUid();
            const snapshot = await withTimeout(getDoc(userDoc(uid)), READ_TIMEOUT_MS);

            if (!snapshot.exists()) {
                // Clear any cached profile if the server says none exists
                await apiCache.clear(cacheKey);
                return null;
            }

            const data = { ...snapshot.data(), id: snapshot.id } as UserProfile;
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('Firestore call failed or timed out, checking cache...', error);

            const cached = await apiCache.get<UserProfile>(cacheKey);
            if (cached) {
                console.log('✅ Returning cached user profile (offline/slow connection)');
                return cached;
            }

            // If network error with no cache, return null (not an error)
            // User sees default "First Last" name, which is acceptable
            if (isNetworkOrTimeoutError(error)) {
                console.log('📡 Offline/slow with no cache - returning null');
                return null;
            }

            throw error;
        }
    },

    /**
     * Update user profile
     * - Online: Updates Firestore immediately
     * - Offline/Slow: Queues operation and updates locally
     */
    updateProfile: async (data: UpdateUserProfileData): Promise<UserProfile> => {
        try {
            const uid = requireUid();
            await withTimeout(
                setDoc(userDoc(uid), { ...data, updatedAt: Date.now() }, { merge: true }),
                WRITE_TIMEOUT_MS
            );

            const existing = await apiCache.get<UserProfile>('user_profile_me');
            const updated: UserProfile = { ...existing, ...data, id: uid };
            await apiCache.set('user_profile_me', updated);

            return updated;
        } catch (error) {
            console.log('Update user profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                await apiCache.addPendingOperation('UPDATE', 'user_profile', data);

                const existing = await apiCache.get<UserProfile>('user_profile_me');
                const updated = {
                    ...existing,
                    ...data,
                    _isPending: true,
                } as UserProfile & { _isPending: true };

                await apiCache.set('user_profile_me', updated);

                console.log('✅ User profile update queued for sync');
                return updated;
            }

            throw error;
        }
    },

    /**
     * Delete user profile
     * - Note: This typically requires online connection for security
     */
    deleteProfile: async (): Promise<void> => {
        try {
            const uid = requireUid();
            await withTimeout(deleteDoc(userDoc(uid)), WRITE_TIMEOUT_MS);

            await apiCache.clear('user_profile_me');
        } catch (error) {
            console.log('Delete user profile failed:', error);

            if (isNetworkOrTimeoutError(error)) {
                await apiCache.addPendingOperation('DELETE', 'user_profile');
                await apiCache.clear('user_profile_me');

                console.log('✅ User profile deletion queued for sync');
                return;
            }

            throw error;
        }
    },

    /**
     * Delete entire account
     * - This REQUIRES an online connection and the user's current password.
     * - Order matters: Firestore rules need a signed-in user, so data is deleted first and
     *   the Auth user last. Re-authenticating up front (a) verifies the password before
     *   anything is deleted and (b) satisfies Firebase's "recent login" rule for deleteUser.
     */
    deleteAccount: async (password: string): Promise<void> => {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('Not signed in');

        try {
            await withTimeout(
                reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)),
                WRITE_TIMEOUT_MS
            );
        } catch (error: any) {
            if (
                error?.code === 'auth/wrong-password' ||
                error?.code === 'auth/invalid-credential'
            ) {
                throw new Error('Incorrect password');
            }
            if (isNetworkOrTimeoutError(error)) {
                throw new Error('Account deletion requires an internet connection. Please try again when online.');
            }
            throw error;
        }

        try {
            // 1. Delete all gun profiles and the user profile in one atomic batch
            const guns = await withTimeout(getDocs(gunProfilesCol(user.uid)), WRITE_TIMEOUT_MS);
            const batch = writeBatch(db);
            guns.docs.forEach(d => batch.delete(d.ref));
            batch.delete(userDoc(user.uid));
            await withTimeout(batch.commit(), WRITE_TIMEOUT_MS);

            // 2. Delete the Firebase Auth user
            await withTimeout(deleteUser(user), WRITE_TIMEOUT_MS);

            // Clear all cache after account deletion
            await apiCache.clear('user_profile_me');
            await apiCache.clear('gun_profiles_all');
        } catch (error) {
            if (isNetworkOrTimeoutError(error)) {
                throw new Error('Account deletion requires an internet connection. Please try again when online.');
            }
            throw error;
        }
    },
};
