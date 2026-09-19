// app/services/syncService.ts
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { apiCache, PendingOperation } from '@/app/api/apiCache';
import { auth } from '@/app/lib/firebase';
import {
    gunProfileDoc,
    gunProfilesCol,
    isNetworkOrTimeoutError,
    requireUid,
    userDoc,
    withTimeout,
} from '@/app/api/firestoreUtils';

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

/**
 * Process a single gun profile operation.
 * Every write is idempotent (fixed doc IDs), so replaying an op that already reached
 * Firestore (e.g. it timed out client-side but was delivered later) is harmless.
 */
const processGunProfileOperation = async (op: PendingOperation): Promise<void> => {
    const uid = requireUid();

    switch (op.type) {
        case 'CREATE': {
            // entityId is the Firestore doc ID generated when the op was queued
            const docId = op.entityId ?? doc(gunProfilesCol(uid)).id;

            await withTimeout(
                setDoc(gunProfileDoc(uid, docId), {
                    ...op.data,
                    createdAt: op.timestamp,
                    updatedAt: Date.now(),
                }),
                SYNC_TIMEOUT
            );

            // Replace temp ID with real ID in cache
            if (op.tempId) {
                await apiCache.replaceTempId('gun_profiles_all', op.tempId, docId);
            }
            break;
        }

        case 'UPDATE': {
            if (!op.entityId) throw new Error('No entityId for UPDATE operation');

            try {
                await withTimeout(
                    updateDoc(gunProfileDoc(uid, op.entityId), { ...op.data, updatedAt: Date.now() }),
                    SYNC_TIMEOUT
                );
            } catch (error: any) {
                // Profile was deleted elsewhere - nothing left to update
                if (error?.code !== 'not-found') throw error;
            }

            // Clear pending flag
            await apiCache.clearPendingFlag('gun_profiles_all', op.entityId);
            break;
        }

        case 'DELETE': {
            if (!op.entityId) throw new Error('No entityId for DELETE operation');

            // deleteDoc succeeds even if the doc no longer exists
            await withTimeout(deleteDoc(gunProfileDoc(uid, op.entityId)), SYNC_TIMEOUT);
            break;
        }
    }
};

/**
 * Process a single user profile operation
 */
const processUserProfileOperation = async (op: PendingOperation): Promise<void> => {
    const uid = requireUid();

    switch (op.type) {
        case 'CREATE':
        case 'UPDATE': {
            await withTimeout(
                setDoc(userDoc(uid), { ...op.data, updatedAt: Date.now() }, { merge: true }),
                SYNC_TIMEOUT
            );

            const existing = await apiCache.get<any>('user_profile_me');
            await apiCache.set('user_profile_me', { ...existing, ...op.data, id: uid, _isPending: undefined });
            break;
        }

        case 'DELETE': {
            await withTimeout(deleteDoc(userDoc(uid)), SYNC_TIMEOUT);
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
     * Check if we can reach Firebase (quick connectivity test)
     */
    canReachServer: async (timeout: number = 5000): Promise<boolean> => {
        const uid = auth.currentUser?.uid;
        if (!uid) return false;

        try {
            await withTimeout(getDoc(userDoc(uid)), timeout);
            return true;
        } catch (error: any) {
            // A permission error still proves the server answered
            if (error?.code === 'permission-denied') return true;
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
                    if (isNetworkOrTimeoutError(error)) {
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
