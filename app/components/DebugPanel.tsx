// app/components/DebugPanel.tsx
// TEMPORARY - Remove this before production!

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNetworkStatus } from '@/app/contexts/NetworkStatusContext';
import { apiCache } from '@/app/api/apiCache';
import { syncService } from '@/app/services/syncService';

export const DebugPanel = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [pendingOps, setPendingOps] = useState<any[]>([]);

    const {
        isOnline,
        connectionQuality,
        isServerReachable,
        pendingOperationsCount,
        syncStatus,
        lastSyncTime,
        fakeOffline,
        toggleFakeOffline,
        triggerSync,
        checkConnection,
    } = useNetworkStatus();

    // Only show in development
    if (__DEV__ === false) return null;

    // Refresh pending operations list when expanded
    useEffect(() => {
        if (isExpanded) {
            const loadOps = async () => {
                const ops = await apiCache.getPendingOperations();
                setPendingOps(ops);
            };
            loadOps();

            const interval = setInterval(loadOps, 2000);
            return () => clearInterval(interval);
        }
    }, [isExpanded]);

    const formatTime = (timestamp: number | null) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleTimeString();
    };

    // Collapsed view - simple toggle button (matches your original style)
    if (!isExpanded) {
        return (
            <View className="absolute bottom-24 right-4 z-50">
                <TouchableOpacity
                    onPress={() => setIsExpanded(true)}
                    className={`px-4 py-3 rounded-xl border-2 ${
                        fakeOffline
                            ? 'bg-red-500 border-red-600'
                            : 'bg-green-500 border-green-600'
                    }`}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-xs">
                        {fakeOffline ? '📡 OFFLINE' : '✅ ONLINE'}
                    </Text>
                    <Text className="text-white text-[10px] mt-1">
                        (Tap to expand)
                    </Text>
                </TouchableOpacity>

                <View className="mt-2 px-3 py-2 bg-black/80 rounded-lg">
                    <Text className="text-white text-[10px]">
                        Quality: {connectionQuality}
                    </Text>
                    <Text className="text-white text-[10px]">
                        Pending: {pendingOperationsCount}
                    </Text>
                    {syncStatus !== 'idle' && (
                        <Text className="text-white text-[10px]">
                            Sync: {syncStatus}
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    // Expanded view - full debug panel
    return (
        <View className="absolute bottom-24 left-4 right-4 z-50 bg-black/95 border-2 border-zinc-700 rounded-2xl p-4 max-h-80">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-base">🐛 Debug Panel</Text>
                <TouchableOpacity
                    onPress={() => setIsExpanded(false)}
                    className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
                >
                    <Text className="text-white text-lg">×</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Connection Status */}
                <View className="mb-3 p-2 bg-zinc-900 rounded-xl">
                    <Text className="text-gray-400 text-[10px] uppercase mb-2">Connection</Text>
                    <View className="flex-row flex-wrap gap-1">
                        <View className={`px-2 py-1 rounded ${isOnline ? 'bg-green-900' : 'bg-red-900'}`}>
                            <Text className="text-white text-[10px]">
                                Network: {isOnline ? '✅' : '❌'}
                            </Text>
                        </View>
                        <View className={`px-2 py-1 rounded ${
                            connectionQuality === 'good' ? 'bg-green-900' :
                                connectionQuality === 'poor' ? 'bg-yellow-900' : 'bg-red-900'
                        }`}>
                            <Text className="text-white text-[10px]">
                                Quality: {connectionQuality}
                            </Text>
                        </View>
                        <View className={`px-2 py-1 rounded ${isServerReachable ? 'bg-green-900' : 'bg-red-900'}`}>
                            <Text className="text-white text-[10px]">
                                Server: {isServerReachable ? '✅' : '❌'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Sync Status */}
                <View className="mb-3 p-2 bg-zinc-900 rounded-xl">
                    <Text className="text-gray-400 text-[10px] uppercase mb-2">Sync Status</Text>
                    <View className="flex-row flex-wrap gap-1 mb-1">
                        <View className={`px-2 py-1 rounded ${
                            syncStatus === 'syncing' ? 'bg-blue-900' :
                                syncStatus === 'success' ? 'bg-green-900' :
                                    syncStatus === 'failed' ? 'bg-red-900' : 'bg-zinc-800'
                        }`}>
                            <Text className="text-white text-[10px]">
                                Status: {syncStatus}
                            </Text>
                        </View>
                        <View className={`px-2 py-1 rounded ${pendingOperationsCount > 0 ? 'bg-amber-900' : 'bg-zinc-800'}`}>
                            <Text className="text-white text-[10px]">
                                Pending: {pendingOperationsCount}
                            </Text>
                        </View>
                    </View>
                    <Text className="text-gray-500 text-[10px]">
                        Last sync: {formatTime(lastSyncTime)}
                    </Text>
                </View>

                {/* Pending Operations */}
                {pendingOps.length > 0 && (
                    <View className="mb-3 p-2 bg-zinc-900 rounded-xl">
                        <Text className="text-gray-400 text-[10px] uppercase mb-2">
                            Pending Ops ({pendingOps.length})
                        </Text>
                        {pendingOps.slice(0, 5).map((op, index) => (
                            <View key={op.id} className="mb-1 p-1.5 bg-zinc-800 rounded">
                                <Text className="text-white text-[10px] font-mono">
                                    {op.type} {op.entity}
                                </Text>
                                <Text className="text-gray-400 text-[9px]">
                                    Retries: {op.retryCount}
                                </Text>
                            </View>
                        ))}
                        {pendingOps.length > 5 && (
                            <Text className="text-gray-500 text-[10px]">
                                +{pendingOps.length - 5} more...
                            </Text>
                        )}
                    </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row flex-wrap gap-2">
                    <TouchableOpacity
                        onPress={toggleFakeOffline}
                        className={`px-3 py-2 rounded-lg border ${
                            fakeOffline
                                ? 'bg-red-500 border-red-600'
                                : 'bg-green-500 border-green-600'
                        }`}
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-[10px]">
                            {fakeOffline ? '🔴 Fake OFF' : '⚪ Fake ON'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={checkConnection}
                        className="px-3 py-2 rounded-lg bg-blue-600 border border-blue-700"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-[10px]">
                            🔄 Check
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={triggerSync}
                        className="px-3 py-2 rounded-lg bg-emerald-600 border border-emerald-700"
                        activeOpacity={0.8}
                        disabled={syncStatus === 'syncing'}
                    >
                        <Text className="text-white font-bold text-[10px]">
                            {syncStatus === 'syncing' ? '⏳...' : '☁️ Sync'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={async () => {
                            await syncService.clearFailedOperations();
                            const ops = await apiCache.getPendingOperations();
                            setPendingOps(ops);
                        }}
                        className="px-3 py-2 rounded-lg bg-orange-600 border border-orange-700"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white font-bold text-[10px]">
                            🗑️ Clear
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};