// app/api/apiCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'api_cache_';
const PENDING_OPS_KEY = 'pending_operations';

// Types for pending operations
export type PendingOperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type PendingOperationEntity = 'gun_profile' | 'user_profile';

export interface PendingOperation {
    id: string;                          // Unique ID for this operation
    type: PendingOperationType;
    entity: PendingOperationEntity;
    entityId?: string;                   // For UPDATE/DELETE - the server ID
    tempId?: string;                     // For CREATE - temporary local ID
    data?: any;                          // The payload
    timestamp: number;                   // When it was queued
    retryCount: number;                  // How many times we've tried
}

export const apiCache = {
    // ═══════════════════════════════════════════════════════════════
    // BASIC CACHE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Save data to cache
     */
    set: async (key: string, data: any): Promise<void> => {
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
     */
    get: async <T = any>(key: string): Promise<T | null> => {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            const cached = await AsyncStorage.getItem(cacheKey);

            if (!cached) return null;

            const { data } = JSON.parse(cached);
            return data as T;
        } catch (error) {
            console.log('Cache get error:', error);
            return null;
        }
    },

    /**
     * Clear specific cache
     */
    clear: async (key: string): Promise<void> => {
        try {
            const cacheKey = `${CACHE_PREFIX}${key}`;
            await AsyncStorage.removeItem(cacheKey);
            console.log(`Cache cleared for key: ${key}`);
        } catch (error) {
            console.log('Cache clear error:', error);
        }
    },

    /**
     * Clear all app caches
     */
    clearAll: async (): Promise<void> => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
            // Also clear pending operations
            await AsyncStorage.removeItem(PENDING_OPS_KEY);
            console.log('All caches cleared');
        } catch (error) {
            console.log('Clear all caches error:', error);
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // PENDING OPERATIONS QUEUE (for offline mutations)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Add an operation to the pending queue
     */
    addPendingOperation: async (
        type: PendingOperationType,
        entity: PendingOperationEntity,
        data?: any,
        entityId?: string,
    ): Promise<string> => {
        try {
            const operations = await apiCache.getPendingOperations();

            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const newOp: PendingOperation = {
                id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type,
                entity,
                entityId,
                tempId: type === 'CREATE' ? tempId : undefined,
                data,
                timestamp: Date.now(),
                retryCount: 0,
            };

            operations.push(newOp);
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(operations));

            console.log(`📝 Queued ${type} operation for ${entity}:`, newOp.id);
            return type === 'CREATE' ? tempId : entityId!;
        } catch (error) {
            console.log('Add pending operation error:', error);
            throw error;
        }
    },

    /**
     * Get all pending operations
     */
    getPendingOperations: async (): Promise<PendingOperation[]> => {
        try {
            const stored = await AsyncStorage.getItem(PENDING_OPS_KEY);
            if (!stored) return [];
            return JSON.parse(stored);
        } catch (error) {
            console.log('Get pending operations error:', error);
            return [];
        }
    },

    /**
     * Remove a pending operation (after successful sync)
     */
    removePendingOperation: async (operationId: string): Promise<void> => {
        try {
            const operations = await apiCache.getPendingOperations();
            const filtered = operations.filter(op => op.id !== operationId);
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(filtered));
            console.log(`✅ Removed pending operation: ${operationId}`);
        } catch (error) {
            console.log('Remove pending operation error:', error);
        }
    },

    /**
     * Merge new data into a queued operation's payload (keeps its id/tempId/entityId)
     */
    updatePendingOperationData: async (operationId: string, data: any): Promise<void> => {
        try {
            const operations = await apiCache.getPendingOperations();
            const updated = operations.map(op =>
                op.id === operationId
                    ? { ...op, data: { ...op.data, ...data } }
                    : op
            );
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.log('Update pending operation error:', error);
        }
    },

    /**
     * Update retry count for a failed operation
     */
    incrementRetryCount: async (operationId: string): Promise<void> => {
        try {
            const operations = await apiCache.getPendingOperations();
            const updated = operations.map(op =>
                op.id === operationId
                    ? { ...op, retryCount: op.retryCount + 1 }
                    : op
            );
            await AsyncStorage.setItem(PENDING_OPS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.log('Increment retry count error:', error);
        }
    },

    /**
     * Check if there are pending operations
     */
    hasPendingOperations: async (): Promise<boolean> => {
        const ops = await apiCache.getPendingOperations();
        return ops.length > 0;
    },

    /**
     * Get count of pending operations
     */
    getPendingCount: async (): Promise<number> => {
        const ops = await apiCache.getPendingOperations();
        return ops.length;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCAL OPTIMISTIC UPDATES (for immediate UI feedback)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Optimistically add an item to a cached list
     */
    optimisticAdd: async <T extends { id?: string | number }>(
        listKey: string,
        item: T,
        tempId: string,
    ): Promise<void> => {
        try {
            const cached = await apiCache.get<T[]>(listKey);
            const list = cached || [];

            // Add item with temp ID
            const itemWithTempId = { ...item, id: tempId, _isPending: true };
            list.push(itemWithTempId as T);

            await apiCache.set(listKey, list);
            console.log(`📌 Optimistically added item with tempId: ${tempId}`);
        } catch (error) {
            console.log('Optimistic add error:', error);
        }
    },

    /**
     * Optimistically update an item in a cached list
     */
    optimisticUpdate: async <T extends { id?: string | number }>(
        listKey: string,
        itemId: string,
        updates: Partial<T>,
    ): Promise<void> => {
        try {
            const cached = await apiCache.get<T[]>(listKey);
            if (!cached) return;

            const updated = cached.map(item =>
                String(item.id) === itemId
                    ? { ...item, ...updates, _isPending: true }
                    : item
            );

            await apiCache.set(listKey, updated);
            console.log(`📌 Optimistically updated item: ${itemId}`);
        } catch (error) {
            console.log('Optimistic update error:', error);
        }
    },

    /**
     * Optimistically delete an item from a cached list
     */
    optimisticDelete: async <T extends { id?: string | number }>(
        listKey: string,
        itemId: string,
    ): Promise<void> => {
        try {
            const cached = await apiCache.get<T[]>(listKey);
            if (!cached) return;

            const filtered = cached.filter(item => String(item.id) !== itemId);
            await apiCache.set(listKey, filtered);
            console.log(`📌 Optimistically deleted item: ${itemId}`);
        } catch (error) {
            console.log('Optimistic delete error:', error);
        }
    },

    /**
     * Replace a temp ID with the real server ID after sync
     */
    replaceTempId: async <T extends { id?: string | number }>(
        listKey: string,
        tempId: string,
        realId: string | number,
    ): Promise<void> => {
        try {
            const cached = await apiCache.get<T[]>(listKey);
            if (!cached) return;

            const updated = cached.map(item =>
                String(item.id) === tempId
                    ? { ...item, id: realId, _isPending: false }
                    : item
            );

            await apiCache.set(listKey, updated);
            console.log(`🔄 Replaced tempId ${tempId} with real ID ${realId}`);
        } catch (error) {
            console.log('Replace temp ID error:', error);
        }
    },

    /**
     * Mark an item as no longer pending
     */
    clearPendingFlag: async <T extends { id?: string | number; _isPending?: boolean }>(
        listKey: string,
        itemId: string,
    ): Promise<void> => {
        try {
            const cached = await apiCache.get<T[]>(listKey);
            if (!cached) return;

            const updated = cached.map(item =>
                String(item.id) === itemId
                    ? { ...item, _isPending: false }
                    : item
            );

            await apiCache.set(listKey, updated);
        } catch (error) {
            console.log('Clear pending flag error:', error);
        }
    },
};