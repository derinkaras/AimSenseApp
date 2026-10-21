// ============================================================
// lineup.tsx - Line up the camera and mark the crosshair
// ============================================================
// New setup (step 1 of 2): zoom so the scope view fills the screen, rotate so the crosshair
// looks square, then tap the crosshair center. Tapping also focuses the camera there.
// The level baseline is captured automatically when the user confirms (rifle rested and still).
//
// Re-check (a rifle calibrated before): camera settings are restored and locked; the user
// only confirms or moves the green marker onto the crosshair, then hunting starts.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCameraPermissions, type CameraView } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router/react-navigation";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";

import {
  useCalibrationStore,
  getCameraLayoutConfig,
  isLandscape,
  nudgePoint,
  tapToNormalizedCameraPoint,
  snapToHalfDegree,
  clampValue,
  lockToPortrait,
  DEFAULT_TILT_CONFIG,
  type CameraViewSize,
  type FocusPoint,
  type PixelPoint,
} from "@/calibration";
import { CalibrationStage, CameraHint, Marker, NudgePad } from "@/calibration/CalibrationStage";
import { useTiltLevel } from "@/hooks/useTiltLevel";
import { useHuntStore } from "@/hunt";
import { useCameraContext } from "./_layout";
import { MAX_FONT_SCALE } from "@/constants/fontScale";

const SCREEN_ID = "lineup";
const MAX_ROTATION = 60;
// Re-checks must use the exact camera area that was calibrated
const VIEW_SIZE_TOLERANCE_PX = 2;

