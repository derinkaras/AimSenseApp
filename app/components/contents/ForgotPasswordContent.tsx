import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import icons from '@/app/constants/icons';
import supabaseApi from "@/app/api/supabaseService";


interface ForgotPasswordContentProps {
    onClose?: () => void;
    onSuccess?: () => void;
}

const ForgotPasswordContent = ({ onClose, onSuccess }: ForgotPasswordContentProps) => {
    const [step, setStep] = useState<'email' | 'verify'>('email');
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [canResend, setCanResend] = useState(true);
    const [resendTimer, setResendTimer] = useState(60);

    const handleSendCode = async () => {
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
        if (!emailRegex.test(email)) {
            Toast.show({
                type: 'error',
                text1: 'Invalid Email',
                text2: 'Please enter a valid email address'
            });
            return;
        }

        setLoading(true);
        const result = await supabaseApi.sendResetCode(email);
        setLoading(false);

        if (result.success) {
            Toast.show({
                type: 'success',
                text1: 'Code Sent!',
                text2: result.message
            });
            setStep('verify');
            startResendTimer();
        } else {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: result.message
            });
        }
    };

    const handleResetPassword = async () => {
        if (!otpCode.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Code Required',
                text2: 'Please enter the verification code'
            });
            return;
        }

        if (!newPassword.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Password Required',
                text2: 'Please enter a new password'
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Password Mismatch',
                text2: 'Passwords do not match'
            });
            return;
        }

        if (newPassword.length < 6) {
            Toast.show({
                type: 'error',
                text1: 'Password Too Short',
                text2: 'Password must be at least 6 characters'
            });
            return;
        }

        setLoading(true);
        const result = await supabaseApi.resetPasswordWithCode(email, otpCode, newPassword);
        setLoading(false);

        if (result.success) {
            Toast.show({
                type: 'success',
                text1: 'Success!',
                text2: result.message
            });
            if (onSuccess) {
                onSuccess();
            }
        } else {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: result.message
            });
        }
    };

    const handleResendCode = async () => {
        if (!canResend) {
            Toast.show({
                type: 'error',
                text1: 'Please Wait',
                text2: `Please wait ${resendTimer} seconds before resending`
            });
            return;
        }

        setLoading(true);
        const result = await supabaseApi.resendResetCode(email);
        setLoading(false);

        if (result.success) {
            Toast.show({
                type: 'success',
                text1: 'Code Resent!',
                text2: result.message
            });
            startResendTimer();
        } else {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: result.message
            });
        }
    };

    const startResendTimer = () => {
        setCanResend(false);
        setResendTimer(60);

        const interval = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setCanResend(true);
                    return prev;
                }
                return prev - 1;
            });
        }, 1000);
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
                        {step === 'email' ? 'Reset Password' : 'Verify Code'}
                    </Text>
                    <Text className="text-gray-400 text-base text-center px-4">
                        {step === 'email'
                            ? 'Enter your email address and we\'ll send you a verification code'
                            : 'Enter the 8-digit code sent to your email'}
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
                            onPress={handleSendCode}
                            disabled={loading}
                            className={`bg-brand-green rounded-xl py-4 px-6 ${loading ? 'opacity-50' : ''}`}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                {loading ? 'Sending...' : 'Send Reset Code'}
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
                        <View>
                            <Text className="text-white text-sm font-medium mb-2">Verification Code</Text>
                            <TextInput
                                value={otpCode}
                                onChangeText={setOtpCode}
                                placeholder="Enter 8-digit code"
                                placeholderTextColor="#6b7280"
                                keyboardType="number-pad"
                                maxLength={8}
                                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg tracking-widest"
                            />
                        </View>

                        <View>
                            <Text className="text-white text-sm font-medium mb-2">New Password</Text>
                            <TextInput
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Enter new password"
                                placeholderTextColor="#6b7280"
                                secureTextEntry
                                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white"
                            />
                        </View>

                        <View>
                            <Text className="text-white text-sm font-medium mb-2">Confirm Password</Text>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm new password"
                                placeholderTextColor="#6b7280"
                                secureTextEntry
                                className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleResetPassword}
                            disabled={loading}
                            className={`bg-brand-green rounded-xl py-4 px-6 ${loading ? 'opacity-50' : ''}`}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleResendCode}
                            disabled={!canResend || loading}
                            className={`bg-gray-800 rounded-xl py-4 px-6 ${(!canResend || loading) ? 'opacity-50' : ''}`}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                {canResend ? 'Resend Code' : `Resend Code (${resendTimer}s)`}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setStep('email')}
                            className="py-2"
                            activeOpacity={0.7}
                        >
                            <Text className="text-gray-400 text-center text-sm">
                                Back to email
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