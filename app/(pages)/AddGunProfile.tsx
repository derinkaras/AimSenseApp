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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import icons from "@/constants/icons";
import { gunProfileApi } from "@/services/gunProfile";
import { useGunProfilesDirty } from "@/contexts/GunProfilesDirtyContext";
import { ClickValuePicker, MagnificationField } from "@/calibration/ScopeSetupFields";
import type { ScopeUnit } from "@/calibration";

type UnitSystem = "METRIC" | "IMPERIAL";

const ACCENT = "#0b7f4f"; // brand-greenLight

const AddGunProfile = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const isEdit = !!id;

    const { markDirty } = useGunProfilesDirty();

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
    // Scope details (optional here; calibration asks for them if they are missing)
    const [scopeUnit, setScopeUnit] = useState<ScopeUnit | null>(null);
    const [clickSize, setClickSize] = useState<number | null>(null);
    const [scopeMagnification, setScopeMagnification] = useState<number | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Load existing profile in edit mode
    useEffect(() => {
        if (!isEdit || !id) return;

        const load = async () => {
            try {
                setLoadingExisting(true);
                const p = await gunProfileApi.getSpecificGunProfile(String(id));

                setName(p.name ?? "");
                setCaliber(p.caliber ?? "");
                setBulletWeightGrains(String(p.bulletWeightGrains ?? ""));
                setBallisticCoefficient(String(p.ballisticCoefficient ?? ""));
                setMuzzleVelocityFps(String(p.muzzleVelocityFps ?? ""));
                setZeroDistance(String(p.zeroDistance ?? ""));
                setScopeHeight(String(p.scopeHeight ?? ""));
                setUnitSystem(p.unitSystem ?? "IMPERIAL");
                setGunPhotoUri(p.gunPhotoUri ?? undefined);
                setScopeUnit(p.scopeUnit ?? null);
                setClickSize(p.clickSize ?? null);
                setScopeMagnification(p.scopeMagnification ?? null);
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
            scopeUnit: scopeUnit ?? undefined,
            clickSize: clickSize ?? undefined,
            scopeMagnification: scopeMagnification ?? undefined,
        };

        setError(null);
        setSubmitting(true);

        try {
            if (isEdit && id) {
                await gunProfileApi.updateSpecificGunProfile(String(id), payload);
            } else {
                await gunProfileApi.createProfile(payload);
            }

            markDirty(); // ✅ tells Guns to refresh once

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

        Alert.alert("Delete rifle?", "This will remove this rifle profile from AimSense.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setSubmitting(true);
                        await gunProfileApi.deleteSpecificGunProfile(String(id));

                        markDirty(); // ✅ tells Guns to refresh once

                        Toast.show({
                            type: "success",
                            text1: "Profile deleted",
                        });

                        router.back();
                    } catch (e) {
                        console.error("Error deleting profile", e);
                        Alert.alert("Error", "Failed to delete profile. Please try again.");
                    } finally {
                        setSubmitting(false);
                    }
                },
            },
        ]);
    };

    const isImperial = unitSystem === "IMPERIAL";

    // One labelled field. `suffix` shows the unit inside the box; `last` drops the divider.
    const renderInput = (
        key: string,
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        options?: {
            placeholder?: string;
            keyboardType?: "default" | "numeric" | "decimal-pad";
            suffix?: string;
            helperText?: string;
        }
    ) => {
        const focused = focusedField === key;
        return (
            <View className="mb-3.5">
                <Text className="text-white/70 text-xs font-semibold mb-1.5">{label}</Text>
                <View
                    className={`flex-row items-center rounded-xl border px-4 bg-brand-black/60 ${
                        focused ? "border-brand-greenLight" : "border-brand-green/60"
                    }`}
                >
                    <TextInput
                        className="flex-1 text-white text-base py-3"
                        placeholder={options?.placeholder}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={value}
                        onChangeText={onChangeText}
                        keyboardType={options?.keyboardType || "default"}
                        onFocus={() => setFocusedField(key)}
                        onBlur={() => setFocusedField((f) => (f === key ? null : f))}
                    />
                    {options?.suffix && <Text className="text-white/40 text-sm font-semibold ml-2">{options.suffix}</Text>}
                </View>
                {options?.helperText && <Text className="text-xs text-white/40 mt-1.5">{options.helperText}</Text>}
            </View>
        );
    };

    const sectionLabel = (text: string) => (
        <Text className="text-white/50 text-[11px] font-bold tracking-[0.16em] mt-6 mb-3">{text}</Text>
    );

    if (loadingExisting && isEdit) {
        return (
            <View className="flex-1 bg-brand-black justify-center items-center">
                <ActivityIndicator size="large" color={ACCENT} />
                <Text className="text-white/50 mt-3">Loading profile...</Text>
            </View>
        );
    }

    return (
        <View className="bg-brand-black flex-1">
            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    {/* ===================== HEADER ===================== */}
                    <View className="flex-row items-center px-6 pt-2 pb-3">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            hitSlop={8}
                            accessibilityLabel="Back"
                            className="size-10 rounded-full bg-brand-greenDark/80 border border-brand-green/60 items-center justify-center"
                        >
                            <Image source={icons.chevronLeft} className="size-4" tintColor="#ffffff" resizeMode="contain" />
                        </TouchableOpacity>

                        <View className="flex-1 items-center">
                            <Text className="text-brand-greenLight text-[11px] font-bold tracking-[0.2em]">
                                {isEdit ? "EDIT RIFLE" : "NEW RIFLE"}
                            </Text>
                            <Text className="text-white text-lg font-bold" numberOfLines={1}>
                                {isEdit && name.trim() ? name.trim() : "Rifle profile"}
                            </Text>
                        </View>

                        {isEdit ? (
                            <TouchableOpacity
                                onPress={handleDelete}
                                disabled={submitting}
                                hitSlop={8}
                                accessibilityLabel="Delete rifle"
                                className="size-10 rounded-full bg-red-950/50 border border-red-500/40 items-center justify-center"
                            >
                                <Image source={icons.trash} className="size-4" resizeMode="contain" tintColor="#f87171" />
                            </TouchableOpacity>
                        ) : (
                            <View className="size-10" />
                        )}
                    </View>

                    {/* ===================== BODY ===================== */}
                    <ScrollView
                        className="flex-1 px-6"
                        contentContainerStyle={{ paddingBottom: 32 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Photo banner (optional) */}
                        <TouchableOpacity
                            onPress={pickImage}
                            activeOpacity={0.85}
                            className={`mt-2 rounded-3xl overflow-hidden border ${
                                gunPhotoUri ? "border-brand-green/60" : "border-dashed border-brand-greenLight/50"
                            }`}
                        >
                            {gunPhotoUri ? (
                                <View>
                                    <Image source={{ uri: gunPhotoUri }} className="w-full h-44" resizeMode="cover" />
                                    <LinearGradient
                                        colors={["rgba(18,18,18,0)", "rgba(18,18,18,0.85)"]}
                                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }}
                                        pointerEvents="none"
                                    />
                                    <View className="absolute bottom-3 right-3 flex-row items-center rounded-full bg-brand-black/80 border border-brand-green/60 px-3 py-1.5">
                                        <Image source={icons.camera} className="size-3.5 mr-1.5" resizeMode="contain" tintColor={ACCENT} />
                                        <Text className="text-white text-xs font-semibold">Change photo</Text>
                                    </View>
                                </View>
                            ) : (
                                <LinearGradient
                                    colors={["#284a37", "#0e2018", "#121212"]}
                                    locations={[0, 0.55, 1]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ height: 150, alignItems: "center", justifyContent: "center" }}
                                >
                                    <View className="size-12 rounded-2xl bg-brand-black/50 border border-brand-greenLight/50 items-center justify-center mb-2">
                                        <Image source={icons.camera} className="size-6" resizeMode="contain" tintColor={ACCENT} />
                                    </View>
                                    <Text className="text-white text-sm font-semibold">Add rifle photo</Text>
                                    <Text className="text-white/50 text-xs mt-0.5">Optional, helps you spot this rifle</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>

                        {error && (
                            <View className="mt-4 bg-red-950/40 border border-red-500/40 rounded-2xl px-4 py-3">
                                <Text className="text-red-300 text-sm">{error}</Text>
                            </View>
                        )}

                        {/* Rifle */}
                        {sectionLabel("RIFLE")}
                        <View className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4">
                            {renderInput("name", "Profile name", name, setName, { placeholder: "e.g. Tikka T3x .308" })}
                            {renderInput("caliber", "Caliber", caliber, setCaliber, { placeholder: "e.g. .308 Win, 6.5 Creedmoor" })}

                            <Text className="text-white/70 text-xs font-semibold mb-1.5">Units</Text>
                            <View className="flex-row rounded-xl bg-brand-black/60 border border-brand-green/60 p-1">
                                {(
                                    [
                                        { value: "IMPERIAL", title: "Imperial", detail: "yards · inches" },
                                        { value: "METRIC", title: "Metric", detail: "meters · cm" },
                                    ] as const
                                ).map((option) => {
                                    const selected = unitSystem === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setUnitSystem(option.value);
                                            }}
                                            activeOpacity={0.85}
                                            className={`flex-1 py-2 rounded-lg items-center border ${
                                                selected ? "bg-brand-green border-brand-greenLight/70" : "border-transparent"
                                            }`}
                                        >
                                            <Text className={selected ? "text-white text-sm font-bold" : "text-white/50 text-sm"}>
                                                {option.title}
                                            </Text>
                                            <Text className={selected ? "text-white/70 text-[10px]" : "text-white/35 text-[10px]"}>
                                                {option.detail}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Ammo & ballistics */}
                        {sectionLabel("AMMO & BALLISTICS")}
                        <View className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4 pb-0.5">
                            {renderInput("weight", "Bullet weight", bulletWeightGrains, setBulletWeightGrains, {
                                placeholder: "e.g. 168",
                                keyboardType: "numeric",
                                suffix: "gr",
                            })}
                            {renderInput("bc", "Ballistic coefficient", ballisticCoefficient, setBallisticCoefficient, {
                                placeholder: "e.g. 0.47",
                                keyboardType: "decimal-pad",
                                suffix: "G1",
                            })}
                            {renderInput("velocity", "Muzzle velocity", muzzleVelocityFps, setMuzzleVelocityFps, {
                                placeholder: "e.g. 2650",
                                keyboardType: "numeric",
                                suffix: "fps",
                                // The solver always uses feet per second, also for metric rifles
                                helperText: "Always in feet per second, as printed on most ammo boxes.",
                            })}
                        </View>

                        {/* Zero & scope */}
                        {sectionLabel("ZERO & SCOPE")}
                        <View className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-4">
                            {renderInput("zero", "Zero distance", zeroDistance, setZeroDistance, {
                                placeholder: "e.g. 100",
                                keyboardType: "numeric",
                                suffix: isImperial ? "yd" : "m",
                            })}
                            {renderInput("height", "Scope height", scopeHeight, setScopeHeight, {
                                placeholder: isImperial ? "e.g. 1.5" : "e.g. 3.8",
                                keyboardType: "decimal-pad",
                                suffix: isImperial ? "in" : "cm",
                                helperText: "Center of the scope to center of the bore.",
                            })}

                            <Text className="text-white/70 text-xs font-semibold mb-1.5">Turret clicks</Text>
                            <ClickValuePicker
                                scopeUnit={scopeUnit}
                                clickSize={clickSize}
                                onChange={(unit, size) => {
                                    setScopeUnit(unit);
                                    setClickSize(size);
                                }}
                            />
                            <Text className="text-xs text-white/40 mt-1.5 mb-3.5">Printed on the turret cap.</Text>

                            <Text className="text-white/70 text-xs font-semibold mb-1.5">Hunting magnification</Text>
                            <MagnificationField value={scopeMagnification} onChange={setScopeMagnification} />
                            <Text className="text-xs text-white/40 mt-1.5">
                                The power you hunt at. Calibration is done at this magnification.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* ===================== SAVE ===================== */}
                    <View className="px-6 pt-3 pb-6 border-t border-brand-green/40">
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting}
                            activeOpacity={0.85}
                            className={`rounded-2xl py-4 flex-row items-center justify-center bg-brand-green border border-brand-greenLight/60 ${
                                submitting ? "opacity-60" : ""
                            }`}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <>
                                    <Image source={icons.check} className="size-4 mr-2" resizeMode="contain" tintColor="#ffffff" />
                                    <Text className="text-lg font-bold text-white">{isEdit ? "Save changes" : "Save rifle"}</Text>
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
