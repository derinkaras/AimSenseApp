// app/(tabs)/Profile.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import icons from "@/app/constants/icons";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNetworkStatus } from "@/app/contexts/NetworkStatusContext";
import EditNameModal from "@/app/components/EditNameModal";
import { userProfileApi } from "@/app/api/userProfile";
import UniversalModal from "@/app/components/UniversalModal";
import LogoutContent from "@/app/components/contents/LogoutContent";
import PrivacyPolicyContent from "@/app/components/contents/PrivacyPolicyContent";
import DeleteAccountContent from "@/app/components/contents/DeleteAccountContent";
import TermsOfServiceContent from "@/app/components/contents/TermsOfServiceContent";
import PremiumBadge from "@/app/components/profile/PremiumBadge";
import TrialBadge from "@/app/components/profile/TrialBadge";
import FreeBadge from "@/app/components/profile/FreeBadge";
import { OfflineBanner } from "@/app/components/OfflineBanner";
import { DebugPanel } from "@/app/components/DebugPanel";

type ActiveModal = "" | "Privacy" | "Terms of Service" | "Logout" | "Delete Account";
type SubscriptionTier = "premium" | "trial" | "free";

const Profile = () => {
    const [profilePhotoUri, setProfilePhotoUri] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<ActiveModal>("");
    const [subscription, setSubscription] = useState<SubscriptionTier>("premium");

    // ✅ Keep whether a profile exists so we don't re-fetch on every save
    const [hasProfile, setHasProfile] = useState<boolean>(false);

    const { user, logout } = useAuth();
    const { isOnline, connectionQuality } = useNetworkStatus();

    // Check if we have a stable connection for sensitive operations
    const hasStableConnection = isOnline && connectionQuality === "good";

    // Avoid setState on unmounted screen
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profileData = await userProfileApi.getMyProfile();

            if (!mountedRef.current) return;

            if (profileData) {
                setHasProfile(true);
                setFirstName(profileData.firstName || "");
                setLastName(profileData.lastName || "");
                setProfilePhotoUri(profileData.profilePhotoUri || "");
            } else {
                setHasProfile(false);
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Something went wrong loading the profile";
            console.log("loadProfile error:", message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const handleSaveName = async (newFirst: string, newLast: string) => {
        try {
            const data: any = {
                ...(newFirst && { firstName: newFirst }),
                ...(newLast && { lastName: newLast }),
                ...(profilePhotoUri && { profilePhotoUri }),
            };

            if (!hasProfile) {
                await userProfileApi.createProfile(data);
                if (!mountedRef.current) return;
                setHasProfile(true);

                Toast.show({
                    type: "success",
                    text1: "Profile Created",
                    text2: "Your profile has been saved.",
                });
            } else {
                await userProfileApi.updateProfile(data);
                if (!mountedRef.current) return;

                Toast.show({
                    type: "success",
                    text1: "Profile Updated",
                    text2: "Changes saved successfully.",
                });
            }

            setFirstName(newFirst);
            setLastName(newLast);
            setShowEditNameModal(false);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Something went wrong saving your name";
            console.log("handleSaveName error:", message);
            Toast.show({
                type: "error",
                text1: "Save failed",
                text2: message,
            });
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Toast.show({
                type: "error",
                text1: "Permission Denied",
                text2: "We need access to your photos to set a profile picture.",
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            return result.assets[0].uri;
        }
    };

    const handlePickPhoto = async () => {
        const imageUri = await pickImage();
        if (!imageUri) return;

        // Optimistic UI
        setProfilePhotoUri(imageUri);

        try {
            const data = { profilePhotoUri: imageUri };

            if (!hasProfile) {
                await userProfileApi.createProfile(data);
                if (!mountedRef.current) return;
                setHasProfile(true);
            } else {
                await userProfileApi.updateProfile(data);
                if (!mountedRef.current) return;
            }

            Toast.show({
                type: "success",
                text1: "Profile Updated",
                text2: "Profile picture saved.",
            });
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to save photo",
                text2: error?.message || "Please try again.",
            });
        }
    };

    const handleRemovePhoto = async () => {
        if (!profilePhotoUri) return;

        try {
            setProfilePhotoUri("");
            await userProfileApi.updateProfile({ profilePhotoUri: "" });

            Toast.show({
                type: "success",
                text1: "Photo Removed",
                text2: "Your profile picture has been cleared.",
            });
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Failed to remove photo",
                text2: error?.message || "Please try again.",
            });
        }
    };

    // ✅ Open modals with connection check for sensitive operations
    const handleOpenModal = (modalType: ActiveModal) => {
        if (modalType === "Logout" || modalType === "Delete Account") {
            if (!hasStableConnection) {
                Toast.show({
                    type: "error",
                    text1: "No Connection",
                });
                return;
            }
        }
        setActiveModal(modalType);
    };

    const handleDeleteAccount = async (password: string) => {
        try {
            if (!user) return;

            if (!hasStableConnection) {
                Toast.show({
                    type: "error",
                    text1: "No Connection",

                });
                setActiveModal("");
                return;
            }

            setLoading(true);
            await userProfileApi.deleteAccount(password);

            Toast.show({
                type: "success",
                text1: "Account Deleted",
                text2: "Your account has been permanently deleted.",
            });

            setActiveModal("");
            await logout();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete account";
            console.log("handleDeleteAccount error:", message);
            Toast.show({
                type: "error",
                text1: "Delete Failed",
                text2: message,
            });
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!hasStableConnection) {
            Toast.show({
                type: "error",
                text1: "No Connection",
                text2: "You need a stable internet connection to log out.",
            });
            setActiveModal("");
            return;
        }

        const result = await logout();

        if (result?.success) {
            setActiveModal("");
            Toast.show({
                type: "success",
                text1: "Logged Out",
                text2: "See you soon!",
            });
        }
        // If AuthContext shows error toast, no need to duplicate.
    };

    const displayFirst = firstName.trim() || "First";
    const displayLast = lastName.trim() || "Last";
    const closeModal = () => setActiveModal("");

    // ✅ Match the UI you said you want to keep
    const options = Object.entries({
        Privacy: { icon: icons.privacy },
        "Terms of Service": { icon: icons.file },
        Logout: { icon: icons.power },
        "Delete Account": { icon: icons.trash },
    }) as Array<[ActiveModal extends "" ? never : Exclude<ActiveModal, "">, { icon: any }]>;

    const requiresConnection = (key: string) => key === "Logout" || key === "Delete Account";

    // Keep your initial full-screen loader behavior
    if (loading && !firstName && !lastName) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#22c55e" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1" edges={["top"]}>
                {/* Edit name modal */}
                <EditNameModal
                    showEditNameModal={showEditNameModal}
                    onClose={() => setShowEditNameModal(false)}
                    firstName={firstName}
                    lastName={lastName}
                    setFirstName={setFirstName}
                    setLastName={setLastName}
                    handleSave={handleSaveName}
                />

                {/* Modals */}
                <UniversalModal visible={activeModal === "Logout"} onClose={closeModal}>
                    <LogoutContent onCancel={closeModal} onConfirm={handleLogout} />
                </UniversalModal>

                <UniversalModal visible={activeModal === "Privacy"} onClose={closeModal}>
                    <PrivacyPolicyContent onClose={closeModal} />
                </UniversalModal>

                <UniversalModal visible={activeModal === "Terms of Service"} onClose={closeModal}>
                    <TermsOfServiceContent onClose={closeModal} />
                </UniversalModal>

                <UniversalModal visible={activeModal === "Delete Account"} onClose={closeModal}>
                    <DeleteAccountContent onCancel={closeModal} onConfirm={handleDeleteAccount} />
                </UniversalModal>

                {/* ✅ Single ScrollView with proper padding */}
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* PROFILE CARD */}
                    <View className="mx-6 mt-6 rounded-2xl bg-brand-greenDark/30 border border-brand-green/40 p-6">
                        <View className="mb-2">
                            <OfflineBanner />
                        </View>

                        <View className="items-center gap-4">
                            {/* Avatar */}
                            <TouchableOpacity
                                onPress={handlePickPhoto}
                                activeOpacity={0.85}
                                className="size-32 items-center justify-center overflow-hidden rounded-full bg-brand-greenDark border-2 border-brand-green/80"
                            >
                                <Image
                                    source={profilePhotoUri ? { uri: profilePhotoUri } : icons.user}
                                    className="w-full h-full"
                                    style={{
                                        tintColor: profilePhotoUri ? undefined : "#0b7f4f",
                                        resizeMode: profilePhotoUri ? "cover" : "contain",
                                    }}
                                />
                            </TouchableOpacity>

                            {/* Remove photo / hint */}
                            {profilePhotoUri ? (
                                <TouchableOpacity
                                    onPress={handleRemovePhoto}
                                    className="px-3 py-1 rounded-full bg-brand-black/60 border border-brand-green/60"
                                    activeOpacity={0.85}
                                >
                                    <Text className="text-xs text-gray-300">Remove profile photo</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text className="text-xs text-gray-400">Tap the avatar to add a photo</Text>
                            )}

                            {/* Name */}
                            <Text className="text-white text-2xl font-semibold">
                                {displayFirst} {displayLast}
                            </Text>

                            {/* Edit */}
                            <TouchableOpacity
                                onPress={() => setShowEditNameModal(true)}
                                className="flex-row items-center px-3 py-1.5 rounded-full bg-brand-black/60 border border-brand-green/70"
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={icons.pencil}
                                    className="w-4 h-4 mr-1"
                                    tintColor="#10b981"
                                    resizeMode="contain"
                                />
                                <Text className="text-gray-200 text-xs">Edit display name</Text>
                            </TouchableOpacity>

                            {/* Email */}
                            <Text className="text-gray-400 text-md text-center" numberOfLines={1}>
                                {user?.email || "aimsense@app.com"}
                            </Text>

                            {/* Subscription */}
                            <View>
                                {subscription === "premium" && <PremiumBadge />}
                                {subscription === "trial" && <TrialBadge />}
                                {subscription === "free" && <FreeBadge />}
                            </View>
                        </View>
                    </View>

                    {/* SETTINGS */}
                    <Text className="mx-6 mt-8 mb-2 text-gray-500 text-xs uppercase tracking-[2px]">
                        Account & App
                    </Text>

                    {/* ✅ Use map instead of FlatList - no nested scrolling */}
                    <View className="mx-6">
                        {options.map(([key, value]) => {
                            const danger = key === "Delete Account";
                            const needsConnection = requiresConnection(key);
                            const isDisabled = needsConnection && !hasStableConnection;

                            return (
                                <TouchableOpacity
                                    key={key}
                                    className={`flex-row h-14 items-center justify-between rounded-xl mb-3 px-4
                  bg-brand-black/70 border ${
                                        danger ? "border-red-500/70" : "border-brand-green/70"
                                    } ${isDisabled ? "opacity-50" : ""}`}
                                    activeOpacity={isDisabled ? 1 : 0.85}
                                    onPress={() => handleOpenModal(key as ActiveModal)}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <Image
                                            source={value.icon}
                                            className="w-5 h-5"
                                            tintColor={danger ? "#f97373" : "#10b981"}
                                        />
                                        <Text className="text-white text-lg ml-3">{key}</Text>

                                        {isDisabled && (
                                            <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-900/50">
                                                <Text className="text-amber-200 text-[10px]">Requires internet</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Image
                                        source={icons.chevronRight}
                                        className="w-5 h-5"
                                        tintColor={danger ? "#f97373" : "#10b981"}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>


                    {/* Contact Info */}
                    <View className="mx-6 mt-6 mb-4">
                        <Text className="text-gray-500 text-sm text-center">Need help? Contact us at</Text>
                        <Text className="text-gray-400 text-sm text-center mt-1">support@aimsense.app</Text>
                    </View>
                </ScrollView>

                {/*/!* Debug Panel - fixed position *!/*/}
                {/*<DebugPanel />*/}
            </SafeAreaView>
        </View>
    );
};

export default Profile;
