// app/api/userProfile.ts
import { supabase } from "@/app/lib/supabase";
import { apiCache } from "./apiCache";
import type {
    UserProfile,
    CreateUserProfileData,
    UpdateUserProfileData
} from "../types/apiTypes";

const API_BASE_URL = "http://10.0.0.78:8080/api/v1";

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
        })
    };
};

// Helper to detect network errors
const isNetworkError = (error: any): boolean => {
    const message = error?.message || '';
    return message.includes('Network') ||
        message.includes('fetch') ||
        message.includes('Failed to fetch') ||
        message.includes('network request failed');
};

export const userProfileApi = {
    createProfile: async (data: CreateUserProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/create`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
            }
        );

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'Failed to create user profile');
        }

        // Cache the newly created profile
        await apiCache.set('user_profile_me', responseData);

        return responseData;
    },

    getMyProfile: async (): Promise<UserProfile | null> => {
        const cacheKey = 'user_profile_me';

        try {
            const headers = await getAuthHeaders();
            const response = await fetch(
                `${API_BASE_URL}/userProfile/me`,
                {
                    method: 'GET',
                    headers,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(data.message || 'Failed to get user profile');
            }

            // ✅ Cache successful response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('API call failed, checking cache...', error);

            // ✅ Return cached data if available
            const cached = await apiCache.get(cacheKey);
            if (cached) {
                console.log('✅ Returning cached user profile');
                return cached;
            }

            // ✅ If network error with no cache, return null (not an error!)
            if (isNetworkError(error)) {
                console.log('📡 Offline with no cache - returning null (no profile yet)');
                return null; // User sees default "First Last" name, which is fine
            }

            // ❌ Real API error (server error, auth error, etc.) - throw it
            throw error;
        }
    },

    updateProfile: async (req: UpdateUserProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/me`,
            {
                method: 'PUT',
                headers,
                body: JSON.stringify(req),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update profile');
        }

        // ✅ Update cache after successful update
        await apiCache.set('user_profile_me', data);

        return data;
    },

    deleteProfile: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/userProfile/me`,
            {
                method: 'DELETE',
                headers,
            }
        );

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete profile');
        }

        // ✅ Clear cache after deletion
        await apiCache.clear('user_profile_me');
    },

    deleteAccount: async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/userProfile/deleteAccount`, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to delete account');
        }

        // ✅ Clear all cache after account deletion
        await apiCache.clear('user_profile_me');
        await apiCache.clear('gun_profiles_all');
    }
};