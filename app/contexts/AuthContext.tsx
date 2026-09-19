// app/contexts/AuthContext.tsx

import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import Toast from "react-native-toast-message";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    type User,
} from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { getAuthErrorMessage } from "@/app/lib/authErrors";
import { apiCache } from "@/app/api/apiCache";

type AuthContextType = {
    user: User | null;
    // ✅ Separate states: initializing = first auth check, loading = operations in progress
    initializing: boolean;  // True until Firebase restores (or clears) the persisted user
    loading: boolean;       // True during login/signup/logout operations
    error: string | null;
    clearError: () => void;
    signup: (
        email: string,
        password: string,
    ) => Promise<{ success: boolean } | undefined>;
    login: (
        email: string,
        password: string
    ) => Promise<{ success: boolean } | undefined>;
    logout: () => Promise<{ success: boolean }>;
    // Helper to check if we can reach the auth server
    checkAuthConnectivity: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Quick reachability check for Firebase (any HTTP response means we're online)
 */
const canReachFirebase = async (timeout: number = 5000): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        await fetch("https://identitytoolkit.googleapis.com/", {
            method: "HEAD",
            signal: controller.signal,
        });
        return true;
    } catch (error) {
        console.log("Firebase connectivity check failed:", error);
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    // ✅ Separate states to avoid conflicts
    const [initializing, setInitializing] = useState(true);  // First auth check
    const [loading, setLoading] = useState(false);           // Operations (login/signup/logout)
    const [error, setError] = useState<string | null>(null);

    const validateEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password: string) => password.length >= 6;

    const clearError = () => setError(null);

    // 🔐 Firebase restores the persisted user (works offline) and keeps us in sync
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log("Auth state changed:", firebaseUser ? "signed in" : "signed out");
            setUser(firebaseUser);
            // ✅ The first callback means the initial check has finished
            setInitializing(false);
        });

        return unsubscribe;
    }, []);

    /**
     * Check if we can perform auth operations (for UI to disable buttons)
     */
    const checkAuthConnectivity = async (): Promise<boolean> => {
        return await canReachFirebase();
    };

    /**
     * Shared email/password validation — shows a toast and returns false when invalid
     */
    const validateCredentials = (email: string, password: string): boolean => {
        if (!email || !password) {
            Toast.show({
                type: "error",
                text1: "Missing Fields",
                text2: "Please enter your email and password.",
            });
            return false;
        }

        if (!validateEmail(email)) {
            Toast.show({
                type: "error",
                text1: "Invalid Email",
                text2: "Please enter a valid email format.",
            });
            return false;
        }

        if (!validatePassword(password)) {
            Toast.show({
                type: "error",
                text1: "Weak Password",
                text2: "Password must be at least 6 characters.",
            });
            return false;
        }

        return true;
    };

    const signup = async (email: string, password: string) => {
        try {
            clearError();

            // ✅ Validate BEFORE setting loading or making API call
            if (!validateCredentials(email, password)) {
                return { success: false };
            }

            // ✅ Only set loading AFTER validation passes
            setLoading(true);

            // Firebase signs the new user in immediately (no email-confirmation gate)
            const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            setUser(credential.user);

            Toast.show({
                type: "success",
                text1: "Account Created",
                text2: "Welcome!",
            });

            setLoading(false);
            return { success: true };
        } catch (e: any) {
            const msg = getAuthErrorMessage(e);
            setError(msg);
            Toast.show({
                type: "error",
                text1: "Sign Up Failed",
                text2: msg,
            });
            setLoading(false);
            return { success: false };
        }
    };

    // 🔓 LOGIN (email/password)
    const login = async (email: string, password: string) => {
        try {
            clearError();

            // ✅ Validate BEFORE setting loading or making API call
            if (!validateCredentials(email, password)) {
                return { success: false };
            }

            // ✅ Only set loading AFTER validation passes
            setLoading(true);

            const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
            setUser(credential.user);

            Toast.show({
                type: "success",
                text1: "Login Successful",
                text2: "Welcome back!",
            });

            setLoading(false);
            return { success: true };
        } catch (e: any) {
            console.log("Login error:", e?.code, e?.message);
            const msg = getAuthErrorMessage(e);
            setError(msg);
            Toast.show({
                type: "error",
                text1: "Login Failed",
                text2: msg,
            });
            setLoading(false);
            return { success: false };
        }
    };

    // 🚪 LOGOUT - Always clears local state, attempts Firebase signout
    const logout = async (): Promise<{ success: boolean }> => {
        try {
            clearError();
            setLoading(true);

            // ✅ Try to sign out from Firebase (best effort)
            try {
                await signOut(auth);
                console.log("Firebase signOut successful");
            } catch (signOutError: any) {
                // Log but don't fail - we'll clear local state anyway
                console.log("Firebase signOut error (non-fatal):", signOutError?.message);
            }

            // ✅ ALWAYS clear local state regardless of server response
            console.log("Clearing local auth state");
            setUser(null);

            // ✅ Clear all cached data
            try {
                await apiCache.clearAll();
            } catch (cacheError) {
                console.log("Cache clear error (non-fatal):", cacheError);
            }

            setLoading(false);

            Toast.show({
                type: "success",
                text1: "Logged Out",
                text2: "See you next time!",
            });

            return { success: true };
        } catch (e: any) {
            console.log("Logout unexpected error:", e?.message);

            // ✅ Even on error, clear local state to ensure user can "escape"
            setUser(null);
            setLoading(false);

            return { success: true }; // Return success since local state is cleared
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                initializing,
                loading,
                error,
                clearError,
                signup,
                login,
                logout,
                checkAuthConnectivity,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
};
