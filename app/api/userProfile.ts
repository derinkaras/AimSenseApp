// app/api/userProfile.ts
import { supabase } from "@/app/lib/supabase";
import { apiCache } from "./apiCache";
import type {
    UserProfile,
    CreateUserProfileData,
    UpdateUserProfileData
} from "../types/apiTypes";

const API_BASE_URL = "http://10.0.0.78:8080/api/v1";

// Configuration for offline-first behavior
const CONFIG = {
    // Shorter timeout for read operations
    READ_TIMEOUT_MS: 3000,

    // Longer timeout for write operations
    WRITE_TIMEOUT_MS: 8000,
};

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
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

export const userProfileApi = {
    /**
     * Create a new user profile
     * - Online: Creates on server immediately
     * - Offline/Slow: Queues operation and saves locally
     */
    createProfile: async (data: CreateUserProfileData): Promise<UserProfile> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/create`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(data),
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to create user profile');
            }

            // Cache the newly created profile
            await apiCache.set('user_profile_me', responseData);

            return responseData;
        } catch (error) {
            console.log('Create user profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                // Queue the operation for later sync
                await apiCache.addPendingOperation('CREATE', 'user_profile', data);

                // Save to local cache for immediate UI feedback
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
     * - Online: Fetches from server, caches result
     * - Offline/Slow: Returns cached data immediately
     */
    getMyProfile: async (): Promise<UserProfile | null> => {
        const cacheKey = 'user_profile_me';

        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/me`,
                {
                    method: 'GET',
                    headers,
                },
                CONFIG.READ_TIMEOUT_MS
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    // Clear any cached profile if server says none exists
                    await apiCache.clear(cacheKey);
                    return null;
                }
                throw new Error(data.message || 'Failed to get user profile');
            }

            // Cache successful response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('API call failed or timed out, checking cache...', error);

            // Return cached data if available
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

            // Real API error - throw it
            throw error;
        }
    },

    /**
     * Update user profile
     * - Online: Updates on server immediately
     * - Offline/Slow: Queues operation and updates locally
     */
    updateProfile: async (data: UpdateUserProfileData): Promise<UserProfile> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/me`,
                {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(data),
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to update profile');
            }

            // Update cache after successful update
            await apiCache.set('user_profile_me', responseData);

            return responseData;
        } catch (error) {
            console.log('Update user profile failed, queueing for later...', error);

            if (isNetworkOrTimeoutError(error)) {
                // Queue the operation for later sync
                await apiCache.addPendingOperation('UPDATE', 'user_profile', data);

                // Optimistically update local cache
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
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/me`,
                {
                    method: 'DELETE',
                    headers,
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to delete profile');
            }

            // Clear cache after deletion
            await apiCache.clear('user_profile_me');
        } catch (error) {
            console.log('Delete user profile failed:', error);

            if (isNetworkOrTimeoutError(error)) {
                // For security reasons, we might want to require online for deletion
                // But we can still queue it if desired
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
     * - This REQUIRES online connection for security
     */
    deleteAccount: async (): Promise<void> => {
        // Account deletion should not be queued - require online
        const headers = await getAuthHeaders();

        try {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/deleteAccount`,
                {
                    method: 'DELETE',
                    headers,
                },
                CONFIG.WRITE_TIMEOUT_MS
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to delete account');
            }

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