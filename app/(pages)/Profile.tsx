import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, Image, ActivityIndicator, FlatList} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import icons from "@/app/constants/icons";
import {useAuth} from "@/app/contexts/AuthContext";
import EditNameModal from "@/app/components/EditNameModal";
import {userProfileApi} from "@/app/api/userProfile";
import UniversalModal from "@/app/components/UniversalModal";
import LogoutContent from "@/app/components/contents/LogoutContent";
import PrivacyPolicyContent from "@/app/components/contents/PrivacyPolicyContent";
import DeleteAccountContent from "@/app/components/contents/DeleteAccountContent";

const Profile = () => {
    const [profilePhotoUri, setProfilePhotoUri] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeModal, setActiveModal] = useState("");
    const {user, logout} = useAuth()

    const handleSave = async (firstName: string, lastName: string) => {
        try {
            const profile = await userProfileApi.getMyProfile();
            const data = {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(profilePhotoUri && { profilePhotoUri }),
            }
            if (!profile) {
                const createdProfile = await userProfileApi.createProfile(data);
                Toast.show({
                    type: "success",
                    text1: "Profile Created",
                    text2: "Your profile has been saved",
                });
            } else {
                const updatedProfile = await userProfileApi.updateProfile(data)
                Toast.show({
                    type: "success",
                    text1: "Profile Updated",
                    text2: "Changes saved successfully",
                });
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong loading the profile'
            console.log("An unexpected error occurred in handle saves api call", message);
        }
    }

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profileData = await userProfileApi.getMyProfile()
            if (profileData) {
                //Keys val might be null since these are optional therefor fall back to ''
                setFirstName(profileData.firstName || '')
                setLastName(profileData.lastName || '')
                setProfilePhotoUri(profileData.profilePhotoUri || '')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong loading the profile'
            console.log("An unexpected error occurred in load profile getMyProfile api call", message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProfile();
    }, [])



    const pickImage = async () => {
        // 1. Ask for permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Toast.show({
                type: "error",
                text1: "Permission Denied",
                text2: "Permissions needed to upload profile picture",
            })
            return;
        }

        // 2. Launch picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.8,
        });

        // 3. Handle image
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            Toast.show({
                type: "success",
                text1: "Image Selected",
                text2: "Your photo has been loaded.",
            });
            return uri;
        }
    }

    const handlePick = async () => {
        const imageUri = await pickImage();
        if (imageUri) {
            setProfilePhotoUri(imageUri);
            try {
                const profile = await userProfileApi.getMyProfile();
                const data = { profilePhotoUri: imageUri };
                if (!profile) {
                    await userProfileApi.createProfile(data);
                } else {
                    await userProfileApi.updateProfile(data);
                }
            } catch (error: any) {
                Toast.show({
                    type: "error",
                    text1: "Failed to save photo",
                    text2: error.message,
                });
            }
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#0b7f4f" />
                <Text className="text-white mt-4">Loading profile...</Text>
            </View>
        )
    }


    const options = Object.entries({
        "Privacy": {icon: icons.privacy},
        "Logout": {icon: icons.power},
        "Delete Account": {icon: icons.trash}
    })

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView>
                <EditNameModal
                    showEditNameModal={showEditNameModal}
                    onClose={() => setShowEditNameModal(false)}
                    firstName={firstName}
                    lastName={lastName}
                    setFirstName={setFirstName}
                    setLastName={setLastName}
                    handleSave={handleSave}
                />
                <View className="mt-10 flex-row items-center justify-center">
                    <TouchableOpacity
                        onPress={() => handlePick()}
                        className="size-32 items-center justify-center overflow-hidden rounded-full
                        bg-brand-greenDark shadow-sm border-2 border-brand-green">
                        <Image
                            source={profilePhotoUri ? { uri: profilePhotoUri } : icons.user}
                            className="size-full"
                            style={{
                                tintColor: profilePhotoUri ? undefined : "#0b7f4f",
                                resizeMode: profilePhotoUri ? "cover" : "contain"
                            }}
                        />
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-center gap-1 text-white text-xl mt-4">
                    <Text className="text-white text-lg">{firstName ? firstName : "AimSense"}</Text>
                    <Text className="text-white text-lg">{lastName ? lastName : "Shooter"}</Text>
                    <TouchableOpacity
                        onPress={() => setShowEditNameModal(true)}
                    >
                        <Image
                            source={icons.pencil}
                            className="size-5"
                            tintColor="white"
                        />
                    </TouchableOpacity>
                </View>
                <Text className="text-gray-500 text-lg text-center mt-2">
                    {user ? user.email : "AimSense@app.com"}
                </Text>


                {/*Modal content*/}
                <UniversalModal
                    visible={activeModal === "Logout"}
                    onClose={()=>setActiveModal("")}
                >
                    <LogoutContent
                        onCancel={() => setActiveModal("")}
                        onConfirm={logout}
                    />
                </UniversalModal>
                <UniversalModal
                    visible={activeModal === "Privacy"}
                    onClose={() => setActiveModal("")}
                >
                    <PrivacyPolicyContent
                        onClose={() => setActiveModal("")}
                    />
                </UniversalModal>

                <UniversalModal
                    visible={activeModal === "Delete Account"}
                    onClose={() => setActiveModal("")}
                >
                    <DeleteAccountContent
                        onCancel={() => setActiveModal("")}
                        onConfirm={()=> setActiveModal("")}
                    />
                </UniversalModal>


                <FlatList
                    data={options}
                    keyExtractor={(item, index) => index.toString()}
                    scrollEnabled={false}
                    className="mx-6 mt-8"
                    renderItem={({ item }) => {
                        const [key, value] = item;
                        return (
                            <TouchableOpacity
                                className="bg-brand-greenDark border border-brand-green flex-row w-full h-14
                                justify-between items-center rounded-xl mb-3 px-4"
                                activeOpacity={0.7}
                                onPress={() => setActiveModal(key)}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className="bg-brand-black p-2 rounded-lg">
                                        <Image
                                            source={value.icon}
                                            className="size-5"
                                            tintColor="#0b7f4f"
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text className="text-white text-base font-medium ml-3">
                                        {key}
                                    </Text>
                                </View>
                                <Image
                                    source={icons.chevronRight}
                                    className="size-5"
                                    tintColor="#0b7f4f"
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        )
                    }}
                />



            </SafeAreaView>
        </View>
    );
};

export default Profile;