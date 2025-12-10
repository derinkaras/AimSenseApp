// src/context/AuthContext.tsx (or wherever you keep it)

import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import Toast from "react-native-toast-message";
import type { Session, User } from "@supabase/supabase-js";
import {supabase} from "@/app/lib/supabase";

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
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
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password: string) => password.length >= 6;

    const clearError = () => setError(null);

    // 🔐 Initialize session once on mount
    useEffect(() => {
        const initSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.log("Supabase getSession error:", error.message);
                setError(error.message);
                return;
            }
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
        };

        initSession();

        // 🔁 Keep user/session synced with Supabase
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signup = async (email: string, password: string) => {
        try {
            clearError();

            // ✅ Validate BEFORE setting loading or making API call
            if (!email || !password) {
                Toast.show({
                    type: "error",
                    text1: "Missing Fields",
                    text2: "Please enter your email and password.",
                });
                return { success: false };
            }

            if (!validateEmail(email)) {
                Toast.show({
                    type: "error",
                    text1: "Invalid Email",
                    text2: "Please enter a valid email format.",
                });
                return { success: false };
            }

            if (!validatePassword(password)) {
                Toast.show({
                    type: "error",
                    text1: "Weak Password",
                    text2: "Password must be at least 6 characters.",
                });
                return { success: false };
            }

            // ✅ Only set loading AFTER validation passes
            setLoading(true);

            // --- SAFEST POSSIBLE SIGNUP ---
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                Toast.show({
                    type: "error",
                    text1: "Sign Up Failed",
                    text2: error.message || "Please try again",
                });
                setLoading(false);
                return { success: false };
            }

            // Email confirmation enabled (default)
            if (!data.session) {
                Toast.show({
                    type: "success",
                    text1: "Check Your Email",
                    text2: "Confirm your account to continue.",
                });
                setLoading(false);
                return { success: true };
            }

            // If auto-confirmation is ON
            setSession(data.session);
            setUser(data.session.user);

            Toast.show({
                type: "success",
                text1: "Account Created",
                text2: "Welcome!",
            });

            setLoading(false);
            return { success: true };
        } catch (e: any) {
            const msg = e?.message ?? "Signup failed";
            setError(msg);
            Toast.show({
                type: "error",
                text1: "Sign Up Error",
                text2: msg,
            });
            setLoading(false);
        }
    };


    // 🔓 LOGIN (email/password only — standard Supabase login)
    const login = async (email: string, password: string) => {
        try {
            clearError();

            // ✅ Validate BEFORE setting loading or making API call
            if (!email || !password) {
                Toast.show({
                    type: "error",
                    text1: "Missing Fields",
                    text2: "Please enter your email and password.",
                });
                return { success: false };
            }

            if (!validateEmail(email)) {
                Toast.show({
                    type: "error",
                    text1: "Invalid Email",
                    text2: "Please enter a valid email format.",
                });
                return { success: false };
            }

            if (!validatePassword(password)) {
                Toast.show({
                    type: "error",
                    text1: "Weak Password",
                    text2: "Password must be at least 6 characters.",
                });
                return { success: false };
            }

            // ✅ Only set loading AFTER validation passes
            setLoading(true);

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                Toast.show({
                    type: "error",
                    text1: "Login Failed",
                    text2: error.message || "Please try again",
                });
                setLoading(false);
                return { success: false };
            }

            setSession(data.session);
            setUser(data.session?.user ?? null);

            Toast.show({
                type: "success",
                text1: "Login Successful",
                text2: "Welcome back!",
            });

            setLoading(false);
            return { success: true };
        } catch (e: any) {
            console.log("gets here")
            const msg = e?.message ?? "Login failed";
            setError(msg);
            Toast.show({
                type: "error",
                text1: "Login Failed",
                text2: msg,
            });
            setLoading(false);
        }
    };

    // 🚪 LOGOUT
    const logout = async () => {
        try {
            clearError();
            setLoading(true);

            const { error } = await supabase.auth.signOut();
            if (error) {
                setError(error.message);
                Toast.show({
                    type: "error",
                    text1: "Logout Failed",
                    text2: error.message || "Please try again",
                });
                setLoading(false);
                return;
            }

            setUser(null);
            setSession(null);
            // Not showing logout toast message here since we dont want account deletion toast to be overwritten

            setLoading(false);
        } catch (e: any) {
            const msg = e?.message ?? "Logout failed";
            setError(msg);
            Toast.show({
                type: "error",
                text1: "Logout Error",
                text2: msg,
            });
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                error,
                clearError,
                signup,
                login,
                logout,
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