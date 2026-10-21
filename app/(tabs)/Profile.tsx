// app/(tabs)/Profile.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import icons from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import EditNameModal from "@/components/EditNameModal";
import { userProfileApi } from "@/services/userProfile";
import UniversalModal from "@/components/UniversalModal";
import LogoutContent from "@/components/contents/LogoutContent";
import PrivacyPolicyContent from "@/components/contents/PrivacyPolicyContent";
import DeleteAccountContent from "@/components/contents/DeleteAccountContent";
import TermsOfServiceContent from "@/components/contents/TermsOfServiceContent";
import GuideSheet from "@/help/GuideSheet";
import PremiumBadge from "@/components/profile/PremiumBadge";
import TrialBadge from "@/components/profile/TrialBadge";
import FreeBadge from "@/components/profile/FreeBadge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DebugPanel } from "@/components/DebugPanel";

type ActiveModal = "" | "How it works & limits" | "Privacy" | "Terms of Service" | "Logout" | "Delete Account";
type SubscriptionTier = "premium" | "trial" | "free";

const ACCENT = "#0b7f4f"; // brand-greenLight
const DANGER = "#f87171"; // red-400
const SUPPORT_EMAIL = "support@aimsense.app";

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
        "How it works & limits": { icon: icons.info },
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
                <ActivityIndicator size="large" color={ACCENT} />
            </View>
        );
    }

    const renderRow = ([key, value]: (typeof options)[number], index: number, group: typeof options) => {
        const danger = key === "Delete Account";
        const isDisabled = requiresConnection(key) && !hasStableConnection;
        const last = index === group.length - 1;
        const tint = danger ? DANGER : ACCENT;

        return (
            <TouchableOpacity
                key={key}
                className={`flex-row items-center px-4 py-3.5 ${last ? "" : "border-b border-brand-green/40"} ${isDisabled ? "opacity-50" : ""}`}
                activeOpacity={isDisabled ? 1 : 0.7}
                onPress={() => handleOpenModal(key as ActiveModal)}
            >
                <View
                    className={`size-9 rounded-xl items-center justify-center mr-3 border ${
                        danger ? "bg-red-950/40 border-red-500/40" : "bg-brand-black/60 border-brand-green/60"
                    }`}
                >
                    <Image source={value.icon} className="size-4" resizeMode="contain" tintColor={tint} />
                </View>
                <Text className={`text-base flex-shrink ${danger ? "text-red-400 font-semibold" : "text-white"}`}>{key}</Text>
                {isDisabled && (
                    <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-900/50">
                        <Text className="text-amber-200 text-[10px]">Requires internet</Text>
                    </View>
                )}
                <View className="flex-1" />
                <Image
                    source={icons.chevronRight}
                    className="size-3.5"
                    resizeMode="contain"
                    tintColor={danger ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.4)"}
                />
            </TouchableOpacity>
        );
    };

    const helpOptions = options.filter(([key]) => !requiresConnection(key));
    const accountOptions = options.filter(([key]) => requiresConnection(key));

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

                <GuideSheet visible={activeModal === "How it works & limits"} onClose={closeModal} />

                <UniversalModal visible={activeModal === "Delete Account"} onClose={closeModal}>
                    <DeleteAccountContent onCancel={closeModal} onConfirm={handleDeleteAccount} />
                </UniversalModal>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                    <View className="mx-6">
                        {/* ===================== HEADER ===================== */}
                        <View className="mt-4 mb-5 flex-row items-center">
                            <View className="size-11 rounded-2xl bg-brand-greenDark/80 border border-brand-green/60 items-center justify-center mr-3">
                                <Image source={icons.user} className="size-5" resizeMode="contain" tintColor={ACCENT} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-brand-greenLight text-[11px] font-bold tracking-[0.2em]">AIMSENSE</Text>
                                <Text className="text-white text-2xl font-bold">Profile</Text>
                            </View>
                        </View>

                        <OfflineBanner />

                        {/* ===================== PROFILE CARD ===================== */}
                        <View className="rounded-3xl border border-brand-green/60 overflow-hidden">
                            <LinearGradient
                                colors={["#284a37", "#0e2018", "#121212"]}
                                locations={[0, 0.55, 1]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ padding: 20 }}
                            >
                                <View className="flex-row items-center">
                                    {/* Avatar: tap to add or change the photo */}
                                    <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} accessibilityLabel="Change profile photo">
                                        <View className="size-20 items-center justify-center overflow-hidden rounded-full bg-brand-black/60 border-2 border-brand-greenLight/70">
                                            <Image
                                                source={profilePhotoUri ? { uri: profilePhotoUri } : icons.user}
                                                className={profilePhotoUri ? "w-full h-full" : "size-9"}
                                                style={{
                                                    tintColor: profilePhotoUri ? undefined : ACCENT,
                                                    resizeMode: profilePhotoUri ? "cover" : "contain",
                                                }}
                                            />
                                        </View>
                                        <View className="absolute bottom-0 right-0 size-7 rounded-full bg-brand-green border-2 border-brand-black items-center justify-center">
                                            <Image source={icons.camera} className="size-3.5" resizeMode="contain" tintColor="#ffffff" />
                                        </View>
                                    </TouchableOpacity>

                                    <View className="flex-1 ml-4">
                                        <Text className="text-white text-xl font-bold" numberOfLines={1}>
                                            {displayFirst} {displayLast}
                                        </Text>
                                        <Text className="text-white/55 text-sm mt-0.5" numberOfLines={1}>
                                            {user?.email || "aimsense@app.com"}
                                        </Text>
                                        <View className="flex-row mt-2.5">
                                            {subscription === "premium" && <PremiumBadge />}
                                            {subscription === "trial" && <TrialBadge />}
                                            {subscription === "free" && <FreeBadge />}
                                        </View>
                                    </View>
                                </View>

                                {/* Quick actions */}
                                <View className="flex-row gap-2 mt-5">
                                    <TouchableOpacity
                                        onPress={() => setShowEditNameModal(true)}
                                        activeOpacity={0.85}
                                        className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-black/50 border border-brand-green/60 py-2.5"
                                    >
                                        <Image source={icons.pencil} className="size-3.5 mr-2" tintColor={ACCENT} resizeMode="contain" />
                                        <Text className="text-white text-sm font-semibold">Edit name</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={profilePhotoUri ? handleRemovePhoto : handlePickPhoto}
                                        activeOpacity={0.85}
                                        className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-black/50 border border-brand-green/60 py-2.5"
                                    >
                                        <Image
                                            source={profilePhotoUri ? icons.trash : icons.camera}
                                            className="size-3.5 mr-2"
                                            tintColor={ACCENT}
                                            resizeMode="contain"
                                        />
                                        <Text className="text-white text-sm font-semibold">
                                            {profilePhotoUri ? "Remove photo" : "Add photo"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </View>

                        {/* ===================== HELP & LEGAL ===================== */}
                        <Text className="text-white/50 text-[11px] font-bold tracking-[0.16em] mt-7 mb-3">HELP & LEGAL</Text>
                        <View className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 overflow-hidden">
                            {helpOptions.map(renderRow)}
                        </View>

                        {/* ===================== ACCOUNT ===================== */}
                        <Text className="text-white/50 text-[11px] font-bold tracking-[0.16em] mt-7 mb-3">ACCOUNT</Text>
                        <View className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 overflow-hidden">
                            {accountOptions.map(renderRow)}
                        </View>

                        {/* ===================== SUPPORT ===================== */}
                        <TouchableOpacity
                            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
                            activeOpacity={0.8}
                            className="mt-7 items-center"
                        >
                            <Text className="text-white/40 text-xs">Need help? Contact us at</Text>
                            <Text className="text-brand-greenLight text-sm mt-1">{SUPPORT_EMAIL}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/*<DebugPanel />*/}
            </SafeAreaView>
        </View>
    );
};

export default Profile;

