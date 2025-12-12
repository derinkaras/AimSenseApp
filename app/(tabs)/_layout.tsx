import React, { useEffect } from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    ImageSourcePropType,
    PressableProps,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs"; // ⬅️ add this
import icons from "@/app/constants/icons";
import { useAuth } from "@/app/contexts/AuthContext";

const ICON_BOX = 28;   // outer box
const ICON_SIZE = 22;  // base inner size

type TabIconProps = {
    focused: boolean;
    icon: ImageSourcePropType;
    title: string;
    scale?: number; // optional fine-tuning per icon
};

const TabIcon = ({ focused, icon, title, scale = 1 }: TabIconProps) => {
    const size = ICON_SIZE * scale;

    return (
        <View className="items-center justify-center px-3 py-3 w-full">
            <View
                style={{
                    width: ICON_BOX,
                    height: ICON_BOX,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Image
                    source={icon}
                    style={{
                        width: size,
                        height: size,
                        tintColor: focused ? "#0b7f4f" : "#6b7280",
                    }}
                    resizeMode="contain"
                />
            </View>

            <Text
                numberOfLines={1}
                className={`text-xs mt-1 text-center w-[70px] ${
                    focused ? "text-brand-greenLight font-semibold" : "text-gray-400"
                }`}
            >
                {title}
            </Text>

            {focused && (
                <View className="mt-1 h-0.5 w-8 bg-brand-greenLight rounded-full" />
            )}
        </View>
    );
};

// ✅ Custom tab bar button with proper typing
const TabBarButton: React.FC<BottomTabBarButtonProps> = ({
                                                             onPress,
                                                             ...rest
                                                         }) => {
    return (
        <Pressable
            {...(rest as PressableProps)} // cast navigation's extras into PressableProps
            onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress?.(e);
            }}
        />
    );
};

export default function Layout() {
    const { session, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!session) {
            router.replace("/(onboarding)");
        }
    }, [loading, session, router]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 88,
                    backgroundColor: "#0e2018",
                    borderTopWidth: 1,
                    borderTopColor: "#284a37",
                    paddingTop: 14,
                    paddingBottom: 16,
                },
                tabBarButton: (props) => <TabBarButton {...props} />, // ⬅️ use wrapper
            }}
        >
            <Tabs.Screen
                name="Home"
                options={{
                    title: "Home",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.crosshair}
                            title="Home"
                            scale={1.5}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="Guns"
                options={{
                    title: "Guns",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.rifle}
                            title="Guns"
                            scale={1.6}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="Profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.user}
                            title="Profile"
                            scale={1.05}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
