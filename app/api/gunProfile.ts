// app/api/gunProfile.ts
import { deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { apiCache } from "./apiCache";
import {
    READ_TIMEOUT_MS,
    WRITE_TIMEOUT_MS,
    gunProfileDoc,
    gunProfilesCol,
    isNetworkOrTimeoutError,
    requireUid,
    withTimeout,
} from "./firestoreUtils";
import type {
    GunProfile,
    CreateGunProfileData,
    UpdateGunProfileData
} from "../types/apiTypes";

// Gun profiles live at users/{uid}/gunProfiles/{gunId}.
// Document IDs are generated on the client so a create that is queued offline (or that
// times out but still reaches Firestore later) can be replayed safely with setDoc.

export const gunProfileApi = {
    /**
     * Create a new gun profile
     * - Online: Writes to Firestore immediately
     * - Offline/Slow: Queues operation and saves locally for immediate UI feedback
     */
    createProfile: async (data: CreateGunProfileData): Promise<GunProfile | { id: string; _isPending: true }> => {
        const uid = requireUid();
        const ref = doc(gunProfilesCol(uid));

        try {
            await withTimeout(
                setDoc(ref, { ...data, createdAt: Date.now(), updatedAt: Date.now() }),
                WRITE_TIMEOUT_MS
            );

            await apiCache.clear('gun_profiles_all');

            return { ...data, id: ref.id };
        } catch (error) {
            console.log('Create profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                // Queue the operation for later sync (entityId = the Firestore doc ID to use on replay)
                const tempId = await apiCache.addPendingOperation(
                    'CREATE',
                    'gun_profile',
                    data,
                    ref.id
                );

                // Optimistically add to local cache for immediate UI feedback
                const optimisticProfile = {
                    ...data,
                    id: tempId,
                    _isPending: true,
                } as GunProfile & { _isPending: true };

                await apiCache.optimisticAdd('gun_profiles_all', optimisticProfile, tempId);

                console.log('✅ Created profile queued for sync, tempId:', tempId);

                return { ...optimisticProfile, id: tempId, _isPending: true };
            }

            // Real error (permissions, validation, etc.) - throw it
            throw error;
        }
    },

    /**
     * Get all user's gun profiles
     * - Online: Fetches from Firestore, caches result
     * - Offline/Slow: Returns cached data immediately
     */
    getAllUserGunProfiles: async (): Promise<GunProfile[]> => {
        const cacheKey = 'gun_profiles_all';

        try {
            const uid = requireUid();
            const snapshot = await withTimeout(getDocs(gunProfilesCol(uid)), READ_TIMEOUT_MS);

            const data = snapshot.docs
                .map(d => ({ ...d.data(), id: d.id }) as GunProfile & { createdAt?: number })
                .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

            // Cache the successful response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('Firestore call failed or timed out, checking cache...', error);

            // Return cached data if available
            const cached = await apiCache.get<GunProfile[]>(cacheKey);
            if (cached) {
                console.log('✅ Returning cached gun profiles (offline/slow connection)');
                return cached;
            }

            // If network error with no cache, return empty array (not an error)
            // User sees "No profiles" screen, which is better than an error
            if (isNetworkOrTimeoutError(error)) {
                console.log('📡 Offline/slow with no cache - returning empty array');
                return [];
            }

            throw error;
        }
    },

    /**
     * Get a specific gun profile by ID
     * - Online: Fetches from Firestore, caches result
     * - Offline/Slow: Returns cached data if available
     */
    getSpecificGunProfile: async (id: string): Promise<GunProfile> => {
        const cacheKey = `gun_profile_${id}`;

        // First, check if this is a pending (temp) profile
        if (id.startsWith('temp_')) {
            const allProfiles = await apiCache.get<GunProfile[]>('gun_profiles_all');
            const pendingProfile = allProfiles?.find(p => String(p.id) === id);
            if (pendingProfile) {
                console.log('✅ Returning pending profile from cache');
                return pendingProfile;
            }
        }

        try {
            const uid = requireUid();
            const snapshot = await withTimeout(getDoc(gunProfileDoc(uid, id)), READ_TIMEOUT_MS);

            if (!snapshot.exists()) {
                throw new Error('Gun profile not found');
            }

            const data = { ...snapshot.data(), id: snapshot.id } as GunProfile;

            // Cache the response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('Firestore call failed or timed out, checking cache...', error);

            // Return cached data if available
            const cached = await apiCache.get<GunProfile>(cacheKey);
            if (cached) {
                console.log('✅ Returning cached gun profile');
                return cached;
            }

            // Also check in the all-profiles cache
            const allProfiles = await apiCache.get<GunProfile[]>('gun_profiles_all');
            const fromAll = allProfiles?.find(p => String(p.id) === id);
            if (fromAll) {
                console.log('✅ Returning gun profile from all-profiles cache');
                return fromAll;
            }

            // No fallback for specific profile when editing - throw error
            throw error;
        }
    },

    /**
     * Update a specific gun profile
     * - Online: Updates Firestore immediately
     * - Offline/Slow: Queues operation and updates locally for immediate UI feedback
     */
    updateSpecificGunProfile: async (id: string, data: UpdateGunProfileData): Promise<GunProfile> => {
        // Handle pending profiles that haven't been synced yet
        if (id.startsWith('temp_')) {
            console.log('📝 Updating pending profile locally');
            await apiCache.optimisticUpdate<GunProfile>('gun_profiles_all', id, data);

            // Fold the edit into the queued CREATE (keeps its tempId and Firestore doc ID)
            const operations = await apiCache.getPendingOperations();
            const createOp = operations.find(
                op => op.entity === 'gun_profile' && op.tempId === id && op.type === 'CREATE'
            );
            if (createOp) {
                await apiCache.updatePendingOperationData(createOp.id, data);
            }

            const cached = await apiCache.get<GunProfile[]>('gun_profiles_all');
            return cached?.find(p => String(p.id) === id) || { ...data, id } as GunProfile;
        }

        try {
            const uid = requireUid();
            await withTimeout(
                updateDoc(gunProfileDoc(uid, id), { ...data, updatedAt: Date.now() }),
                WRITE_TIMEOUT_MS
            );

            // Clear caches after successful update
            await apiCache.clear(`gun_profile_${id}`);
            await apiCache.clear('gun_profiles_all');

            return { ...data, id } as GunProfile;
        } catch (error) {
            console.log('Update profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                // Queue the operation for later sync
                await apiCache.addPendingOperation('UPDATE', 'gun_profile', data, id);

                // Optimistically update local cache
                await apiCache.optimisticUpdate<GunProfile>('gun_profiles_all', id, data);

                console.log('✅ Update queued for sync');

                // Return merged data so UI updates immediately
                const cached = await apiCache.get<GunProfile[]>('gun_profiles_all');
                const updated = cached?.find(p => String(p.id) === id);
                if (updated) {
                    return updated;
                }

                return { ...data, id } as GunProfile;
            }

            throw error;
        }
    },

    /**
     * Delete a specific gun profile
     * - Online: Deletes from Firestore immediately
     * - Offline/Slow: Queues operation and removes locally for immediate UI feedback
     */
    deleteSpecificGunProfile: async (id: string): Promise<void> => {
        // Handle pending profiles that haven't been synced yet
        if (id.startsWith('temp_')) {
            console.log('🗑️ Deleting pending profile locally');
            await apiCache.optimisticDelete('gun_profiles_all', id);

            // Remove the pending CREATE operation
            const operations = await apiCache.getPendingOperations();
            const createOp = operations.find(
                op => op.entity === 'gun_profile' && op.tempId === id && op.type === 'CREATE'
            );
            if (createOp) {
                await apiCache.removePendingOperation(createOp.id);
            }
            return;
        }

        try {
            const uid = requireUid();
            await withTimeout(deleteDoc(gunProfileDoc(uid, id)), WRITE_TIMEOUT_MS);

            // Clear caches after successful delete
            await apiCache.clear(`gun_profile_${id}`);
            await apiCache.clear('gun_profiles_all');
        } catch (error) {
            console.log('Delete profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                // Queue the operation for later sync
                await apiCache.addPendingOperation('DELETE', 'gun_profile', undefined, id);

                // Optimistically remove from local cache
                await apiCache.optimisticDelete('gun_profiles_all', id);
                await apiCache.clear(`gun_profile_${id}`);

                console.log('✅ Delete queued for sync');
                return;
            }

            throw error;
        }
    },
};
