import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import icons from '@/constants/icons';
import type { SocialProvider } from '@/services/socialAuth';

interface DeleteAccountContentProps {
  // Firebase requires a recent sign-in to delete an account: the password for email accounts,
  // or null for Apple / Google accounts (they confirm in the provider's sheet instead)
  onConfirm?: (password: string | null) => void;
  onCancel?: () => void;
  /** Set for Apple / Google accounts, which have no password */
  provider?: SocialProvider | null;
}

const REMOVED = [
  'Your account, email, name and profile photo',
  'All rifle profiles and ballistic data',
  'Your app preferences',
];

const PROVIDER_NAME: Record<SocialProvider, string> = {
  'apple.com': 'Apple',
  'google.com': 'Google',
};

const DeleteAccountContent = ({ onConfirm, onCancel, provider }: DeleteAccountContentProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View>
      {/* Icon */}
      <View className="items-center">
        <View className="size-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/50">
          <Image source={icons.trash} className="size-7" tintColor="#f87171" resizeMode="contain" />
        </View>
      </View>

      {/* Message */}
      <Text className="mt-4 text-center text-xl font-bold text-white">Delete your account?</Text>
      <Text className="mt-1 text-center text-sm text-white/60">This can&apos;t be undone.</Text>

      {/* What gets removed */}
      <View className="mt-5 rounded-2xl border border-red-500/30 bg-red-950/25 p-4">
        <Text className="mb-1 text-[11px] font-bold tracking-[0.14em] text-red-300">
          PERMANENTLY DELETED
        </Text>
        {REMOVED.map((item) => (
          <View key={item} className="mt-2 flex-row items-start">
            <Image
              source={icons.cancel}
              className="mr-2.5 mt-1 size-2.5"
              tintColor="#f87171"
              resizeMode="contain"
            />
            <Text className="flex-1 text-sm text-white/75">{item}</Text>
          </View>
        ))}
      </View>

      {/* Confirmation: Apple / Google sheet for social accounts, password otherwise */}
      {provider ? (
        <Text className="mt-5 text-center text-xs leading-4 text-white/60">
          {`To confirm it's you, ${PROVIDER_NAME[provider]} will ask you to sign in once more. This also removes AimSense's access to your ${PROVIDER_NAME[provider]} account.`}
        </Text>
      ) : (
        <>
          <Text className="mb-2 mt-5 text-xs font-semibold text-white/70">
            Enter your password to confirm
          </Text>
          <View className="flex-row items-center rounded-xl border border-brand-green/60 bg-brand-greenDark/60 px-4">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              className="flex-1 py-3 text-base text-white"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
              accessibilityRole="button">
              <Text className="text-xs font-semibold text-brand-greenLight">
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Actions */}
      <View className="mt-6 gap-2.5">
        <TouchableOpacity
          onPress={() => onConfirm?.(provider ? null : password)}
          disabled={!provider && !password}
          activeOpacity={0.85}
          className={`items-center rounded-2xl border border-red-400/40 bg-red-600/90 py-3.5 ${!provider && !password ? 'opacity-40' : ''}`}>
          <Text className="text-base font-bold text-white">
            {provider ? `Confirm with ${PROVIDER_NAME[provider]} & delete` : 'Delete my account'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.85}
          className="items-center rounded-2xl border border-brand-greenLight/60 bg-brand-green py-3.5">
          <Text className="text-base font-semibold text-white">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DeleteAccountContent;
