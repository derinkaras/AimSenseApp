// ============================================================
// rifle.tsx - Choose a rifle (calibration entry point)
// ============================================================
// Calibration belongs to a rifle: its scope and the phone mounted on it.
// - A rifle calibrated before is "Ready": tapping it only re-checks the crosshair.
// - Otherwise a setup sheet collects the scope details (saved to the gun profile)
//   and the phone mount, then the Line Up and Measure screens run.
// Opening with ?setup=<gunId> jumps straight to that rifle's setup sheet (used by "Recalibrate").

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "expo-router/react-navigation";
import * as Haptics from "expo-haptics";

import {
  useCalibrationStore,
  lockToPortrait,
  loadCalibration,
  isScopeSetupComplete,
  getClickSizeLabel,
  type CalibrationResult,
  type MountOrientation,
  type ScopeSetup,
  type ScopeUnit,
} from "@/calibration";
import { ClickValuePicker, MagnificationField, MountPicker } from "@/calibration/ScopeSetupFields";
import { cn } from "@/calibration/styles";
import { gunProfileApi } from "@/services/gunProfile";
import { getSheetFrame } from "@/components/sheetFrame";
import { useGunProfilesDirty } from "@/contexts/GunProfilesDirtyContext";
import icons from "@/constants/icons";
import type { GunProfile } from "@/types/apiTypes";
import HelpButton from "@/help/HelpButton";
import InfoPopup from "@/help/InfoPopup";
import { hasSeenCalibrationIntro, markCalibrationIntroSeen } from "@/help/helpStorage";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "rifle";

/** The scope details stored on a gun profile, if all of them are there. */
function scopeOf(gun: GunProfile): ScopeSetup | null {
  const scope = { scopeUnit: gun.scopeUnit, clickSize: gun.clickSize, scopeMagnification: gun.scopeMagnification };
  return isScopeSetupComplete(scope) ? scope : null;
}

