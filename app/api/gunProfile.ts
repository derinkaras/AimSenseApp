// app/api/gunProfile.ts
import { supabase } from "@/app/lib/supabase";
import { apiCache } from "./apiCache";
import type {
    GunProfile,
    CreateGunProfileData,
    UpdateGunProfileData
} from "../types/apiTypes";

const API_BASE_URL = 'http://10.0.0.78:8080/api/v1';

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

// Helper to detect network errors
const isNetworkError = (error: any): boolean => {
    const message = error?.message || '';
    return message.includes('Network') ||
        message.includes('fetch') ||
        message.includes('Failed to fetch') ||
        message.includes('network request failed');
};

export const gunProfileApi = {
    createProfile: async (data: CreateGunProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/create`, {
            headers,
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || `Error ${response.statusText}`);
        }

        const result = await response.json();

        // Clear cache after creating new profile
        await apiCache.clear('gun_profiles_all');

        return result;
    },

    getAllUserGunProfiles: async (): Promise<GunProfile[]> => {
        const cacheKey = 'gun_profiles_all';

        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/gunProfile/me`, {
                headers,
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Error ${response.statusText}`);
            }

            const data = await response.json();

            // ✅ Cache the successful response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('API call failed, checking cache...', error);

            // ✅ Return cached data if available
            const cached = await apiCache.get(cacheKey);
            if (cached) {
                console.log('✅ Returning cached gun profiles');
                return cached;
            }

            // ✅ If network error with no cache, return empty array (not an error!)
            if (isNetworkError(error)) {
                console.log('📡 Offline with no cache - returning empty array');
                return []; // User sees "No profiles" screen, which is fine
            }

            // ❌ Real API error (server error, auth error, etc.) - throw it
            throw error;
        }
    },

    getSpecificGunProfile: async (id: string): Promise<GunProfile> => {
        const cacheKey = `gun_profile_${id}`;

        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/gunProfile/me/${id}`, {
                headers,
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Error ${response.statusText}`);
            }

            const data = await response.json();

            // ✅ Cache the response
            await apiCache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.log('API call failed, checking cache...', error);

            // ✅ Return cached data if available
            const cached = await apiCache.get(cacheKey);
            if (cached) {
                console.log('✅ Returning cached gun profile');
                return cached;
            }

            // ❌ No fallback for specific profile - throw error
            // (This is called when editing, so we need the specific data)
            throw error;
        }
    },

    updateSpecificGunProfile: async (id: string, data: UpdateGunProfileData) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/me/${id}`, {
            headers,
            method: 'PATCH',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || `Error ${response.statusText}`);
        }

        const result = await response.json();

        // ✅ Clear cache after successful update
        await apiCache.clear(`gun_profile_${id}`);
        await apiCache.clear('gun_profiles_all');

        return result;
    },

    deleteSpecificGunProfile: async (id: string) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/gunProfile/me/${id}`, {
            headers,
            method: 'DELETE',
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || `Error ${response.statusText}`);
        }

        // ✅ Clear cache after successful delete
        await apiCache.clear(`gun_profile_${id}`);
        await apiCache.clear('gun_profiles_all');

        return;
    }
};