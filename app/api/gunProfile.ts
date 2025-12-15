// app/api/gunProfile.ts
import { supabase } from "@/app/lib/supabase";
import { apiCache } from "./apiCache";
import type {
    GunProfile,
    CreateGunProfileData,
    UpdateGunProfileData
} from "../types/apiTypes";

const API_BASE_URL = 'http://10.0.0.78:8080/api/v1';

// Configuration for offline-first behavior
const CONFIG = {
    // Timeout for API calls before falling back to cache (milliseconds)
    // 5 seconds is good for hunting scenarios with spotty connections
    REQUEST_TIMEOUT_MS: 5000,

    // Shorter timeout for read operations (we can fall back to cache faster)
    READ_TIMEOUT_MS: 3000,

    // Longer timeout for write operations (we want to try harder)
    WRITE_TIMEOUT_MS: 8000,
};

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(session?.access_token && {
            "Authorization": `Bearer ${session.access_token}`
        })
    };
};

// Helper to detect network/timeout errors
const isNetworkOrTimeoutError = (error: any): boolean => {
    const message = error?.message || '';
    return message.includes('Network') ||
        message.includes('fetch') ||
        message.includes('Failed to fetch') ||
        message.includes('network request failed') ||
        message.includes('timed out') ||
        message.includes('timeout') ||
        message.includes('AbortError') ||
        error?.name === 'AbortError';
};

/**
 * Fetch with timeout - essential for detecting slow connections
 * If the request takes longer than the timeout, it will abort and we fall back to cache
 */
const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout: number
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timed out - connection too slow');
        }
        throw error;
    }
};

export const gunProfileApi = {
    /**
     * Create a new gun profile
     * - Online: Creates on server immediately
     * - Offline/Slow: Queues operation and saves locally for immediate UI feedback
     */
    createProfile: async (data: CreateGunProfileData): Promise<GunProfile | { id: string; _isPending: true }> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/create`,
                {
                    headers,
                    method: 'POST',
                    body: JSON.stringify(data),
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || `Error ${response.statusText}`);
            }

            const result = await response.json();

            // Update cache with the new profile
            await apiCache.clear('gun_profiles_all');

            return result;
        } catch (error) {
            console.log('Create profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                // Queue the operation for later sync
                const tempId = await apiCache.addPendingOperation(
                    'CREATE',
                    'gun_profile',
                    data
                );

                // Optimistically add to local cache for immediate UI feedback
                const optimisticProfile = {
                    ...data,
                    id: tempId,
                    _isPending: true,
                } as GunProfile & { _isPending: true };

                await apiCache.optimisticAdd('gun_profiles_all', optimisticProfile, tempId);

                console.log('✅ Created profile queued for sync, tempId:', tempId);

                // Return the optimistic data so UI can update immediately
                return { ...optimisticProfile, id: tempId, _isPending: true };
            }

            // Real API error (validation, auth, etc.) - throw it
            throw error;
        }
    },

    /**
     * Get all user's gun profiles
     * - Online: Fetches from server, caches result
     * - Offline/Slow: Returns cached data immediately
     */
    getAllUserGunProfiles: async (): Promise<GunProfile[]> => {
        const cacheKey = 'gun_profiles_all';

        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/me`,
                {
                    headers,
                    method: 'GET',
                },
                CONFIG.READ_TIMEOUT_MS
            );

            if (!response.ok) {
                throw new Error(`Error ${response.statusText}`);
            }

            const data = await response.json();

            // Cache the successful response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('API call failed or timed out, checking cache...', error);

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

            // Real API error (server error, auth error, etc.) - throw it
            throw error;
        }
    },

    /**
     * Get a specific gun profile by ID
     * - Online: Fetches from server, caches result
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
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/me/${id}`,
                {
                    headers,
                    method: 'GET',
                },
                CONFIG.READ_TIMEOUT_MS
            );

            if (!response.ok) {
                throw new Error(`Error ${response.statusText}`);
            }

            const data = await response.json();

            // Cache the response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('API call failed or timed out, checking cache...', error);

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
     * - Online: Updates on server immediately
     * - Offline/Slow: Queues operation and updates locally for immediate UI feedback
     */
    updateSpecificGunProfile: async (id: string, data: UpdateGunProfileData): Promise<GunProfile> => {
        // Handle pending profiles that haven't been synced yet
        if (id.startsWith('temp_')) {
            console.log('📝 Updating pending profile locally');
            await apiCache.optimisticUpdate<GunProfile>('gun_profiles_all', id, data);

            // Update the pending CREATE operation with new data
            const operations = await apiCache.getPendingOperations();
            const createOp = operations.find(
                op => op.entity === 'gun_profile' && op.tempId === id && op.type === 'CREATE'
            );
            if (createOp) {
                createOp.data = { ...createOp.data, ...data };
                // This is a bit hacky but we need to update the operation
                await apiCache.removePendingOperation(createOp.id);
                await apiCache.addPendingOperation('CREATE', 'gun_profile', createOp.data);
            }

            const cached = await apiCache.get<GunProfile[]>('gun_profiles_all');
            return cached?.find(p => String(p.id) === id) || { ...data, id } as GunProfile;
        }

        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/me/${id}`,
                {
                    headers,
                    method: 'PATCH',
                    body: JSON.stringify(data),
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || `Error ${response.statusText}`);
            }

            const result = await response.json();

            // Clear caches after successful update
            await apiCache.clear(`gun_profile_${id}`);
            await apiCache.clear('gun_profiles_all');

            return result;
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

            // Real API error - throw it
            throw error;
        }
    },

    /**
     * Delete a specific gun profile
     * - Online: Deletes on server immediately
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
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/me/${id}`,
                {
                    headers,
                    method: 'DELETE',
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || `Error ${response.statusText}`);
            }

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

            // Real API error - throw it
            throw error;
        }
    },
};