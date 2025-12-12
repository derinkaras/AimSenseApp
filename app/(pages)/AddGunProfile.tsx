import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import icons from "@/app/constants/icons";
import { gunProfileApi } from "@/app/api/gunProfile";

const AddGunProfile = () => {
    const router = useRouter();

    // Form state
    const [name, setName] = useState("");
    const [caliber, setCaliber] = useState("");
    const [bulletWeightGrains, setBulletWeightGrains] = useState("");
    const [ballisticCoefficient, setBallisticCoefficient] = useState("");
    const [muzzleVelocityFps, setMuzzleVelocityFps] = useState("");
    const [zeroDistance, setZeroDistance] = useState("");
    const [scopeHeight, setScopeHeight] = useState("");
    const [unitSystem, setUnitSystem] = useState<"METRIC" | "IMPERIAL">("IMPERIAL");
    const [gunPhotoUri, setGunPhotoUri] = useState<string | undefined>(undefined);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const pickImage = async () => {
        // 1. Ask for permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Toast.show({
                type: "error",
                text1: "Permission denied",
                text2: "Photo library access is required to add a rifle photo.",
            });
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
            setGunPhotoUri(uri);
            Toast.show({
                type: "success",
                text1: "Photo selected",
                text2: "Your rifle photo has been loaded.",
            });
        }
    };


    const handleCreateProfile = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Basic validation
        if (!name.trim() || !caliber.trim()) {
            setError("Name and caliber are required.");
            return;
        }

        const bulletWeightNum = Number(bulletWeightGrains);
        const ballisticCoefNum = Number(ballisticCoefficient);
        const muzzleVelocityNum = Number(muzzleVelocityFps);
        const zeroDistanceNum = Number(zeroDistance);
        const scopeHeightNum = Number(scopeHeight);

        if (
            isNaN(bulletWeightNum) ||
            isNaN(ballisticCoefNum) ||
            isNaN(muzzleVelocityNum) ||
            isNaN(zeroDistanceNum) ||
            isNaN(scopeHeightNum)
        ) {
            setError("All numeric fields must contain valid numbers.");
            return;
        }

        setError(null);
        setSubmitting(true);

        try {
            await gunProfileApi.createProfile({
                name: name.trim(),
                caliber: caliber.trim(),
                bulletWeightGrains: bulletWeightNum,
                ballisticCoefficient: ballisticCoefNum,
                muzzleVelocityFps: muzzleVelocityNum,
                zeroDistance: zeroDistanceNum,
                scopeHeight: scopeHeightNum,
                unitSystem,
                gunPhotoUri, // <-- send the photo URI
            });

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
                type: "success",
                text1: "Profile saved",
                text2: "Your rifle profile has been created.",
            });
            router.back();
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Failed to create profile. Please try again.";
            setError(msg);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.log("Error creating gun profile:", msg);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: msg,
            });
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- SMALL INPUT RENDER HELPER ----------

    const renderInput = (
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        options?: {
            placeholder?: string;
            keyboardType?: "default" | "numeric";
            helperText?: string;
        }
    ) => (
        <View className="mb-4">
            <Text className="text-gray-300 text-sm mb-2">{label}</Text>
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                <TextInput
                    className="text-white text-base"
                    placeholder={options?.placeholder}
                    placeholderTextColor="#6b7280"
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={options?.keyboardType || "default"}
                />
            </View>
            {options?.helperText && (
                <Text className="text-xs text-gray-500 mt-1">{options.helperText}</Text>
            )}
        </View>
    );

    return (
        <View className="bg-brand-black flex-1">
            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="p-2 -ml-2"
                            hitSlop={8}
                        >
                            <Image
                                source={icons.leftArrow}
                                className="w-6 h-6"
                                tintColor="#22c55e"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <Text className="text-white text-lg font-semibold">
                            New Rifle Profile
                        </Text>
                        <View className="w-6 h-6" />
                    </View>

                    {/* Body */}
                    <ScrollView
                        className="flex-1 px-6"
                        contentContainerStyle={{ paddingBottom: 32 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-5 mb-4">
                            <Text className="text-gray-200 text-base font-semibold mb-1">
                                Dial in your rifle
                            </Text>
                            <Text className="text-gray-500 text-sm">
                                Enter your rifle and ammo details so AimSense can calculate accurate drops and holds
                                for your shots.
                            </Text>
                        </View>

                        {error && (
                            <View className="bg-red-500/10 border border-red-500/40 rounded-2xl px-4 py-3 mb-4">
                                <Text className="text-red-300 text-sm">{error}</Text>
                            </View>
                        )}

                        {/* Rifle */}
                        <Text className="text-gray-400 text-xs uppercase tracking-[0.16em] mb-2">
                            Rifle
                        </Text>

                        {renderInput("Profile name", name, setName, {
                            placeholder: "e.g. Tikka T3x .308",
                        })}

                        {renderInput("Caliber", caliber, setCaliber, {
                            placeholder: "e.g. .308 Win, 6.5 Creedmoor",
                        })}

                        {/* Ammo & ballistics */}
                        <Text className="text-gray-400 text-xs uppercase tracking-[0.16em] mt-2 mb-2">
                            Ammo & Ballistics
                        </Text>

                        {renderInput(
                            "Bullet weight (grains)",
                            bulletWeightGrains,
                            setBulletWeightGrains,
                            {
                                placeholder: "e.g. 168",
                                keyboardType: "numeric",
                            }
                        )}

                        {renderInput(
                            "Ballistic coefficient (G1)",
                            ballisticCoefficient,
                            setBallisticCoefficient,
                            {
                                placeholder: "e.g. 0.47",
                                keyboardType: "numeric",
                            }
                        )}

                        {renderInput(
                            "Muzzle velocity (fps)",
                            muzzleVelocityFps,
                            setMuzzleVelocityFps,
                            {
                                placeholder: "e.g. 2650",
                                keyboardType: "numeric",
                            }
                        )}

                        {/* Zero & scope */}
                        <Text className="text-gray-400 text-xs uppercase tracking-[0.16em] mt-2 mb-2">
                            Zero & Scope
                        </Text>

                        {renderInput("Zero distance", zeroDistance, setZeroDistance, {
                            placeholder: unitSystem === "IMPERIAL" ? "e.g. 100 (yards)" : "e.g. 100 (meters)",
                            keyboardType: "numeric",
                        })}

                        {renderInput("Scope height", scopeHeight, setScopeHeight, {
                            placeholder:
                                unitSystem === "IMPERIAL"
                                    ? "e.g. 1.5 in (center to bore)"
                                    : "e.g. 3.8 cm (converted)",
                            keyboardType: "numeric",
                        })}

                        {/* Unit system toggle */}
                        <View className="mt-4 mb-4">
                            <Text className="text-gray-300 text-sm mb-2">Unit system</Text>
                            <View className="flex-row bg-zinc-900 rounded-2xl p-1">
                                <TouchableOpacity
                                    className={`flex-1 py-2 rounded-xl items-center ${
                                        unitSystem === "IMPERIAL" ? "bg-brand-greenDark" : ""
                                    }`}
                                    onPress={() => setUnitSystem("IMPERIAL")}
                                >
                                    <Text
                                        className={
                                            unitSystem === "IMPERIAL"
                                                ? "text-white text-sm font-semibold"
                                                : "text-gray-400 text-sm"
                                        }
                                    >
                                        Imperial
                                    </Text>
                                    <Text
                                        className={
                                            unitSystem === "IMPERIAL"
                                                ? "text-emerald-200 text-[10px]"
                                                : "text-gray-500 text-[10px]"
                                        }
                                    >
                                        yards / fps / inches
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className={`flex-1 py-2 rounded-xl items-center ${
                                        unitSystem === "METRIC" ? "bg-brand-greenDark" : ""
                                    }`}
                                    onPress={() => setUnitSystem("METRIC")}
                                >
                                    <Text
                                        className={
                                            unitSystem === "METRIC"
                                                ? "text-white text-sm font-semibold"
                                                : "text-gray-400 text-sm"
                                        }
                                    >
                                        Metric
                                    </Text>
                                    <Text
                                        className={
                                            unitSystem === "METRIC"
                                                ? "text-emerald-200 text-[10px]"
                                                : "text-gray-500 text-[10px]"
                                        }
                                    >
                                        meters / m/s / cm
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Rifle photo */}
                        <Text className="text-gray-400 text-xs uppercase tracking-[0.16em] mt-2 mb-2">
                            Rifle Photo (Optional)
                        </Text>

                        <TouchableOpacity
                            onPress={pickImage}
                            activeOpacity={0.9}
                            className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl px-4 py-4 items-center justify-center mb-8"
                        >
                            {gunPhotoUri ? (
                                <View className="w-full items-center">
                                    <Image
                                        source={{ uri: gunPhotoUri }}
                                        className="w-full h-40 rounded-xl mb-3"
                                        resizeMode="cover"
                                    />
                                    <Text className="text-emerald-300 text-sm font-medium">
                                        Change rifle photo
                                    </Text>
                                    <Text className="text-gray-500 text-xs mt-1">
                                        Make sure the scope and barrel are clearly visible.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <View className="w-12 h-12 rounded-full bg-zinc-800 items-center justify-center mb-2">
                                        <Image
                                            source={icons.camera || icons.plus}
                                            className="w-6 h-6"
                                            resizeMode="contain"
                                            tintColor="#9ca3af"
                                        />
                                    </View>
                                    <Text className="text-gray-200 text-sm font-medium">
                                        Add rifle photo
                                    </Text>
                                    <Text className="text-gray-500 text-xs mt-1 text-center">
                                        Optional, but helps you quickly recognize this profile.
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Submit button */}
                    <View className="px-6 pb-6">
                        <TouchableOpacity
                            onPress={handleCreateProfile}
                            disabled={submitting}
                            className={`rounded-2xl py-3.5 flex-row items-center justify-center ${
                                submitting ? "bg-brand-green/60" : "bg-brand-green"
                            }`}
                            activeOpacity={0.9}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#022c22" />
                            ) : (
                                <>
                                    <Text className="text-lg font-semibold text-emerald-50">
                                        Save profile
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

export default AddGunProfile;
