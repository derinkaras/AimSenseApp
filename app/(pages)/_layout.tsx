import React from 'react';
import { View, Text } from 'react-native';
import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";

const _layout = () => {
    return (
        <View className="flex-1 bg-brand-black">
            <StatusBar style="light" backgroundColor="#121212" />
            <Stack>
                <Stack.Screen
                    name="AddGunProfile"
                    options={{
                        headerShown: false,
                    }}
                />
            </Stack>


        </View>
    );
};

export default _layout;
