// app/contexts/NetworkStatusContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAKE_OFFLINE_KEY = 'DEBUG_FAKE_OFFLINE';

type NetworkStatusContextType = {
    isOnline: boolean;
    fakeOffline: boolean;
    toggleFakeOffline: () => Promise<void>;
};

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export const NetworkStatusProvider = ({ children }: { children: ReactNode }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [fakeOffline, setFakeOffline] = useState(false);

    // Load fake offline state from storage on mount
    useEffect(() => {
        const loadFakeOffline = async () => {
            const value = await AsyncStorage.getItem(FAKE_OFFLINE_KEY);
            setFakeOffline(value === 'true');
        };
        loadFakeOffline();
    }, []);

    // Listen to real network changes
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected ?? false);
        });

        return () => unsubscribe();
    }, []);

    // Toggle fake offline mode (for testing)
    const toggleFakeOffline = async () => {
        const newValue = !fakeOffline;
        setFakeOffline(newValue);
        await AsyncStorage.setItem(FAKE_OFFLINE_KEY, newValue.toString());
    };

    // Return fake offline if enabled, otherwise real status
    const effectiveIsOnline = fakeOffline ? false : isOnline;

    return (
        <NetworkStatusContext.Provider
            value={{
                isOnline: effectiveIsOnline,
                fakeOffline,
                toggleFakeOffline,
            }}
        >
            {children}
        </NetworkStatusContext.Provider>
    );
};

export const useNetworkStatus = () => {
    const context = useContext(NetworkStatusContext);
    if (!context) {
        throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
    }
    return context;
};