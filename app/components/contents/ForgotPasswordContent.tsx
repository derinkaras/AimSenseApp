import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import icons from '@/app/constants/icons';
import authService from "@/app/api/authService";


interface ForgotPasswordContentProps {
    onClose?: () => void;
    onSuccess?: () => void;
}

const RESEND_SECONDS = 60;

const ForgotPasswordContent = ({ onClose, onSuccess }: ForgotPasswordContentProps) => {
    const [step, setStep] = useState<'email' | 'sent'>('email');
    const [email, setEmail] = useState('');
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

    return (
        <>
            <View className="gap-6 py-2">
                {/* Icon */}
                <View className="items-center justify-center">
                    <View className="bg-brand-green/10 p-6 rounded-full border-2 border-brand-green/30">
                        <Image
                            source={icons.lock}
                            className="size-12"
                            tintColor="#10b981"
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Header */}
                <View className="gap-2">
                    <Text className="text-white text-xl font-semibold text-center">
                        {step === 'email' ? 'Reset Password' : 'Check Your Email'}
                    </Text>
                    <Text className="text-gray-400 text-base text-center px-4">
                        {step === 'email'
                            ? 'Enter your email address and we\'ll send you a link to reset your password'
                            : `If an account exists for ${email.trim()}, a reset link is on its way. Open it to choose a new password, then log in.`}
                    </Text>
                </View>

                {/* Form */}
                {step === 'email' ? (
                    <View className="gap-4">
                        <View>
                            <Text className="text-white text-sm font-medium mb-2">Email Address</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor="#6b7280"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSendLink}
                            disabled={loading}
                            className={`bg-brand-green rounded-xl py-4 px-6 ${loading ? 'opacity-50' : ''}`}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-gray-800 rounded-xl py-4 px-6"
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="gap-4">
                        <TouchableOpacity
                            onPress={onSuccess ?? onClose}
                            className="bg-brand-green rounded-xl py-4 px-6"
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                Done
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleResend}
                            disabled={resendTimer > 0 || loading}
                            className={`bg-gray-800 rounded-xl py-4 px-6 ${(resendTimer > 0 || loading) ? 'opacity-50' : ''}`}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                {resendTimer > 0 ? `Resend Link (${resendTimer}s)` : 'Resend Link'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setStep('email')}
                            className="py-2"
                            activeOpacity={0.7}
                        >
                            <Text className="text-gray-400 text-center text-sm">
                                Use a different email
                            </Text>
                        </TouchableOpacity>
                    </View>
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
