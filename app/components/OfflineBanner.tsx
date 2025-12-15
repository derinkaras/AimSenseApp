// app/components/OfflineBanner.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNetworkStatus } from '@/app/contexts/NetworkStatusContext';

type OfflineBannerProps = {
    compact?: boolean;
};

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ compact = false }) => {
    const {
        isOnline,
        connectionQuality,
        pendingOperationsCount,
        syncStatus,
        triggerSync,
        fakeOffline,
    } = useNetworkStatus();

    // Don't show anything if online with good connection and no pending ops
    if (isOnline && connectionQuality === 'good' && pendingOperationsCount === 0) {
        return null;
    }

    // Syncing state
    if (syncStatus === 'syncing') {
        return (
            <View className="mb-3 px-3 py-2.5 rounded-2xl bg-blue-900/80 border border-blue-700/50 flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-blue-800/60 items-center justify-center mr-2.5">
                    <ActivityIndicator size="small" color="#93c5fd" />
                </View>

                <View className="flex-1">
                    <Text className="text-blue-100 text-sm font-semibold mb-0.5">
                        Syncing...
                    </Text>
                    <Text className="text-blue-200/90 text-xs leading-4">
                        Uploading your changes to the server.
                    </Text>
                </View>
            </View>
        );
    }

    // Sync completed successfully (briefly show success state)
    if (syncStatus === 'success') {
        return (
            <View className="mb-3 px-3 py-2.5 rounded-2xl bg-green-900/80 border border-green-700/50 flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-green-800/60 items-center justify-center mr-2.5">
                    <Text className="text-lg">✅</Text>
                </View>

                <View className="flex-1">
                    <Text className="text-green-100 text-sm font-semibold">
                        All changes synced!
                    </Text>
                </View>
            </View>
        );
    }

    // Offline state
    if (!isOnline || connectionQuality === 'offline') {
        return (
            <View className="mb-3 px-3 py-2.5 rounded-2xl bg-amber-900/80 border border-amber-700/50">
                <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-amber-800/60 items-center justify-center mr-2.5">
                        <Text className="text-lg">📡</Text>
                    </View>

                    <View className="flex-1">
                        <Text className="text-amber-100 text-sm font-semibold mb-0.5">
                            Offline Mode {fakeOffline && __DEV__ ? '(TEST)' : ''}
                        </Text>
                        <Text className="text-amber-200/90 text-xs leading-4">
                            You're viewing cached data. Changes will sync when you're back online.
                        </Text>
                    </View>
                </View>

                {pendingOperationsCount > 0 && (
                    <View className="mt-2 ml-10">
                        <View className="self-start px-2.5 py-1 rounded-full bg-amber-800/60">
                            <Text className="text-amber-100 text-xs font-medium">
                                {pendingOperationsCount} change{pendingOperationsCount > 1 ? 's' : ''} pending
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    // Poor/slow connection state
    if (connectionQuality === 'poor') {
        return (
            <View className="mb-3 px-3 py-2.5 rounded-2xl bg-yellow-900/80 border border-yellow-700/50 flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-yellow-800/60 items-center justify-center mr-2.5">
                    <Text className="text-lg">⚠️</Text>
                </View>

                <View className="flex-1">
                    <Text className="text-yellow-100 text-sm font-semibold mb-0.5">
                        Slow Connection
                    </Text>
                    <Text className="text-yellow-200/90 text-xs leading-4">
                        Using cached data for faster loading.
                    </Text>
                </View>
            </View>
        );
    }

    // Online but has pending operations (sync may have failed previously)
    if (pendingOperationsCount > 0) {
        return (
            <TouchableOpacity
                onPress={triggerSync}
                activeOpacity={0.8}
                className="mb-3 px-3 py-2.5 rounded-2xl bg-emerald-900/80 border border-emerald-700/50"
            >
                <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-emerald-800/60 items-center justify-center mr-2.5">
                        <Text className="text-lg">☁️</Text>
                    </View>

                    <View className="flex-1">
                        <Text className="text-emerald-100 text-sm font-semibold mb-0.5">
                            {pendingOperationsCount} change{pendingOperationsCount > 1 ? 's' : ''} to sync
                        </Text>
                        <Text className="text-emerald-200/90 text-xs leading-4">
                            Tap to sync now
                        </Text>
                    </View>

                    <View className="px-3 py-1.5 rounded-full bg-emerald-700/60">
                        <Text className="text-emerald-100 text-xs font-semibold">Sync</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return null;
};

// Smaller inline indicator for headers/compact spaces
export const OfflineIndicator: React.FC = () => {
    const { isOnline, connectionQuality, pendingOperationsCount } = useNetworkStatus();

    if (isOnline && connectionQuality === 'good' && pendingOperationsCount === 0) {
        return null;
    }

    if (!isOnline || connectionQuality === 'offline') {
        return (
            <View className="flex-row items-center px-2 py-1 rounded-full bg-amber-900/50">
                <View className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                <Text className="text-amber-200 text-xs">Offline</Text>
            </View>
        );
    }

    if (connectionQuality === 'poor') {
        return (
            <View className="flex-row items-center px-2 py-1 rounded-full bg-yellow-900/50">
                <View className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />
                <Text className="text-yellow-200 text-xs">Slow</Text>
            </View>
        );
    }

    if (pendingOperationsCount > 0) {
        return (
            <View className="flex-row items-center px-2 py-1 rounded-full bg-emerald-900/50">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                <Text className="text-emerald-200 text-xs">{pendingOperationsCount} pending</Text>
            </View>
        );
    }

    return null;
};