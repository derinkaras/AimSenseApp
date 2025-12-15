// app/api/apiCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'api_cache_';

export const apiCache = {
    /**
     * Save data to cache
     * @param key - Cache key (e.g., 'gun_profiles_all', 'user_profile_me')
     * @param data - Data to cache
     */
    set: async (key: string, data: any) => {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            const cacheData = {
                data,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.log('Cache set error:', error);
        }
    },

    /**
     * Get data from cache
     * @param key - Cache key
     * @returns Cached data or null if not found
     */
    get: async (key: string) => {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            const cached = await AsyncStorage.getItem(cacheKey);

            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);

            // ✅ Cache never expires - lasts until manually cleared or app uninstalled
            return data;
        } catch (error) {
            console.log('Cache get error:', error);
            return null;
        }
    },

    /**
     * Clear specific cache
     * @param key - Cache key to clear
     */
    clear: async (key: string) => {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.removeItem(cacheKey);
            console.log(`Cache cleared for key: ${key}`);
        } catch (error) {
            console.log('Cache clear error:', error);
        }
    },

    /**
     * Clear all app caches (optional - for logout/account deletion)
     */
    clearAll: async () => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
            console.log('All caches cleared');
        } catch (error) {
            console.log('Clear all caches error:', error);
        }
    },
};