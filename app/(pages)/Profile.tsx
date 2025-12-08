import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Image} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import icons from "@/app/constants/icons";
import {useAuth} from "@/app/contexts/AuthContext";
import EditNameModal from "@/app/components/EditNameModal";

const Profile = () => {
    const [profilePicture, setProfilePicture] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showEditNameModal, setShowEditNameModal] = useState(false);

    const {user} = useAuth()

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
        if (imageUri) setProfilePicture(imageUri);
    }

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
                />
                <View className="mt-10 flex-row items-center justify-center">
                    <TouchableOpacity
                        onPress={() => handlePick()}
                        className="size-32 items-center justify-center overflow-hidden rounded-full bg-brand-greenDark shadow-sm border-2 border-brand-green">
                        <Image
                        source={profilePicture ? { uri: profilePicture } : icons.user}
                        className="size-full"
                        style={{
                            tintColor: profilePicture ? undefined : "#0b7f4f",
                            resizeMode: profilePicture ? "cover" : "contain"
                        }}
                    />
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-center gap-2 text-white text-xl mt-4">
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

            </SafeAreaView>
      </View>
    );
};

export default Profile;
