import {View, Text, Image, Pressable} from 'react-native';
import images from "@/app/constants/images";
import {useRouter} from "expo-router";

export default function Index() {
    const router = useRouter();
    return (
        <View className="flex-1 bg-brand-green">

            <View className="flex-[3] mt-6">
                <Image
                    source={images.onboarding}
                    className="w-full h-full"
                />
            </View>
            {/* Bottom 1/3 */}
            <View className="flex-[1] bg-brand-greenDark">
                <Pressable
                    className="bg-brand-green py-6 rounded-xl mx-6 active:bg-brand-greenLight"
                    onPress={() => {
                        router.push("/Authentication");
                    }}
                >
                    <Text
                        className="text-white text-2xl font-semibold text-center"
                    >
                        Get Started
                    </Text>
                </Pressable>

            </View>

        </View>
    );
}