export default function RifleScreen() {
  const navigation = useNavigation();
  const { setup: setupGunId } = useLocalSearchParams<{ setup?: string }>();
  const { setActiveScreen } = useCameraContext();
  const { markDirty } = useGunProfilesDirty();
  const sheetFrame = getSheetFrame(useWindowDimensions(), useSafeAreaInsets());

  const beginSetup = useCalibrationStore((s) => s.beginSetup);
  const beginRecheck = useCalibrationStore((s) => s.beginRecheck);
  const resetCalibration = useCalibrationStore((s) => s.resetCalibration);

  const [guns, setGuns] = useState<GunProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saved, setSaved] = useState<Record<string, CalibrationResult | null>>({});
  const [starting, setStarting] = useState<string | null>(null);

  // Setup sheet
  const [sheetGun, setSheetGun] = useState<GunProfile | null>(null);
  const [scopeUnit, setScopeUnit] = useState<ScopeUnit | null>(null);
  const [clickSize, setClickSize] = useState<number | null>(null);
  const [magnification, setMagnification] = useState<number | null>(null);
  const [mount, setMount] = useState<MountOrientation | null>(null);
  const autoOpened = useRef(false);

  // How setup works: shown by itself the first time, and any time from the "?" button
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    hasSeenCalibrationIntro().then((seen) => {
      if (!seen) setShowIntro(true);
    });
  }, []);
  const closeIntro = () => {
    markCalibrationIntroSeen();
    setShowIntro(false);
  };

  const openSetup = useCallback((gun: GunProfile, savedResults: Record<string, CalibrationResult | null>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScopeUnit(gun.scopeUnit ?? null);
    setClickSize(gun.clickSize ?? null);
    setMagnification(gun.scopeMagnification ?? null);
    setMount(gun.id ? savedResults[gun.id]?.mountOrientation ?? null : null);
    setSheetGun(gun);
  }, []);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const list = await gunProfileApi.getAllUserGunProfiles();
      const entries = await Promise.all(
        list.map(async (gun) => {
          const scope = scopeOf(gun);
          const result = gun.id && scope ? await loadCalibration(gun.id, scope) : null;
          return [gun.id ?? "", result] as const;
        })
      );
      const savedResults = Object.fromEntries(entries);
      setSaved(savedResults);
      setGuns(list);

      // "Recalibrate" from hunt mode lands here with the rifle to set up
      const gunToSetUp = setupGunId && !autoOpened.current ? list.find((g) => g.id === setupGunId) : undefined;
      if (gunToSetUp) {
        autoOpened.current = true;
        openSetup(gunToSetUp, savedResults);
      }
    } catch (error) {
      console.warn("Could not load rifles:", error);
      setLoadError(true);
    }
  }, [setupGunId, openSetup]);

  // Every time this screen shows: portrait, no camera, fresh list (a rifle may have just been added)
  useFocusEffect(
    useCallback(() => {
      setActiveScreen(SCREEN_ID);
      lockToPortrait();
      load();
    }, [setActiveScreen, load])
  );

  const handleExit = async () => {
    await resetCalibration();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "(tabs)" }] }));
  };

  const handleRiflePress = async (gun: GunProfile) => {
    const result = gun.id ? saved[gun.id] : null;
    if (!result) {
      openSetup(gun, saved);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStarting(gun.id ?? null);
    await beginRecheck(gun, result);
    setStarting(null);
    router.push("/(calibration)/lineup");
  };

  const scope: Partial<ScopeSetup> = { scopeUnit: scopeUnit ?? undefined, clickSize: clickSize ?? undefined, scopeMagnification: magnification ?? undefined };
  const sheetComplete = isScopeSetupComplete(scope) && mount !== null;

  const handleStartSetup = async () => {
    if (!sheetGun || !isScopeSetupComplete(scope) || !mount) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStarting(sheetGun.id ?? null);

    // Keep the scope details on the rifle so they are never asked again
    const changed =
      sheetGun.scopeUnit !== scope.scopeUnit ||
      sheetGun.clickSize !== scope.clickSize ||
      sheetGun.scopeMagnification !== scope.scopeMagnification;
    if (changed && sheetGun.id) {
      try {
        await gunProfileApi.updateSpecificGunProfile(sheetGun.id, scope);
        markDirty();
      } catch (error) {
        // Calibration keeps its own copy, so carry on; the sheet will just ask again next time
        console.warn("Could not save scope details to the rifle:", error);
      }
    }

    const gun = { ...sheetGun, ...scope };
    await beginSetup(gun, scope, mount);
    setSheetGun(null);
    setStarting(null);
    router.push("/(calibration)/lineup");
  };

  // ==================== RENDER ====================
  return (
    <SafeAreaView className="flex-1 bg-brand-black" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable
          onPress={handleExit}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          className="w-10 h-10 rounded-full bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center"
        >
          <Image source={icons.cancel} className="w-4 h-4" resizeMode="contain" style={{ tintColor: "#ffffff" }} />
        </Pressable>
        <HelpButton onPress={() => setShowIntro(true)} size={32} />
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text className="text-white text-3xl font-bold">Choose your rifle</Text>
        <Text className="text-white/60 text-base mt-2 leading-6">
          You set up each rifle once. After that, starting a hunt takes seconds, as long as it has the same scope,
          magnification and phone. If any of those change, tap Recalibrate.
        </Text>

        <View className="mt-6 gap-3">
          {guns === null && !loadError && (
            <View className="py-16 items-center">
              <ActivityIndicator color="#0b7f4f" />
            </View>
          )}

          {loadError && (
            <View className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 p-5 items-center">
              <Text className="text-white font-semibold">{"Couldn't load your rifles"}</Text>
              <Pressable onPress={load} accessibilityRole="button" className="mt-3 px-5 py-2.5 rounded-xl bg-brand-green border border-brand-greenLight/50">
                <Text className="text-white font-semibold">Try again</Text>
              </Pressable>
            </View>
          )}

          {guns?.length === 0 && (
            <View className="rounded-3xl bg-brand-greenDark/60 border border-brand-green/50 p-6 items-center">
              <View className="w-14 h-14 rounded-2xl bg-brand-greenDark items-center justify-center">
                <Image source={icons.rifle} className="w-8 h-8" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
              </View>
              <Text className="text-white text-lg font-semibold mt-4">Add your first rifle</Text>
              <Text className="text-white/60 text-sm text-center mt-2 leading-5">
                {"AimSense needs your rifle's ammo and scope details to work out holdovers."}
              </Text>
              <Pressable
                onPress={() => router.push("/(pages)/AddGunProfile")}
                accessibilityRole="button"
                className="mt-5 w-full h-12 rounded-2xl bg-brand-green border border-brand-greenLight/50 items-center justify-center"
              >
                <Text className="text-white text-base font-semibold">Add a rifle</Text>
              </Pressable>
            </View>
          )}

          {guns?.map((gun) => {
            const ready = !!(gun.id && saved[gun.id]);
            const gunScope = scopeOf(gun);
            const details = [gun.caliber, gunScope && getClickSizeLabel(gunScope.scopeUnit, gunScope.clickSize), gunScope && `${gunScope.scopeMagnification}×`]
              .filter(Boolean)
              .join("  ·  ");
            return (
              <View key={gun.id} className="rounded-2xl bg-brand-greenDark/60 border border-brand-green/50 overflow-hidden">
                <Pressable
                  onPress={() => handleRiflePress(gun)}
                  disabled={starting !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`${gun.name}, ${ready ? "ready" : "needs setup"}`}
                  className="flex-row items-center p-4"
                >
                  {gun.gunPhotoUri ? (
                    <Image source={{ uri: gun.gunPhotoUri }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
                  ) : (
                    <View className="w-14 h-14 rounded-xl bg-brand-greenDark items-center justify-center">
                      <Image source={icons.rifle} className="w-8 h-8" resizeMode="contain" style={{ tintColor: "#0b7f4f" }} />
                    </View>
                  )}
                  <View className="flex-1 ml-4">
                    <Text className="text-white text-base font-semibold" numberOfLines={1}>
                      {gun.name}
                    </Text>
                    <Text className="text-white/50 text-sm mt-0.5" numberOfLines={1}>
                      {details}
                    </Text>
                  </View>
                  {starting === gun.id ? (
                    <ActivityIndicator color="#0b7f4f" />
                  ) : (
                    <View
                      className={cn(
                        "px-3 py-1.5 rounded-full",
                        ready ? "bg-brand-greenLight/20 border border-brand-greenLight/50" : "bg-white/5 border border-white/15"
                      )}
                    >
                      <Text className={cn("text-xs font-bold", ready ? "text-brand-greenLight" : "text-white/70")}>
                        {ready ? "READY" : "SET UP"}
                      </Text>
                    </View>
                  )}
                </Pressable>
                {ready && (
                  <Pressable
                    onPress={() => openSetup(gun, saved)}
                    disabled={starting !== null}
                    accessibilityRole="button"
                    className="border-t border-brand-green/50 py-2.5 items-center"
                  >
                    <Text className="text-white/60 text-xs font-semibold">Recalibrate</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {!!guns?.length && (
            <Pressable
              onPress={() => router.push("/(pages)/AddGunProfile")}
              accessibilityRole="button"
              className="h-12 rounded-2xl border border-dashed border-brand-green/60 items-center justify-center flex-row"
            >
              <Image source={icons.plus} className="w-4 h-4 mr-2" resizeMode="contain" style={{ tintColor: "#9ca3af" }} />
              <Text className="text-white/70 text-sm font-semibold">Add another rifle</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <InfoPopup topic={showIntro ? "calibrationIntro" : null} onClose={closeIntro} />

      {/* Setup sheet */}
      <Modal visible={sheetGun !== null} transparent animationType="slide" onRequestClose={() => setSheetGun(null)}>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          style={sheetFrame.rootStyle}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable className="absolute inset-0 bg-black/60" onPress={() => setSheetGun(null)} accessibilityLabel="Close setup" />
          <View className="w-full bg-brand-black rounded-t-3xl border-t border-white/10" style={sheetFrame.sheetStyle}>
              <View className="items-center pt-3">
                <View className="w-10 h-1 rounded-full bg-white/20" />
              </View>
              <ScrollView
                className="px-5"
                style={sheetFrame.scrollStyle}
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, gap: 22 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View>
                  <Text className="text-white text-2xl font-bold">Set up {sheetGun?.name}</Text>
                  <Text className="text-white/60 text-sm mt-1.5 leading-5">
                    Two quick screens follow. Have the rifle on a solid rest, the phone in its scope mount, and a target with a small, sharp mark.
                  </Text>
                </View>

                <SheetSection title="Turret clicks" hint="Printed on the turret cap">
                  <ClickValuePicker
                    scopeUnit={scopeUnit}
                    clickSize={clickSize}
                    onChange={(unit, size) => {
                      setScopeUnit(unit);
                      setClickSize(size);
                    }}
                  />
                </SheetSection>

                <SheetSection title="Hunting magnification" hint="Set the scope to this and leave it there">
                  <MagnificationField value={magnification} onChange={setMagnification} />
                </SheetSection>

                <SheetSection title="Phone mount" hint="How the phone sits on the scope">
                  <MountPicker value={mount} onChange={setMount} />
                </SheetSection>
              </ScrollView>

              <View className="px-5 pt-3" style={{ paddingBottom: sheetFrame.footerPaddingBottom }}>
                <Pressable
                  onPress={handleStartSetup}
                  disabled={!sheetComplete || starting !== null}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !sheetComplete }}
                  className={cn("h-14 rounded-2xl items-center justify-center", sheetComplete ? "bg-brand-green border border-brand-greenLight/50" : "bg-brand-green/40")}
                >
                  {starting !== null ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className={cn("text-lg font-semibold", sheetComplete ? "text-white" : "text-white/40")}>Continue</Text>
                  )}
                </Pressable>
              </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SheetSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between mb-3">
        <Text className="text-white text-base font-semibold">{title}</Text>
        <Text className="text-white/45 text-xs">{hint}</Text>
      </View>
      {children}
    </View>
  );
}
