import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    FlatList,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import icons from "@/app/constants/icons";
import { useAuth } from "@/app/contexts/AuthContext";
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

const Profile = () => {
    const [profilePhotoUri, setProfilePhotoUri] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<"" | "Privacy" | "Terms of Service" | "Logout" | "Delete Account">("");
    const { user, logout } = useAuth();
    const [subscription, setSubscription] = useState("premium");


    // ---------- Load profile ----------
    const loadProfile = async () => {
        try {
            setLoading(true);
            const profileData = await userProfileApi.getMyProfile();

            if (profileData) {
                setFirstName(profileData.firstName || "");
                setLastName(profileData.lastName || "");
                setProfilePhotoUri(profileData.profilePhotoUri || "");
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong loading the profile";
            console.log("loadProfile error:", message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // ---------- Save name (and current photo) ----------
    const handleSaveName = async (newFirst: string, newLast: string) => {
        try {
            const profile = await userProfileApi.getMyProfile();

            const data: any = {
                ...(newFirst && { firstName: newFirst }),
                ...(newLast && { lastName: newLast }),
                ...(profilePhotoUri && { profilePhotoUri }),
            };

            if (!profile) {
                await userProfileApi.createProfile(data);
                Toast.show({
                    type: "success",
                    text1: "Profile Created",
                    text2: "Your profile has been saved.",
                });
            } else {
                await userProfileApi.updateProfile(data);
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
                error instanceof Error
                    ? error.message
                    : "Something went wrong saving your name";
            console.log("handleSaveName error:", message);
            Toast.show({
                type: "error",
                text1: "Save failed",
                text2: message,
            });
        }
    };

    // ---------- Image picking ----------
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
            const uri = result.assets[0].uri;
            Toast.show({
                type: "success",
                text1: "Image Selected",
                text2: "Your photo has been loaded.",
            });
            return uri;
        }
    };

    const handlePickPhoto = async () => {
        const imageUri = await pickImage();
        if (!imageUri) return;

        setProfilePhotoUri(imageUri);

        try {
            const profile = await userProfileApi.getMyProfile();
            const data = { profilePhotoUri: imageUri };

            if (!profile) {
                await userProfileApi.createProfile(data);
            } else {
                await userProfileApi.updateProfile(data);
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
            // send empty string to clear on backend
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

    // ---------- Delete account ----------
    const handleDeleteAccount = async () => {
        try {
            if (!user) return;

            setLoading(true);
            await userProfileApi.deleteAccount();

            Toast.show({
                type: "success",
                text1: "Account Deleted",
                text2: "Your account has been permanently deleted.",
            });

            setActiveModal("");
            await logout();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to delete account";
            console.log("Error deleting account:", message);
            Toast.show({
                type: "error",
                text1: "Delete failed",
                text2: message,
            });
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => setActiveModal("");

    // ---------- Loading state ----------
    if (loading) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#0b7f4f" />
                <Text className="text-white mt-4">Loading profile...</Text>
            </View>
        );
    }

    const displayFirst = firstName || "AimSense";
    const displayLast = lastName || "Shooter";

    const options = Object.entries({
        Privacy: { icon: icons.privacy },
        "Terms of Service": { icon: icons.file },
        Logout: { icon: icons.power },
        "Delete Account": { icon: icons.trash },
    });

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1">
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
                    <LogoutContent
                        onCancel={closeModal}
                        onConfirm={async () => {
                            await logout();
                            closeModal();
                            Toast.show({
                                type: "success",
                                text1: "Logged Out",
                                text2: "See you soon!",
                            });
                        }}
                    />
                </UniversalModal>

                <UniversalModal visible={activeModal === "Privacy"} onClose={closeModal}>
                    <PrivacyPolicyContent onClose={closeModal} />
                </UniversalModal>

                <UniversalModal
                    visible={activeModal === "Terms of Service"}
                    onClose={closeModal}
                >
                    <TermsOfServiceContent onClose={closeModal} />
                </UniversalModal>

                <UniversalModal
                    visible={activeModal === "Delete Account"}
                    onClose={closeModal}
                >
                    <DeleteAccountContent
                        onCancel={closeModal}
                        onConfirm={handleDeleteAccount}
                    />
                </UniversalModal>

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* PROFILE CARD */}
                    <View className="mx-6 mt-6 rounded-2xl bg-brand-greenDark/30 border border-brand-green/40 p-5">
                        {/* Avatar */}
                        <View className="items-center">
                            <TouchableOpacity
                                onPress={handlePickPhoto}
                                activeOpacity={0.85}
                                className="size-32 items-center justify-center overflow-hidden rounded-full
                           bg-brand-greenDark shadow-sm border-2 border-brand-green/80"
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

                            {/* Remove photo */}
                            {profilePhotoUri ? (
                                <TouchableOpacity
                                    onPress={handleRemovePhoto}
                                    className="mt-3 px-3 py-1 rounded-full bg-brand-black/60 border border-brand-green/60"
                                    activeOpacity={0.85}
                                >
                                    <Text className="text-xs text-gray-300">
                                        Remove profile photo
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <Text className="mt-3 text-xs text-gray-400">
                                    Tap the avatar to add a photo
                                </Text>
                            )}
                        </View>

                        {/* Name + edit */}
                        <View className="items-center mt-4">
                            <Text className="text-white text-xl font-semibold">
                                {displayFirst} {displayLast}
                            </Text>

                            <TouchableOpacity
                                onPress={() => setShowEditNameModal(true)}
                                className="mt-2 flex-row items-center px-3 py-1.5 rounded-full bg-brand-black/60 border border-brand-green/70"
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={icons.pencil}
                                    className="w-4 h-4 mr-1"
                                    tintColor="#10b981"
                                    resizeMode="contain"
                                />
                                <Text className="text-gray-200 text-xs">
                                    Edit display name
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Email + plan chip */}
                        <View className="items-center mt-3">
                            <Text
                                className="text-gray-400 text-xs text-center"
                                numberOfLines={1}
                            >
                                {user ? user.email : "aimsense@app.com"}
                            </Text>

                            <View className="mt-2">
                                {subscription === "premium" && <PremiumBadge />}
                                {subscription === "trial" && <TrialBadge />}
                                {subscription === "free" && <FreeBadge />}
                            </View>

                        </View>
                    </View>

                    {/* SETTINGS SECTION */}
                    <Text className="mx-6 mt-8 mb-2 text-gray-500 text-xs uppercase tracking-[2px]">
                        Account & App
                    </Text>

                    <FlatList
                        data={options}
                        keyExtractor={(_, index) => index.toString()}
                        scrollEnabled={false}
                        className="mx-6"
                        renderItem={({ item }) => {
                            const [key, value] = item;
                            const isDanger = key === "Delete Account";

                            return (
                                <TouchableOpacity
                                    className={`flex-row w-full h-12 justify-between items-center rounded-xl mb-3 px-4
                             bg-brand-black/70 border ${
                                        isDanger
                                            ? "border-red-500/70"
                                            : "border-brand-green/70"
                                    }`}
                                    activeOpacity={0.85}
                                    onPress={() => setActiveModal(key as typeof activeModal)}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <View
                                            className={`p-2 rounded-lg ${
                                                isDanger ? "bg-red-900/60" : "bg-brand-greenDark/70"
                                            }`}
                                        >
                                            <Image
                                                source={value.icon}
                                                className="w-5 h-5"
                                                tintColor={isDanger ? "#f97373" : "#10b981"}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <Text className="text-white text-base font-medium ml-3">
                                            {key}
                                        </Text>
                                    </View>
                                    <Image
                                        source={icons.chevronRight}
                                        className="w-5 h-5"
                                        tintColor={isDanger ? "#f97373" : "#10b981"}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />

                    {/* SUPPORT */}
                    <View className="mx-6 mt-6 mb-4">
                        <Text className="text-gray-500 text-sm text-center">
                            Need help? Contact us at
                        </Text>
                        <Text className="text-gray-400 text-sm text-center mt-1">
                            support@aimsense.app
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

export default Profile;
