import React from 'react';
import {View, Text, ScrollView, Image, TouchableOpacity} from 'react-native';
import icons from '@/app/constants/icons';
import { LinearGradient } from 'expo-linear-gradient';
type PrivacyPolicyContentProps = {
    onClose: () => void;
}
const PrivacyPolicyContent = ({onClose}: PrivacyPolicyContentProps) => {

    return (
        <View className="gap-6 py-2">

            {/* Icon */}
            <View className="flex-row relative items-center justify-center">
                <TouchableOpacity
                    className="absolute left-0 p-2"
                    onPress={onClose}
                >
                    <Image
                        source={icons.leftArrow}
                        className="size-6"
                        tintColor="white"
                    />
                </TouchableOpacity>
                <View className="items-center justify-center">
                    <View className="bg-brand-green/10 p-6 rounded-full border-2 border-brand-green/30">
                        <Image
                            source={icons.lock} // or icons.lock if you have it
                            className="size-12"
                            tintColor="#10b981"
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </View>

            {/* Header */}
            <View className="gap-2">
                <Text className="text-white text-xl font-semibold text-center">
                    Privacy Policy
                </Text>
                <Text className="text-gray-500 text-sm text-center">
                    Effective Date: December 9, 2024
                </Text>
            </View>

            {/* Scrollable Content */}
            <View className="relative">
                <ScrollView
                    className="max-h-96 px-2"
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                >
                    <View className="gap-4">
                        {/* Intro */}
                        <Text className="text-gray-400 text-base text-center">
                            AimSense is a precision shooting assistant designed for sport shooting and target
                            practice that helps you make accurate shots.
                        </Text>

                        {/* Section 1 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Information We Collect
                            </Text>
                            <Text className="text-gray-400 text-base">
                                <Text className="text-white font-semibold">Account Information:{'\n'}</Text>
                                When you sign up, we require your email address and password for account authentication.
                                You can optionally provide your first name, last name, and profile photo to personalize
                                your account.{'\n\n'}

                                <Text className="text-white font-semibold">Rifle Profiles:{'\n'}</Text>
                                You create and store personal rifle profiles containing ballistic data such as caliber,
                                bullet weight, muzzle velocity, ballistic coefficient, zero distance, and scope height.
                                This information is used to calculate accurate shooting solutions.{'\n\n'}

                                <Text className="text-white font-semibold">Camera Access:{'\n'}</Text>
                                Our AR features require camera permissions to display real-time aiming overlays on your
                                screen. Camera feed is processed locally on your device and no images or video are stored
                                or transmitted to our servers. Scope calibration is performed each session and is not saved.
                            </Text>
                        </View>

                        {/* Section 2 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                How We Use Your Information
                            </Text>
                            <Text className="text-gray-400 text-base">
                                • Authenticate your identity and secure your account{'\n'}
                                • Store your rifle profiles so they're available across sessions{'\n'}
                                • Calculate precise bullet trajectories and drop compensation{'\n'}
                                • Display AR aiming points overlaid on your camera view{'\n'}
                                • Sync your data across multiple devices{'\n'}
                                • Improve app performance and user experience
                            </Text>
                        </View>

                        {/* Section 3 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Data Storage & Security
                            </Text>
                            <Text className="text-gray-400 text-base">
                                Your account information and rifle profiles are stored securely in Supabase's PostgreSQL
                                database with industry-standard encryption. Passwords are hashed and never stored in plain
                                text. We use JWT (JSON Web Token) authentication to protect your account from unauthorized
                                access.{'\n\n'}

                                All camera processing happens locally on your device in real-time. Scope calibration data
                                is temporary and exists only during your current session - it is never saved or transmitted.
                                No photos, videos, or camera data ever leave your phone.
                            </Text>
                        </View>

                        {/* Section 4 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Third-Party Services
                            </Text>
                            <Text className="text-gray-400 text-base">
                                We use the following trusted services:{'\n\n'}

                                • <Text className="text-white">Supabase</Text> - Secure cloud database and authentication{'\n'}
                                • <Text className="text-white">Expo</Text> - Mobile app development framework{'\n\n'}

                                These services have their own privacy policies and security measures in place.
                            </Text>
                        </View>

                        {/* Section 5 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Your Rights & Control
                            </Text>
                            <Text className="text-gray-400 text-base">
                                You have complete control over your data:{'\n\n'}

                                • <Text className="text-white">Access:</Text> View all your stored rifle profiles and account info{'\n'}
                                • <Text className="text-white">Edit:</Text> Update your profile or rifle data anytime{'\n'}
                                • <Text className="text-white">Delete:</Text> Remove individual rifles or your entire account through app settings{'\n'}
                                • <Text className="text-white">Export:</Text> Request a copy of your data by contacting us{'\n\n'}

                                When you delete your account, all associated data (email, profile info, rifles) is
                                permanently removed from our servers.
                            </Text>
                        </View>

                        {/* Section 6 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Data Sharing
                            </Text>
                            <Text className="text-gray-400 text-base">
                                We do not sell, rent, or share your personal information with third parties.
                                Your rifle profiles and shooting data remain private to your account only.
                            </Text>
                        </View>

                        {/* Section 7 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Age Requirement
                            </Text>
                            <Text className="text-gray-400 text-base">
                                AimSense is designed for sport shooting and target practice. You must be 18 years
                                or older to create an account and use this app. We do not knowingly collect
                                information from minors under 18.
                            </Text>
                        </View>

                        {/* Section 8 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Changes to This Policy
                            </Text>
                            <Text className="text-gray-400 text-base">
                                We may update this Privacy Policy as we add new features. When we make changes, we'll
                                update the effective date above. Continued use of AimSense after changes means you
                                accept the updated policy.
                            </Text>
                        </View>

                        {/* Section 9 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                Contact Us
                            </Text>
                            <Text className="text-gray-400 text-base">
                                Have questions about your privacy or data?{'\n\n'}

                                Email: <Text className="text-brand-green">privacy@aimsense.app</Text>{'\n'}

                                We'll respond to all privacy inquiries within 48 hours.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
                <LinearGradient
                    colors={['transparent', 'rgba(18,18,18,0.3)', 'rgba(18,18,18,0.6)', '#121212']}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 40,
                        pointerEvents: 'none'
                    }}
                />
            </View>
        </View>
    );
};

export default PrivacyPolicyContent;