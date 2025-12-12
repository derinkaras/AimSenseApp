import React from 'react';
import {View, Text, Image, TextInput, ImageSourcePropType} from 'react-native';

type CustomTextInputProps = {
    icon: ImageSourcePropType,
    placeholder: string,
    stateVar: string,
    stateVarSetter: (value: string) => void,
    clearError?: () => void,
}

const CustomTextInput = (props: CustomTextInputProps) => {
    const {icon, placeholder, stateVar, stateVarSetter, clearError} = props;

    return (
        <View
            className="border-2 border-brand-greenLight px-4 py-5 w-full rounded-xl mt-4 flex-row gap-2"
        >
            <Image
                source={icon}
                resizeMode="contain"
                tintColor="white"
                className="size-7"
            />
            <TextInput
                className="text-white flex-1"
                placeholder={placeholder}
                secureTextEntry={placeholder.includes("password") ? true : false}
                placeholderTextColor="white"
                value={stateVar}
                onChangeText={(text) => {
                    if (clearError) clearError();
                    stateVarSetter(text);
                }}
            />
        </View>
    );
    };

export default CustomTextInput;
