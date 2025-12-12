import React, {useEffect, useState} from "react";
import {View, Image, TouchableOpacity, ActivityIndicator, Text} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/app/constants/icons";
import * as Haptics from "expo-haptics";
import {gunProfileApi} from "@/app/api/gunProfile";
import AddCircle from "@/app/components/AddCircle";

const Guns = () => {

    const [gunProfiles, setGunProfiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadGunProfiles = async () => {
        setLoading(true);
        try {
            const gunProfiles = await gunProfileApi.getAllUserGunProfiles()
            setGunProfiles(gunProfiles)
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : "Something went wrong";
            console.log("AN ERROR OCCURED IN THE LOAD UN PROFILES: ", errorMessage)
        }
        setLoading(false);
    }

    useEffect(() => {
        loadGunProfiles();
    }, []);


    if (loading) {

        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#22c55e"/>
                <Text className="text-gray-400 mt-3" >Loading your rifles...</Text>
            </View>

        )
    }

    return (
        <View className="flex-1 bg-brand-black">
            <SafeAreaView className="flex-1 mx-4">
                {/* Content wrapper that the FAB can anchor to */}
                <View className="flex-1 relative">
                    {gunProfiles.length === 0 ? (
                        <View className="flex-1 justify-center items-center">
                            <AddCircle/>
                            <Text className="text-gray-500">No gun profiles yet.</Text>
                            <Text className="text-gray-600 text-xs mt-1">
                                Tap the + button to add your first rifle.
                            </Text>
                        </View>
                    ): (
                        <Text>Test</Text>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

export default Guns;
