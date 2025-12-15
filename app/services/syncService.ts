// app/services/syncService.ts
import { apiCache, PendingOperation } from '@/app/api/apiCache';
import { supabase } from '@/app/lib/supabase';

const API_BASE_URL = 'http://10.0.0.78:8080/api/v1';
const MAX_RETRIES = 5;
const SYNC_TIMEOUT = 10000; // 10 seconds per operation

type SyncResult = {
    success: boolean;
    syncedCount: number;
    failedCount: number;
    errors: string[];
};

type SyncCallbacks = {
    onSyncStart?: () => void;
    onSyncComplete?: (result: SyncResult) => void;
    onOperationSynced?: (operation: PendingOperation) => void;
    onOperationFailed?: (operation: PendingOperation, error: string) => void;
};

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
        })
    };
};

/**
 * Fetch with timeout - critical for detecting slow connections
 */
const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout: number = SYNC_TIMEOUT
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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

/**
 * Process a single gun profile operation
 */
const processGunProfileOperation = async (op: PendingOperation): Promise<void> => {
    const headers = await getAuthHeaders();

    switch (op.type) {
        case 'CREATE': {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/create`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(op.data),
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Create failed: ${response.statusText}`);
            }

            const result = await response.json();

            // Replace temp ID with real ID in cache
            if (op.tempId && result.id) {
                await apiCache.replaceTempId('gun_profiles_all', op.tempId, result.id);
            }
            break;
        }

        case 'UPDATE': {
            if (!op.entityId) throw new Error('No entityId for UPDATE operation');

            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/me/${op.entityId}`,
                {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(op.data),
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Update failed: ${response.statusText}`);
            }

            // Clear pending flag
            await apiCache.clearPendingFlag('gun_profiles_all', op.entityId);
            break;
        }

        case 'DELETE': {
            if (!op.entityId) throw new Error('No entityId for DELETE operation');

            const response = await fetchWithTimeout(
                `${API_BASE_URL}/gunProfile/me/${op.entityId}`,
                {
                    method: 'DELETE',
                    headers,
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Delete failed: ${response.statusText}`);
            }
            break;
        }
    }
};

/**
 * Process a single user profile operation
 */
const processUserProfileOperation = async (op: PendingOperation): Promise<void> => {
    const headers = await getAuthHeaders();

    switch (op.type) {
        case 'CREATE': {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/create`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(op.data),
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Create failed: ${response.statusText}`);
            }

            const result = await response.json();
            await apiCache.set('user_profile_me', result);
            break;
        }

        case 'UPDATE': {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/me`,
                {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(op.data),
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Update failed: ${response.statusText}`);
            }

            const result = await response.json();
            await apiCache.set('user_profile_me', result);
            break;
        }

        case 'DELETE': {
            const response = await fetchWithTimeout(
                `${API_BASE_URL}/userProfile/me`,
                {
                    method: 'DELETE',
                    headers,
                }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || `Delete failed: ${response.statusText}`);
            }

            await apiCache.clear('user_profile_me');
            break;
        }
    }
};

/**
 * Main sync service
 */
export const syncService = {
    /**
     * Check if we can reach the server (quick connectivity test)
     */
    canReachServer: async (timeout: number = 5000): Promise<boolean> => {
        try {
            const headers = await getAuthHeaders();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Use a lightweight endpoint or just check if we can connect
            const response = await fetch(`${API_BASE_URL}/gunProfile/me`, {
                method: 'GET',
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok || response.status === 401; // 401 means server is reachable
        } catch (error) {
            console.log('Server connectivity check failed:', error);
            return false;
        }
    },

    /**
     * Sync all pending operations
     */
    syncPendingOperations: async (callbacks?: SyncCallbacks): Promise<SyncResult> => {
        const result: SyncResult = {
            success: true,
            syncedCount: 0,
            failedCount: 0,
            errors: [],
        };

        try {
            callbacks?.onSyncStart?.();

            const operations = await apiCache.getPendingOperations();

            if (operations.length === 0) {
                console.log('✅ No pending operations to sync');
                callbacks?.onSyncComplete?.(result);
                return result;
            }

            console.log(`🔄 Starting sync of ${operations.length} pending operations...`);

            // Sort by timestamp (oldest first) to maintain order
            const sortedOps = [...operations].sort((a, b) => a.timestamp - b.timestamp);

            for (const op of sortedOps) {
                // Skip if too many retries
                if (op.retryCount >= MAX_RETRIES) {
                    console.log(`⚠️ Skipping operation ${op.id} - max retries exceeded`);
                    result.failedCount++;
                    result.errors.push(`Operation ${op.id} exceeded max retries`);
                    continue;
                }

                try {
                    console.log(`🔄 Syncing: ${op.type} ${op.entity} (${op.id})`);

                    if (op.entity === 'gun_profile') {
                        await processGunProfileOperation(op);
                    } else if (op.entity === 'user_profile') {
                        await processUserProfileOperation(op);
                    }

                    // Success - remove from queue
                    await apiCache.removePendingOperation(op.id);
                    result.syncedCount++;
                    callbacks?.onOperationSynced?.(op);

                    console.log(`✅ Synced: ${op.type} ${op.entity}`);
                } catch (error: any) {
                    console.log(`❌ Failed to sync ${op.id}:`, error.message);

                    // Increment retry count
                    await apiCache.incrementRetryCount(op.id);

                    result.failedCount++;
                    result.errors.push(`${op.type} ${op.entity}: ${error.message}`);
                    callbacks?.onOperationFailed?.(op, error.message);

                    // If it's a network/timeout error, stop trying other operations
                    if (error.message.includes('timed out') ||
                        error.message.includes('Network') ||
                        error.message.includes('fetch')) {
                        console.log('🛑 Network issue detected, stopping sync');
                        result.success = false;
                        break;
                    }
                }
            }

            // Determine overall success
            result.success = result.failedCount === 0;

            console.log(`📊 Sync complete: ${result.syncedCount} synced, ${result.failedCount} failed`);
            callbacks?.onSyncComplete?.(result);

            return result;
        } catch (error: any) {
            console.log('Sync service error:', error);
            result.success = false;
            result.errors.push(error.message);
            callbacks?.onSyncComplete?.(result);
            return result;
        }
    },

    /**
     * Get sync status for UI display
     */
    getSyncStatus: async (): Promise<{
        pendingCount: number;
        oldestPendingAge: number | null;
        hasFailedOperations: boolean;
    }> => {
        const operations = await apiCache.getPendingOperations();

        if (operations.length === 0) {
            return {
                pendingCount: 0,
                oldestPendingAge: null,
                hasFailedOperations: false,
            };
        }

        const oldest = Math.min(...operations.map(op => op.timestamp));
        const hasFailedOperations = operations.some(op => op.retryCount >= MAX_RETRIES);

        return {
            pendingCount: operations.length,
            oldestPendingAge: Date.now() - oldest,
            hasFailedOperations,
        };
    },

    /**
     * Clear all failed operations (user-triggered)
     */
    clearFailedOperations: async (): Promise<void> => {
        const operations = await apiCache.getPendingOperations();
        const failed = operations.filter(op => op.retryCount >= MAX_RETRIES);

        for (const op of failed) {
            await apiCache.removePendingOperation(op.id);
        }

        console.log(`🗑️ Cleared ${failed.length} failed operations`);
    },
};