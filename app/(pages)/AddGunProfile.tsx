import React, { useEffect, useState } from "react";
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
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import icons from "@/app/constants/icons";
import { gunProfileApi } from "@/app/api/gunProfile";

type UnitSystem = "METRIC" | "IMPERIAL";

const AddGunProfile = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!id;

    // Form state
    const [name, setName] = useState("");
    const [caliber, setCaliber] = useState("");
    const [bulletWeightGrains, setBulletWeightGrains] = useState("");
    const [ballisticCoefficient, setBallisticCoefficient] = useState("");
    const [muzzleVelocityFps, setMuzzleVelocityFps] = useState("");
    const [zeroDistance, setZeroDistance] = useState("");
    const [scopeHeight, setScopeHeight] = useState("");
    const [unitSystem, setUnitSystem] = useState<UnitSystem>("IMPERIAL");
    const [gunPhotoUri, setGunPhotoUri] = useState<string | undefined>(undefined);

    const [submitting, setSubmitting] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load existing profile in edit mode
    useEffect(() => {
        if (!isEdit || !id) return;

        const load = async () => {
            try {
                setLoadingExisting(true);
                const p = await gunProfileApi.getSpecificGunProfile(id);

                setName(p.name ?? "");
                setCaliber(p.caliber ?? "");
                setBulletWeightGrains(String(p.bulletWeightGrains ?? ""));
                setBallisticCoefficient(String(p.ballisticCoefficient ?? ""));
                setMuzzleVelocityFps(String(p.muzzleVelocityFps ?? ""));
                setZeroDistance(String(p.zeroDistance ?? ""));
                setScopeHeight(String(p.scopeHeight ?? ""));
                setUnitSystem(p.unitSystem ?? "IMPERIAL");
                setGunPhotoUri(p.gunPhotoUri ?? undefined);
            } catch (e) {
                console.error("Failed to load profile", e);
                setError("Couldn't load this profile.");
            } finally {
                setLoadingExisting(false);
            }
        };

        load();
    }, [id, isEdit]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Toast.show({
                type: "error",
                text1: "Permission denied",
                text2: "Photo library access is required to add a rifle photo.",
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setGunPhotoUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

        const payload = {
            name: name.trim(),
            caliber: caliber.trim(),
            bulletWeightGrains: bulletWeightNum,
            ballisticCoefficient: ballisticCoefNum,
            muzzleVelocityFps: muzzleVelocityNum,
            zeroDistance: zeroDistanceNum,
            scopeHeight: scopeHeightNum,
            unitSystem,
            gunPhotoUri,
        };

        setError(null);
        setSubmitting(true);

        try {
            if (isEdit && id) {
                await gunProfileApi.updateSpecificGunProfile(id, payload);
            } else {
                await gunProfileApi.createProfile(payload);
            }

            Toast.show({
                type: "success",
                text1: isEdit ? "Profile updated" : "Profile created",
            });
            router.back();
        } catch (e) {
            console.error("Error saving profile", e);
            setError(
                isEdit
                    ? "Failed to update profile. Please try again."
                    : "Failed to create profile. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (!isEdit || !id) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Alert.alert(
            "Delete rifle?",
            "This will remove this rifle profile from AimSense.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setSubmitting(true);
                            await gunProfileApi.deleteSpecificGunProfile(id);
                            Toast.show({
                                type: "success",
                                text1: "Profile deleted",
                            });
                            router.back();
                        } catch (e) {
                            console.error("Error deleting profile", e);
                            Alert.alert(
                                "Error",
                                "Failed to delete profile. Please try again."
                            );
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

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
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 justify-center">
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

    if (loadingExisting && isEdit) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color="#22c55e" />
                <Text className="text-gray-400 mt-3">Loading profile...</Text>
            </View>
        );
    }

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
                                className="size-7"
                                tintColor="#22c55e"
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <Text className="text-white text-xl font-semibold">
                            {isEdit ? "Edit Rifle Profile" : "New Rifle Profile"}
                        </Text>

                        {/* Right: delete button only in edit mode */}
                        {isEdit ? (
                            <TouchableOpacity
                                onPress={handleDelete}
                                disabled={submitting}
                                className="p-2"
                                hitSlop={8}
                            >
                                <Image
                                    source={icons.trash}
                                    className="size-7"
                                    resizeMode="contain"
                                    tintColor="#f97373"
                                />
                            </TouchableOpacity>
                        ) : (
                            <View className="w-6 h-6" />
                        )}
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
                                Enter your rifle and ammo details so AimSense can calculate
                                accurate drops and holds for your shots.
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
                            { placeholder: "e.g. 168", keyboardType: "numeric" }
                        )}

                        {renderInput(
                            "Ballistic coefficient (G1)",
                            ballisticCoefficient,
                            setBallisticCoefficient,
                            { placeholder: "e.g. 0.47", keyboardType: "numeric" }
                        )}

                        {renderInput(
                            "Muzzle velocity (fps)",
                            muzzleVelocityFps,
                            setMuzzleVelocityFps,
                            { placeholder: "e.g. 2650", keyboardType: "numeric" }
                        )}

                        {/* Zero & scope */}
                        <Text className="text-gray-400 text-xs uppercase tracking-[0.16em] mt-2 mb-2">
                            Zero & Scope
                        </Text>

                        {renderInput("Zero distance", zeroDistance, setZeroDistance, {
                            placeholder:
                                unitSystem === "IMPERIAL"
                                    ? "e.g. 100 (yards)"
                                    : "e.g. 100 (meters)",
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
                            onPress={handleSubmit}
                            disabled={submitting}
                            className={`rounded-2xl py-3.5 flex-row items-center justify-center ${
                                submitting ? "bg-brand-green/60" : "bg-brand-green"
                            }`}
                            activeOpacity={0.9}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#022c22" />
                            ) : (
                                <Text className="text-lg font-semibold text-emerald-50">
                                    {isEdit ? "Update profile" : "Save profile"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

export default AddGunProfile;
