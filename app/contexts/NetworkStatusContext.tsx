// app/contexts/NetworkStatusContext.tsx
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
    ReactNode
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { syncService } from '@/app/services/syncService';
import { apiCache } from '@/app/api/apiCache';

const FAKE_OFFLINE_KEY = 'DEBUG_FAKE_OFFLINE';

// Connection quality levels
export type ConnectionQuality = 'offline' | 'poor' | 'good';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed';

type NetworkStatusContextType = {
    // Connection status
    isOnline: boolean;
    connectionQuality: ConnectionQuality;
    isServerReachable: boolean;

    // Sync status
    pendingOperationsCount: number;
    syncStatus: SyncStatus;
    lastSyncTime: number | null;

    // Actions
    triggerSync: () => Promise<void>;
    checkConnection: () => Promise<void>;

    // Debug
    fakeOffline: boolean;
    toggleFakeOffline: () => Promise<void>;
};

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

// Configuration
const CONFIG = {
    // How long to wait for server response before considering connection "poor"
    SERVER_TIMEOUT_MS: 5000,

    // How often to check server reachability when online
    REACHABILITY_CHECK_INTERVAL_MS: 30000,

    // Minimum time between sync attempts
    MIN_SYNC_INTERVAL_MS: 10000,

    // Auto-sync when connection is restored
    AUTO_SYNC_ON_RECONNECT: true,
};

export const NetworkStatusProvider = ({ children }: { children: ReactNode }) => {
    // Basic network state
    const [isOnline, setIsOnline] = useState(true);
    const [fakeOffline, setFakeOffline] = useState(false);

    // Enhanced connection state
    const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
    const [isServerReachable, setIsServerReachable] = useState(true);

    // Sync state
    const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    // Refs for tracking
    const lastSyncAttempt = useRef<number>(0);
    const reachabilityCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const wasOffline = useRef(false);
    const appState = useRef(AppState.currentState);

    // Load fake offline state
    useEffect(() => {
        const loadFakeOffline = async () => {
            const value = await AsyncStorage.getItem(FAKE_OFFLINE_KEY);
            setFakeOffline(value === 'true');
        };
        loadFakeOffline();
    }, []);

    // Update pending operations count
    const updatePendingCount = useCallback(async () => {
        const count = await apiCache.getPendingCount();
        setPendingOperationsCount(count);
    }, []);

    // Check if server is reachable (connection quality test)
    const checkServerReachability = useCallback(async (): Promise<boolean> => {
        if (fakeOffline) {
            setIsServerReachable(false);
            setConnectionQuality('offline');
            return false;
        }

        try {
            const startTime = Date.now();
            const reachable = await syncService.canReachServer(CONFIG.SERVER_TIMEOUT_MS);
            const responseTime = Date.now() - startTime;

            setIsServerReachable(reachable);

            if (!reachable) {
                setConnectionQuality('offline');
            } else if (responseTime > 3000) {
                // Server responded but slowly - poor connection
                setConnectionQuality('poor');
            } else {
                setConnectionQuality('good');
            }

            return reachable;
        } catch (error) {
            console.log('Server reachability check failed:', error);
            setIsServerReachable(false);
            setConnectionQuality('offline');
            return false;
        }
    }, [fakeOffline]);

    // Trigger sync operation
    const triggerSync = useCallback(async () => {
        // Prevent rapid sync attempts
        const now = Date.now();
        if (now - lastSyncAttempt.current < CONFIG.MIN_SYNC_INTERVAL_MS) {
            console.log('🕐 Sync throttled - too soon since last attempt');
            return;
        }
        lastSyncAttempt.current = now;

        // Check if we have pending operations
        const hasPending = await apiCache.hasPendingOperations();
        if (!hasPending) {
            console.log('✅ No pending operations to sync');
            return;
        }

        // Check server reachability first
        const reachable = await checkServerReachability();
        if (!reachable) {
            console.log('🚫 Server not reachable, skipping sync');
            return;
        }

        setSyncStatus('syncing');

        const result = await syncService.syncPendingOperations({
            onSyncStart: () => {
                console.log('🔄 Sync started...');
            },
            onSyncComplete: async (syncResult) => {
                if (syncResult.success) {
                    setSyncStatus('success');
                    setLastSyncTime(Date.now());
                    console.log('✅ Sync completed successfully');
                } else {
                    setSyncStatus('failed');
                    console.log('⚠️ Sync completed with errors');
                }

                // Update pending count
                await updatePendingCount();

                // Reset status after a delay
                setTimeout(() => setSyncStatus('idle'), 3000);
            },
        });

        return result;
    }, [checkServerReachability, updatePendingCount]);

    // Manual connection check
    const checkConnection = useCallback(async () => {
        await checkServerReachability();
        await updatePendingCount();
    }, [checkServerReachability, updatePendingCount]);

    // Toggle fake offline mode
    const toggleFakeOffline = useCallback(async () => {
        const newValue = !fakeOffline;
        setFakeOffline(newValue);
        await AsyncStorage.setItem(FAKE_OFFLINE_KEY, newValue.toString());

        if (newValue) {
            setConnectionQuality('offline');
            setIsServerReachable(false);
        } else {
            // Re-check connection when disabling fake offline
            checkServerReachability();
        }
    }, [fakeOffline, checkServerReachability]);

    // Listen to network changes
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const online = state.isConnected ?? false;
            setIsOnline(online);

            if (!online) {
                setConnectionQuality('offline');
                setIsServerReachable(false);
                wasOffline.current = true;
            } else if (wasOffline.current) {
                // Just came back online
                console.log('📶 Network reconnected, checking server...');
                wasOffline.current = false;

                // Check server and potentially auto-sync
                checkServerReachability().then(reachable => {
                    if (reachable && CONFIG.AUTO_SYNC_ON_RECONNECT) {
                        console.log('🔄 Auto-syncing after reconnect...');
                        triggerSync();
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [checkServerReachability, triggerSync]);

    // Periodic server reachability checks when online
    useEffect(() => {
        if (!isOnline || fakeOffline) {
            if (reachabilityCheckInterval.current) {
                clearInterval(reachabilityCheckInterval.current);
                reachabilityCheckInterval.current = null;
            }
            return;
        }

        // Initial check
        checkServerReachability();

        // Periodic checks
        reachabilityCheckInterval.current = setInterval(() => {
            checkServerReachability();
        }, CONFIG.REACHABILITY_CHECK_INTERVAL_MS);

        return () => {
            if (reachabilityCheckInterval.current) {
                clearInterval(reachabilityCheckInterval.current);
            }
        };
    }, [isOnline, fakeOffline, checkServerReachability]);

    // Handle app state changes (coming back from background)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                console.log('📱 App came to foreground, checking connection...');
                checkConnection();

                // Try to sync if we have pending operations
                triggerSync();
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [checkConnection, triggerSync]);

    // Update pending count on mount and periodically
    useEffect(() => {
        updatePendingCount();

        const interval = setInterval(updatePendingCount, 5000);
        return () => clearInterval(interval);
    }, [updatePendingCount]);

    // Compute effective online status
    const effectiveIsOnline = fakeOffline ? false : (isOnline && isServerReachable);
    const effectiveConnectionQuality: ConnectionQuality = fakeOffline
        ? 'offline'
        : connectionQuality;

    return (
        <NetworkStatusContext.Provider
            value={{
                isOnline: effectiveIsOnline,
                connectionQuality: effectiveConnectionQuality,
                isServerReachable,
                pendingOperationsCount,
                syncStatus,
                lastSyncTime,
                triggerSync,
                checkConnection,
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