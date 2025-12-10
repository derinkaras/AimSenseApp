import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/app/constants/icons";
import { useRouter } from "expo-router";
import CustomTextInput from "@/app/components/CustomTextInput";
import { useAuth } from "@/app/contexts/AuthContext";
import UniversalModal from "@/app/components/UniversalModal";
import ForgotPasswordContent from "@/app/components/contents/ForgotPasswordContent";

const Authentication = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(true);
    const [showForgotPasswordModal, setForgotPasswordModal] = useState(false);

    const { signup, login, loading, error, clearError } = useAuth();

    const handleSubmit = async () => {
        if (loading) return;
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
        <UniversalModal visible={showForgotPasswordModal} onClose={()=>setForgotPasswordModal(false)} >
            <ForgotPasswordContent
                onSuccess={()=>setForgotPasswordModal(false)}
                onClose={()=>setForgotPasswordModal(false)}
            />
        </UniversalModal>

        <SafeAreaView>
          <TouchableOpacity
            className="ml-6 mt-6"
            onPress={() => {
              router.back();
            }}>
            <Image
              source={icons.leftArrow}
              className="size-10"
              resizeMode="contain"
              tintColor="white"
            />
          </TouchableOpacity>

          <View className="mt-12 px-6">
            <Text className="text-3xl font-bold text-white">
              {isSignUp ? "Let's,\nGet Started" : 'Hey,\nWelcome Back'}
            </Text>

            <Text className="mt-6 text-xl font-semibold text-white">
              {isSignUp ? 'Create an account to begin aiming!' : 'Sign in and get back to work!'}
            </Text>

            <CustomTextInput
              icon={icons.mail}
              placeholder={'Enter your email'}
              stateVar={email}
              stateVarSetter={setEmail}
              clearError={clearError}
            />

            <CustomTextInput
              icon={icons.lock}
              placeholder={'Enter your password'}
              stateVar={password}
              stateVarSetter={setPassword}
              clearError={clearError}
            />

            {/* Optional inline error from context */}
            {error && (
              <Text className="mt-2 text-red-400" onPress={clearError}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`mt-6 rounded-xl bg-brand-green py-5 ${
                loading ? 'opacity-60' : 'active:bg-brand-greenLight'
              }`}>
              {loading ? (
                <ActivityIndicator />
              ) : (
                <Text className="text-center text-2xl font-semibold text-white">
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <View className="items-center justify-center gap-4">
              <View className="mt-6 flex-row items-center justify-center gap-2">
                <Text className="text-white">
                  {isSignUp ? 'Already have an account ?' : "Don't have an account ?"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                  }}>
                  <Text className="text-brand-greenLight">{isSignUp ? 'Sign in' : 'Sign up'}</Text>
                </TouchableOpacity>
              </View>

              {!isSignUp && (
                    <View>
                      <TouchableOpacity onPress={() => {setForgotPasswordModal(true)}}>
                        <Text className="text-right text-brand-greenLight">Forgot your password?</Text>
                      </TouchableOpacity>
                    </View>
                  )
              }
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
};

export default Authentication;
