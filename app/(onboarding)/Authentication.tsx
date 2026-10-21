import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/constants/icons";
import { useRouter } from "expo-router";
import CustomTextInput from "@/components/CustomTextInput";
import { useAuth } from "@/contexts/AuthContext";
import UniversalModal from "@/components/UniversalModal";
import ForgotPasswordContent from "@/components/contents/ForgotPasswordContent";
import PrivacyPolicyContent from "@/components/contents/PrivacyPolicyContent";
import TermsOfServiceContent from "@/components/contents/TermsOfServiceContent";
import SocialSignInButtons from "@/components/SocialSignInButtons";
import type { SocialProvider } from "@/services/socialAuth";

const Authentication = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(true);
    const [showForgotPasswordModal, setForgotPasswordModal] = useState(false);
    const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
    const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);

    const { signup, login, socialSignIn, loading, error, clearError } = useAuth();

    // Apple / Google create the account on first use, so this covers sign up and sign in
    const handleSocialSignIn = async (provider: SocialProvider) => {
        if (loading || socialBusy) return;
        setSocialBusy(provider);
        const res = await socialSignIn(provider);
        setSocialBusy(null);
        if (res.success) {
            router.replace("/(tabs)/Home");
        }
    };

    const handleSubmit = async () => {
        if (loading) return;
        // Optional: clear old error before new submit
        if (clearError) clearError();

        if (isSignUp) {
            const res = await signup(email, password);
            if (res?.success) {
                router.replace("/(tabs)/Home");
            }
            return;
        }
        const res = await login(email, password);
        if (res?.success) {
            router.replace("/(tabs)/Home");
        }

    };

    return (
      <View className="flex-1 bg-brand-black">
        <UniversalModal visible={showForgotPasswordModal} onClose={()=>setForgotPasswordModal(false)} >
            <ForgotPasswordContent
                onSuccess={()=>setForgotPasswordModal(false)}
                onClose={()=>setForgotPasswordModal(false)}
            />
        </UniversalModal>

        <UniversalModal visible={legalModal === "privacy"} onClose={() => setLegalModal(null)}>
            <PrivacyPolicyContent onClose={() => setLegalModal(null)} />
        </UniversalModal>
        <UniversalModal visible={legalModal === "terms"} onClose={() => setLegalModal(null)}>
            <TermsOfServiceContent onClose={() => setLegalModal(null)} />
        </UniversalModal>

        <SafeAreaView className="flex-1">
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <TouchableOpacity
                onPress={() => router.back()}
                className="ml-6 mt-6 w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
                <Image
                    source={icons.leftArrow}
                    className="w-6 h-6"
                    tintColor="#0b7f4f"
                    resizeMode="contain"
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
              {loading && !socialBusy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-2xl font-semibold text-white">
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <SocialSignInButtons onSignIn={handleSocialSignIn} busy={socialBusy} />

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

            {/* Agreement (shown at sign up and sign in, since Apple / Google can create an account) */}
            <Text className="mt-8 text-white/45 text-xs text-center leading-5">
              By continuing, you agree to the{" "}
              <Text className="text-brand-greenLight" onPress={() => setLegalModal("terms")}>Terms of Service</Text>
              {" "}and{" "}
              <Text className="text-brand-greenLight" onPress={() => setLegalModal("privacy")}>Privacy Policy</Text>.
            </Text>
          </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
};

export default Authentication;
