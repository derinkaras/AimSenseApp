import React from 'react';
import {View, Text, TouchableOpacity, Image} from 'react-native';
import * as Haptics from "expo-haptics";
import icons from "@/app/constants/icons";
import {useRouter} from "expo-router";

const AddCircle = () => {
    const router = useRouter();
    return (
        <TouchableOpacity
            className="bg-brand-greenDark p-4 rounded-full justify-center items-center border-2 border-brand-greenLight my-3"
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                router.push("/(pages)/AddGunProfile")
                }
            }
        >
            <Image
                source={icons.plus}
                className="size-8"
                resizeMode="contain"
                tintColor="#0b7f4f"
            />

        </TouchableOpacity>
  );
};

export default AddCircle;
