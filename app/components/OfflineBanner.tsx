// app/components/OfflineBanner.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useNetworkStatus } from '@/app/hooks/useNetworkStatus';

export const OfflineBanner = () => {
    const { isOnline, fakeOffline } = useNetworkStatus();

    if (isOnline) return null;

    return (
        <View className="mb-3 px-3 py-2.5 rounded-2xl bg-amber-900/80 border border-amber-700/50 flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-amber-800/60 items-center justify-center mr-2.5">
                <Text className="text-lg">📡</Text>
            </View>

            <View className="flex-1">
                <Text className="text-amber-100 text-sm font-semibold mb-0.5">
                    Offline Mode {fakeOffline && __DEV__ ? '(TEST)' : ''}
                </Text>
                <Text className="text-amber-200/90 text-xs leading-4">
                    You're viewing cached data. Changes made offline won't be saved after closing the app.
                </Text>
            </View>
        </View>
    );
};