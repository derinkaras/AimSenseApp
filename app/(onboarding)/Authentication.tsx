import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/app/constants/icons";
import { useRouter } from "expo-router";
import CustomTextInput from "@/app/components/CustomTextInput";
import { useAuth } from "@/app/contexts/AuthContext";

const Authentication = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(true);

    const { signup, login, loading, error, clearError } = useAuth();
    // ^ include error/clearError if your context exposes them

    const handleSubmit = async () => {
        if (loading) return; // prevent double taps

        // Optional: clear old error before new submit
        if (clearError) clearError();

        if (isSignUp) {
            const res = await signup(email, password);
            if (res?.success) {
                router.replace("/(pages)/Home");
            }
            return;
        }

        const res = await login(email, password);
        if (res?.success) {
            router.replace("/(pages)/Home");
        }
    };

    return (
        <View className="flex-1 bg-brand-greenDark">
            <SafeAreaView>
                <TouchableOpacity
                    className="ml-6 mt-6"
                    onPress={() => {
                        router.back();
                    }}
                >
                    <Image
                        source={icons.leftArrow}
                        className="size-10"
                        resizeMode="contain"
                        tintColor="white"
                    />
                </TouchableOpacity>

                <View className="px-6 mt-12">
                    <Text className="text-3xl text-white font-bold">
                        {isSignUp ? "Let's,\nGet Started" : "Hey,\nWelcome Back"}
                    </Text>

                    <Text className="text-xl text-white font-semibold mt-6">
                        {isSignUp
                            ? "Create an account to begin aiming!"
                            : "Sign in and get back to work!"}
                    </Text>

                    <CustomTextInput
                        icon={icons.mail}
                        placeholder={"Enter your email"}
                        stateVar={email}
                        stateVarSetter={setEmail}
                        clearError={clearError}
                    />

                    <CustomTextInput
                        icon={icons.lock}
                        placeholder={"Enter your password"}
                        stateVar={password}
                        stateVarSetter={setPassword}
                        clearError={clearError}

                    />

                    {/* Optional inline error from context */}
                    {error && (
                        <Text
                            className="text-red-400 mt-2"
                            onPress={clearError}
                        >
                            {error}
                        </Text>
                    )}

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        className={`bg-brand-green py-5 rounded-xl mt-6 ${
                            loading ? "opacity-60" : "active:bg-brand-greenLight"
                        }`}
                    >
                        {loading ? (
                            <ActivityIndicator />
                        ) : (
                            <Text className="text-white text-2xl font-semibold text-center">
                                {isSignUp ? "Sign Up" : "Sign In"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row gap-2 justify-center items-center mt-6">
                        <Text className="text-white">
                            {isSignUp
                                ? "Already have an account ?"
                                : "Don't have an account ?"}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setIsSignUp(!isSignUp);
                            }}
                        >
                            <Text className="text-brand-greenLight">
                                {isSignUp ? "Sign in" : "Sign up"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default Authentication;