export default function LineUpScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { activeScreen, setActiveScreen } = useCameraContext();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);

  const store = useCalibrationStore();
  const { gun, mountOrientation, isRecheck } = store;
  const startSession = useHuntStore((s) => s.startSession);

  // A re-check reuses the calibrated panel layout so the camera area is identical
  const layout = useMemo(
    () =>
      isRecheck && store.cameraLayout
        ? store.cameraLayout
        : getCameraLayoutConfig(width, height, isLandscape(mountOrientation), insets.bottom, insets.right),
    [isRecheck, store.cameraLayout, width, height, mountOrientation, insets.bottom, insets.right]
  );

  const [zoom, setZoom] = useState(store.cameraZoom);
  const [rotation, setRotation] = useState(store.screenRotation);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(store.focusPoint);
  const [center, setCenter] = useState<PixelPoint | null>(isRecheck ? store.scopeCenterPx : null);
  const [viewSize, setViewSize] = useState<CameraViewSize | null>(null);
  const [busy, setBusy] = useState(false);

  const { isStable, rollNow, pitchNow } = useTiltLevel(mountOrientation, DEFAULT_TILT_CONFIG, {
    enabled: isFocused,
    updateIntervalMs: 50,
  });

  // Going back: camera off, rotate to portrait, THEN leave. Rotating while the back
  // transition is running (with the camera live) can freeze the app, so mirror the way in,
  // which rotates first and then navigates.
  const leaving = useRef(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const handleBack = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    setIsLeaving(true);
    setActiveScreen(null);
    try {
      await lockToPortrait();
    } catch (error) {
      console.warn("Could not rotate to portrait:", error);
    }
    router.back();
  }, [setActiveScreen]);

  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
      setIsLeaving(false);
      setActiveScreen(SCREEN_ID);
      // Android back button takes the same path as the back arrow
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [setActiveScreen, handleBack])
  );

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const showCamera = !!permission?.granted && activeScreen === SCREEN_ID;

  const focusAt = useCallback(async (point: FocusPoint) => {
    try {
      const camera = cameraRef.current as unknown as { focus?: (p: { x: number; y: number }) => Promise<void> } | null;
      await camera?.focus?.({ x: point.normalizedX, y: point.normalizedY });
    } catch (error) {
      console.warn("Could not focus:", error);
    }
  }, []);

  // A re-check restores the saved focus once the camera is up
  useEffect(() => {
    if (!showCamera || !focusPoint || !isRecheck) return;
    const timer = setTimeout(() => focusAt(focusPoint), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCamera]);

  const handleCameraTap = (point: PixelPoint) => {
    setCenter(point);
    if (!isRecheck && viewSize) {
      // The crosshair is what needs to be sharp, so focus where the user tapped
      const normalized = tapToNormalizedCameraPoint(point.x, point.y, viewSize, rotation);
      const next = { ...point, ...normalized };
      setFocusPoint(next);
      focusAt(next);
    }
  };

  const handleNudge = (direction: "up" | "down" | "left" | "right", step: number) => {
    if (center && viewSize) setCenter(nudgePoint(center, direction, step, viewSize));
  };

  // A re-check on a camera area that no longer matches cannot be trusted
  const savedSize = store.cameraViewSize;
  // (skipped while leaving: rotating to portrait on the way out resizes the camera area)
  const layoutChanged =
    !isLeaving &&
    isRecheck &&
    !!viewSize &&
    !!savedSize &&
    (Math.abs(viewSize.width - savedSize.width) > VIEW_SIZE_TOLERANCE_PX ||
      Math.abs(viewSize.height - savedSize.height) > VIEW_SIZE_TOLERANCE_PX);

  const handleConfirm = async () => {
    if (!center || !viewSize) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    store.captureLineUp({
      cameraZoom: zoom,
      focusPoint,
      screenRotation: rotation,
      scopeCenterPx: center,
      cameraViewSize: viewSize,
      cameraLayout: layout,
      roll0: rollNow,
      pitch0: pitchNow,
    });

    if (!isRecheck) {
      router.push("/(calibration)/measure");
      return;
    }
    if (!gun) return;
    setBusy(true);
    try {
      const result = await store.finish();
      startSession(result, gun);
      router.replace("/(hunt)/active");
    } catch (error) {
      console.error("Could not start the hunt:", error);
      setBusy(false);
    }
  };

  const handleRecalibrate = () => {
    if (gun?.id) router.replace({ pathname: "/(calibration)/rifle", params: { setup: gun.id } });
  };

  // ==================== CONTENT ====================
  const steadyRow = (
    <View className="flex-row items-center">
      <View className={isStable ? "w-2 h-2 rounded-full bg-brand-greenLight" : "w-2 h-2 rounded-full bg-amber-400"} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/70 text-xs ml-2">
        {isStable ? "Rifle steady" : "Hold the rifle level and still"}
      </Text>
    </View>
  );

  const overlay = (
    <>
      {center && <Marker point={center} />}
      {!center && <CameraHint text="Tap the center of your crosshair" />}
      {center && <NudgePad onNudge={handleNudge} />}
    </>
  );

  const common = {
    layout,
    showCamera,
    zoom,
    focusLocked: focusPoint !== null,
    rotation,
    cameraRef,
    onCameraTap: handleCameraTap,
    onCameraLayout: setViewSize,
    overlay,
    onBack: handleBack,
  };

  if (layoutChanged) {
    return (
      <CalibrationStage
        {...common}
        onCameraTap={undefined}
        overlay={null}
        stepLabel="Quick check"
        title="Screen layout changed"
        message="The camera area is a different size than when this rifle was calibrated, so the old calibration won't line up. It only takes a minute to redo."
        primary={{ label: "Recalibrate", onPress: handleRecalibrate }}
      />
    );
  }

  if (isRecheck) {
    return (
      <CalibrationStage
        {...common}
        stepLabel="Quick check"
        title="Is green on your crosshair?"
        message={`${gun?.name ?? "Your rifle"} at ${store.scope?.scopeMagnification ?? ""}×. Only use this with the same scope and phone you set it up with. If either changed, go back and choose Recalibrate. If the phone shifted in its mount, tap the crosshair center to move the marker.`}
        primary={{
          label: isStable ? "Start hunting" : "Hold still…",
          onPress: handleConfirm,
          disabled: !center || !viewSize || !isStable,
          busy,
        }}
      >
        {steadyRow}
      </CalibrationStage>
    );
  }

  return (
    <CalibrationStage
      {...common}
      stepLabel="Step 1 of 2"
      progress={{ step: 1, total: 2 }}
      title={center ? "Fine-tune the marker" : "Line up your scope"}
      message={center ? undefined : "Zoom to fill the screen, then rotate until the crosshair looks square."}
      primary={{
        label: !center ? "Tap the crosshair" : isStable ? "Crosshair is set" : "Hold still…",
        onPress: handleConfirm,
        disabled: !center || !viewSize || !isStable,
      }}
    >
      <SliderRow label="Zoom" value={`${Math.round(zoom * 100)}%`} stacked={layout.isLandscapeMode}>
        <Slider
          style={{ flex: 1, height: 36 }}
          minimumValue={0}
          maximumValue={1}
          value={zoom}
          onValueChange={setZoom}
          minimumTrackTintColor="#0b7f4f"
          maximumTrackTintColor="#333333"
          thumbTintColor="#0b7f4f"
          accessibilityLabel="Camera zoom"
        />
      </SliderRow>
      {!center && (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/45 text-xs leading-4">
          Tip: zooming in a bit further makes holdovers more precise, but leaves less room on screen for long shots.
        </Text>
      )}
      <SliderRow label="Rotate" value={`${rotation > 0 ? "+" : ""}${rotation.toFixed(1)}°`} stacked={layout.isLandscapeMode}>
        <FineButton label="−" accessibilityLabel="Rotate counterclockwise" onPress={() => setRotation((r) => clampValue(snapToHalfDegree(r - 0.5), -MAX_ROTATION, MAX_ROTATION))} />
        <Slider
          style={{ flex: 1, height: 36 }}
          minimumValue={-MAX_ROTATION}
          maximumValue={MAX_ROTATION}
          value={rotation}
          step={0.5}
          onValueChange={setRotation}
          minimumTrackTintColor="#0b7f4f"
          maximumTrackTintColor="#333333"
          thumbTintColor="#0b7f4f"
          accessibilityLabel="Camera rotation"
        />
        <FineButton label="+" accessibilityLabel="Rotate clockwise" onPress={() => setRotation((r) => clampValue(snapToHalfDegree(r + 0.5), -MAX_ROTATION, MAX_ROTATION))} />
      </SliderRow>
      {center && steadyRow}
    </CalibrationStage>
  );
}

/**
 * Label, slider (with any extra controls) and value. Stacked puts the label and value on their
 * own line so the slider gets the full width of the narrow landscape side panel.
 */
function SliderRow({
  label,
  value,
  stacked = false,
  children,
}: {
  label: string;
  value: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  if (stacked) {
    return (
      <View>
        <View className="flex-row items-center justify-between">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-sm font-semibold">{label}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-brand-greenLight text-xs font-mono">{value}</Text>
        </View>
        <View className="flex-row items-center gap-2">{children}</View>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-2">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white text-sm font-semibold w-14">{label}</Text>
      {children}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-brand-greenLight text-xs font-mono w-12 text-right">{value}</Text>
    </View>
  );
}

function FineButton({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      className="w-8 h-8 rounded-lg bg-brand-greenDark/60 border border-brand-green/50 items-center justify-center"
    >
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-brand-greenLight text-base font-bold">{label}</Text>
    </Pressable>
  );
}
