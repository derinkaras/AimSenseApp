// hooks/useApi.ts
import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
    initialFetch?: boolean; // Whether to fetch on mount
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
}

// Extract type from return of the passed in apiFn
export const useApi = <T,>(
    apiFn: () => Promise<T>,
    options: UseApiOptions<T> = {} // Default value
) => {
    const { initialFetch = true, onSuccess, onError } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // useCallback memoizes a function so that it does NOT get recreated on every render.
    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFn();
            setData(result);
            onSuccess?.(result); // if the function exists call it with this method optional chaining
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Something went wrong";
            setError(errorMessage);
            onError?.(errorMessage);
            console.error("API Error:", errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
        // React will only recreate the execute function if ANY of these change:
    }, []);

    useEffect(() => {
        if (initialFetch) {
            execute();
        }
    }, []);

    return {
        data,
        loading,
        error,
        refetch: execute, // Refetch is the alia for execute
        execute, // Alias for manual calls
    };
};


