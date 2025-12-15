// app/components/DebugPanel.tsx
// TEMPORARY - Remove this before production!

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '@/app/hooks/useNetworkStatus';

export const DebugPanel = () => {
    const { isOnline, fakeOffline, toggleFakeOffline } = useNetworkStatus();

    // Only show in development
    if (__DEV__ === false) return null;

    return (
        <View className="absolute bottom-24 right-4 z-50">
            <TouchableOpacity
                onPress={toggleFakeOffline}
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
                    (Tap to toggle)
                </Text>
            </TouchableOpacity>

            <View className="mt-2 px-3 py-2 bg-black/80 rounded-lg">
                <Text className="text-white text-[10px]">
                    Real: {isOnline ? 'Online' : 'Offline'}
                </Text>
                <Text className="text-white text-[10px]">
                    Fake: {fakeOffline ? 'ON' : 'OFF'}
                </Text>
            </View>
        </View>
    );
};