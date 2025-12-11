import React from 'react';
import {View, Text, ScrollView, Image, TouchableOpacity} from 'react-native';
import icons from '@/app/constants/icons';
import { LinearGradient } from 'expo-linear-gradient';

type TermsOfServiceContentProps = {
    onClose: () => void;
}

const TermsOfServiceContent = ({onClose}: TermsOfServiceContentProps) => {

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
                            source={icons.file}
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
                    Terms of Service
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
                            By using AimSense, you agree to these Terms of Service. Please read them carefully.
                        </Text>

                        {/* Section 1 */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                1. Acceptance of Terms
                            </Text>
                            <Text className="text-gray-400 text-base">
                                By accessing or using AimSense, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you may not use the app.
                            </Text>
                        </View>

                        {/* Section 2 – Intended Use */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                2. Intended Use
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`AimSense is intended exclusively for lawful and responsible use, including:\n\n• Sport shooting and marksmanship\n• Wildlife management and regulated hunting\n• Educational use related to ballistics and outdoor safety\n• Ballistic calculation and trajectory analysis\n\nYou must comply with all applicable local, state, provincial, federal, and international laws regarding equipment ownership and outdoor activity.`}
                            </Text>
                        </View>

                        {/* Section 3 – User Responsibilities */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                3. User Responsibilities
                            </Text>
                            <Text className="text-gray-400 text-base">
                                <Text className="text-white font-semibold">{`You are solely responsible for:\n\n`}</Text>
                                {`• Safe and lawful handling of any equipment\n• Independently confirming ballistic data\n• Following all local outdoor, safety, and range regulations\n• Ensuring you meet legal requirements for equipment ownership and use\n• Proper maintenance and calibration of your equipment\n• Understanding the technical limitations of the app\n\n`}
                                <Text className="text-white font-semibold">
                                    AimSense provides informational calculations only and does not replace certified training or responsible judgment.
                                </Text>
                            </Text>
                        </View>

                        {/* Section 4 – Age Requirement */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                4. Age Requirement
                            </Text>
                            <Text className="text-gray-400 text-base">
                                You must be at least 18 years old to create an account and use AimSense. By using this app, you represent that you meet this age requirement.
                            </Text>
                        </View>

                        {/* Section 5 – Account Security */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                5. Account Security
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`You are responsible for:\n\n• Maintaining the confidentiality of your account credentials\n• All activities that occur under your account\n• Notifying us immediately of any unauthorized access\n\nWe reserve the right to terminate accounts that violate these terms or are used for unlawful purposes.`}
                            </Text>
                        </View>

                        {/* Section 6 – Accuracy & Liability (revised) */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                6. Accuracy & Liability
                            </Text>
                            <Text className="text-gray-400 text-base">
                                <Text className="text-white font-semibold">{`IMPORTANT DISCLAIMER:\n\n`}</Text>
                                {`Ballistic calculations can vary depending on:\n\n• Correct user-provided input data\n• Environmental and weather conditions\n• Device sensor limitations\n• Variations in equipment and ammunition\n\n`}
                                <Text className="text-white font-semibold">AimSense is provided “AS IS” without warranties of any kind.</Text>
                                {` Users are responsible for independently verifying all calculations and ensuring safe, lawful, and responsible use of any equipment.`}
                            </Text>
                        </View>

                        {/* Section 7 – Prohibited Uses (revised) */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                7. Prohibited Uses
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`You may NOT use AimSense for:\n\n• Any unlawful activities\n• Violations of local firearm or hunting regulations\n• Unauthorized wildlife harvesting or unregulated hunting\n• Activities that endanger public safety\n• Creating, modifying, or distributing weapons or restricted components\n• Any use that violates applicable laws or these Terms\n\nViolations may result in account suspension and, where required, reporting to appropriate authorities.`}
                            </Text>
                        </View>

                        {/* Section 8 – IP */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                8. Intellectual Property
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`AimSense, including its code, design, algorithms, and content, is protected by copyright and other intellectual property laws. You may not:\n\n• Copy, modify, or reverse engineer the app\n• Redistribute or resell the app\n• Extract or reuse proprietary algorithms\n• Remove any copyright or proprietary notices`}
                            </Text>
                        </View>

                        {/* Section 9 – Privacy */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                9. Data & Privacy
                            </Text>
                            <Text className="text-gray-400 text-base">
                                Your use of AimSense is also governed by our Privacy Policy. We only collect and store the information necessary to provide our services. You retain ownership of your rifle profiles and ballistic data.
                            </Text>
                        </View>

                        {/* Section 10 – Service Availability */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                10. Service Availability
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`We reserve the right to:\n\n• Modify or discontinue features at any time\n• Perform maintenance that may limit access\n• Update ballistic algorithms and calculations\n• Change subscription pricing with notice\n\nWe are not liable for downtime, data loss, or interruptions.`}
                            </Text>
                        </View>

                        {/* Section 11 – Indemnification */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                11. Indemnification
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`You agree to indemnify and hold harmless AimSense and its developers from any claims, damages, or expenses arising from:\n\n• Your use of the app\n• Your violation of these terms\n• Your violation of any laws or regulations\n• Any incidents related to misuse of equipment or data`}
                            </Text>
                        </View>

                        {/* Section 12 – Changes */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                12. Changes to Terms
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`We may update these Terms of Service as the app evolves. When changes occur, we will update the effective date above and notify users when appropriate. Continued use constitutes acceptance of the updated terms.`}
                            </Text>
                        </View>

                        {/* Section 13 – Termination */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                13. Termination
                            </Text>
                            <Text className="text-gray-400 text-base">
                                You may delete your account at any time. We may suspend or terminate your account if you violate these terms or engage in prohibited activity.
                            </Text>
                        </View>

                        {/* Section 14 – Governing Law */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                14. Governing Law
                            </Text>
                            <Text className="text-gray-400 text-base">
                                These Terms are governed by applicable laws in your region. Any disputes shall be resolved through binding arbitration or in courts of competent jurisdiction.
                            </Text>
                        </View>

                        {/* Section 15 – Contact */}
                        <View className="gap-2">
                            <Text className="text-white text-lg font-semibold">
                                15. Contact
                            </Text>
                            <Text className="text-gray-400 text-base">
                                {`Questions about these Terms of Service?\n\nEmail: `}
                                <Text className="text-brand-green">legal@aimsense.app</Text>
                                {`\n\nWe typically respond within 48 hours.`}
                            </Text>
                        </View>

                        {/* Final Notice */}
                        <View className="gap-2 mt-4 p-4 bg-brand-green/10 rounded-lg border border-brand-green/30">
                            <Text className="text-white text-base font-semibold text-center">
                                Safety First
                            </Text>
                            <Text className="text-gray-400 text-sm text-center">
                                AimSense is designed to enhance your outdoor experience. Always prioritize safety, follow proper handling procedures, and verify all calculations independently. No app can replace professional training, experience, or responsible judgment.
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

export default TermsOfServiceContent;
