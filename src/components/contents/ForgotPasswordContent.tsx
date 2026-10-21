import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import icons from '@/constants/icons';
import authService from "@/services/authService";


interface ForgotPasswordContentProps {
    onClose?: () => void;
    onSuccess?: () => void;
    /** Pre-fills the email, e.g. the signed-in user's on the Profile screen */
    initialEmail?: string;
}

const RESEND_SECONDS = 60;

const ForgotPasswordContent = ({ onClose, onSuccess, initialEmail }: ForgotPasswordContentProps) => {
    const [step, setStep] = useState<'email' | 'sent'>('email');
    const [email, setEmail] = useState(initialEmail ?? '');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startResendTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setResendTimer(RESEND_SECONDS);

        timerRef.current = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendLink = async () => {
        if (!email.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Email Required',
                text2: 'Please enter your email address'
            });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Toast.show({
                type: 'error',
                text1: 'Invalid Email',
                text2: 'Please enter a valid email address'
            });
            return;
        }

        setLoading(true);
        const result = await authService.sendPasswordReset(email);
        setLoading(false);

        if (result.success) {
            setStep('sent');
            startResendTimer();
        } else {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: result.message
            });
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        await handleSendLink();
    };

    const sent = step === 'sent';

    return (
        <>
            <View>
                {/* Icon: lock to start, envelope once the link is sent */}
                <View className="items-center">
                    <View className="size-16 rounded-2xl bg-brand-greenDark border border-brand-green/60 items-center justify-center">
                        <Image source={sent ? icons.mail : icons.lock} className="size-7" tintColor="#0b7f4f" resizeMode="contain" />
                    </View>
                </View>

                {/* Header */}
                <Text className="text-white text-xl font-bold text-center mt-4">
                    {sent ? 'Check your email' : 'Reset your password'}
                </Text>
                <Text className="text-white/60 text-sm leading-5 text-center mt-2 px-2">
                    {sent
                        ? 'If an account exists for this email, a reset link is on its way. Open it to choose a new password, then sign in.'
                        : "Enter your account email and we'll send you a link to choose a new password."}
                </Text>

                {sent ? (
                    <>
                        {/* Where it went */}
                        <View className="mt-5 flex-row items-center rounded-xl bg-brand-greenDark/60 border border-brand-green/60 px-4 py-3">
                            <Image source={icons.check} className="size-3.5 mr-2.5" tintColor="#0b7f4f" resizeMode="contain" />
                            <Text className="text-white text-sm font-semibold flex-1" numberOfLines={1}>{email.trim()}</Text>
                        </View>
                        <Text className="text-white/40 text-xs text-center mt-2">Not there? Check your spam or junk folder.</Text>

                        <View className="gap-2.5 mt-6">
                            <TouchableOpacity
                                onPress={onSuccess ?? onClose}
                                activeOpacity={0.85}
                                className="rounded-2xl bg-brand-green border border-brand-greenLight/60 py-3.5 items-center"
                            >
                                <Text className="text-white font-bold text-base">Back to sign in</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={resendTimer > 0 || loading}
                                activeOpacity={0.85}
                                className={`rounded-2xl bg-brand-black border border-brand-green/60 py-3.5 items-center ${resendTimer > 0 || loading ? 'opacity-50' : ''}`}
                            >
                                <Text className="text-white font-semibold text-base">
                                    {resendTimer > 0 ? `Resend link in ${resendTimer}s` : 'Resend link'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setStep('email')} activeOpacity={0.7} className="py-2">
                                <Text className="text-brand-greenLight text-center text-sm font-semibold">Use a different email</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Email */}
                        <Text className="text-white/70 text-xs font-semibold mt-5 mb-2">Email</Text>
                        <View className="h-12 flex-row items-center rounded-xl bg-brand-greenDark/60 border border-brand-green/60 px-4">
                            <Image source={icons.mail} className="size-4 mr-3" tintColor="rgba(255,255,255,0.45)" resizeMode="contain" />
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="you@example.com"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="email"
                                textContentType="emailAddress"
                                returnKeyType="send"
                                onSubmitEditing={handleSendLink}
                                className="flex-1 h-full text-white"
                                // No platform padding or line height (text-base adds one), so the text sits level with the icon
                                style={{ fontSize: 16, paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" }}
                            />
                        </View>

                        <View className="gap-2.5 mt-6">
                            <TouchableOpacity
                                onPress={handleSendLink}
                                disabled={loading}
                                activeOpacity={0.85}
                                className={`rounded-2xl bg-brand-green border border-brand-greenLight/60 py-3.5 items-center ${loading ? 'opacity-60' : ''}`}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Send reset link</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onClose}
                                activeOpacity={0.85}
                                className="rounded-2xl bg-brand-black border border-brand-green/60 py-3.5 items-center"
                            >
                                <Text className="text-white font-semibold text-base">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            {/* Toast component to display on top of modal */}
            <Toast
                config={{
                    success: (props) => (
                        <BaseToast
                            {...props}
                            style={{
                                backgroundColor: "#284a37", // brand.green
                                borderLeftColor: "#0b7f4f", // brand.greenLight
                                borderRadius: 12,
                                elevation: 5,
                                shadowColor: "#000",
                                shadowOpacity: 0.25,
                                shadowOffset: { width: 0, height: 2 },
                                shadowRadius: 4,
                                minHeight: 60,
                            }}
                            contentContainerStyle={{
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                            }}
                            text1Style={{
                                fontSize: 16,
                                fontWeight: "bold",
                                color: "#fff",
                            }}
                            text2Style={{
                                fontSize: 14,
                                color: "#e4eee8",
                            }}
                            text1NumberOfLines={0}
                            text2NumberOfLines={0}
                        />
                    ),
                    error: (props) => (
                        <ErrorToast
                            {...props}
                            style={{
                                backgroundColor: "#0e2018", // brand.greenDark
                                borderLeftColor: "#EF4444", // danger red accent
                                borderRadius: 12,
                                elevation: 5,
                                shadowColor: "#000",
                                shadowOpacity: 0.25,
                                shadowOffset: { width: 0, height: 2 },
                                shadowRadius: 4,
                                minHeight: 60,
                            }}
                            contentContainerStyle={{
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                            }}
                            text1Style={{
                                fontSize: 16,
                                fontWeight: "bold",
                                color: "#fff",
                            }}
                            text2Style={{
                                fontSize: 14,
                                color: "#dbe4de",
                            }}
                            text1NumberOfLines={0}
                            text2NumberOfLines={0}
                        />
                    ),
                }}
            />
        </>
    );
};

export default ForgotPasswordContent;
