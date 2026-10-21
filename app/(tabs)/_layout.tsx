import React from "react";
import {
    View,
    Text,
    Pressable,
    Image,
    ImageSourcePropType,
    PressableProps,
    ActivityIndicator,
} from "react-native";
import { Tabs, Redirect } from "expo-router";
import * as Haptics from "expo-haptics";
import type { BottomTabBarButtonProps } from "expo-router/js-tabs";
import icons from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";

const PILL_WIDTH = 56;  // highlight behind the icon
const PILL_HEIGHT = 34;
const ICON_SIZE = 17;   // base inner size (each tab scales it to look the same size)

// Brand palette (tailwind.config.js)
const ACCENT = "#0b7f4f";   // brand-greenLight
const INACTIVE = "#6b7280"; // gray-500

type TabIconProps = {
    focused: boolean;
    icon: ImageSourcePropType;
    title: string;
    scale?: number; // optional fine-tuning per icon
};

const TabIcon = ({ focused, icon, title, scale = 1 }: TabIconProps) => {
    const size = ICON_SIZE * scale;

    return (
        <View className="items-center justify-center w-[76px]">
            {/* Selected tab: icon sits in a green pill, like the home slider thumb */}
            <View
                className={focused ? "bg-brand-green border border-brand-greenLight/70" : "border border-transparent"}
                style={{
                    width: PILL_WIDTH,
                    height: PILL_HEIGHT,
                    borderRadius: PILL_HEIGHT / 2,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Image
                    source={icon}
                    style={{
                        width: size,
                        height: size,
                        tintColor: focused ? "#ffffff" : INACTIVE,
                    }}
                    resizeMode="contain"
                />
            </View>

            <Text
                numberOfLines={1}
                className={`text-[11px] mt-1 text-center w-[76px] ${
                    focused ? "text-white font-semibold" : "text-gray-500"
                }`}
            >
                {title}
            </Text>
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
    const { user, initializing } = useAuth();

    // ✅ Show loading state while checking initial auth
    if (initializing) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0b7f4f" />
            </View>
        );
    }

    // ✅ Redirect to onboarding if signed out (using Redirect component, not useRouter)
    if (!user) {
        return <Redirect href="/(onboarding)" />;
    }

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
                    backgroundColor: "#121212", // brand-black, same as the home checklist card
                    borderTopWidth: 1,
                    borderTopColor: "rgba(11, 127, 79, 0.45)", // brand-greenLight hairline
                    paddingTop: 14,
                    paddingBottom: 16,
                    // Soft green glow along the top edge
                    shadowColor: ACCENT,
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 12,
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
                name="Store"
                options={{
                    title: "Store",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={icons.store}
                            title="Store"
                            scale={1.5}
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