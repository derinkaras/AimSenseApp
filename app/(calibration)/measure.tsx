// ============================================================
// measure.tsx - Measure the elevation turret (step 2 of 2)
// ============================================================
// The scope keeps its crosshair centered; turning a turret moves the IMAGE behind it.
// So: crosshair on a sharp mark, dial UP a known number of clicks, tap where the mark went,
// dial back. That one move gives the pixels per MOA/MIL and the "up" direction on screen
// (windage is the same scale at right angles, so it needs no measuring).
// If the move comes out short on screen, the user is asked to keep dialing (see
// getDialMultiple) so the marks' pixel error counts for less.

import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";

import {
  useCalibrationStore,
  getCalibrationClickCount,
  getDialMultiple,
  getTargetMovementLabel,
  TARGET_MEASURED_MOVE_PX,
  nudgePoint,
  type CameraViewSize,
  type ElevationProblem,
  type PixelPoint,
} from "@/calibration";
import { CalibrationStage, CameraHint, Marker, NudgePad } from "@/calibration/CalibrationStage";
import { useHuntStore } from "@/hunt";
import { MAX_FONT_SCALE } from "@/constants/fontScale";
import { useCameraContext } from "./_layout";

const SCREEN_ID = "measure";

type Phase = "dial" | "dialMore" | "tap" | "dialBack";

const PROBLEM_TEXT: Record<ElevationProblem, (movedPx: number) => string> = {
  tooSmall: (px) =>
    `It only moved ${Math.round(px)} px. Tap the mark itself, not the crosshair. If it really moved that little, go back and zoom in more.`,
  sideways: () => "It moved sideways - that's the windage turret. Dial it back, then turn the elevation turret (usually on top).",
  down: () => "It moved down - the turret went the wrong way. Dial it back to zero, then turn it UP.",
};

export default function MeasureScreen() {
  const [permission] = useCameraPermissions();
  const { activeScreen, setActiveScreen } = useCameraContext();
  const store = useCalibrationStore();
  const { gun, scope, scopeCenterPx, cameraLayout } = store;
  const startSession = useHuntStore((s) => s.startSession);

  const [phase, setPhase] = useState<Phase>("dial");
  // How many times the base movement (10 MOA / 3 MIL) is dialed in total
  const [dialMultiple, setDialMultiple] = useState(1);
  // The accepted move was still short on screen (the scope can't dial any further for it)
  const [shortMove, setShortMove] = useState(false);
  const [mark, setMark] = useState<PixelPoint | null>(null);
  const [problem, setProblem] = useState<{ kind: ElevationProblem; movedPx: number } | null>(null);
  const [viewSize, setViewSize] = useState<CameraViewSize | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setActiveScreen(SCREEN_ID);
    }, [setActiveScreen])
  );

  if (!scope || !scopeCenterPx || !cameraLayout) return null;

  const clicks = getCalibrationClickCount(scope.scopeUnit, scope.clickSize);
  const movement = getTargetMovementLabel(scope.scopeUnit);
  const totalClicks = clicks * dialMultiple;
  const totalMovement = getTargetMovementLabel(scope.scopeUnit, dialMultiple);
  const showCamera = !!permission?.granted && activeScreen === SCREEN_ID;
  // A sideways or downward move means the turret has to be dialed back before trying again
  const mustRedial = problem !== null && problem.kind !== "tooSmall";

  const handleTap = (point: PixelPoint) => {
    setMark(point);
    if (problem?.kind === "tooSmall") setProblem(null);
  };

  const handleNudge = (direction: "up" | "down" | "left" | "right", step: number) => {
    if (mark && viewSize) setMark(nudgePoint(mark, direction, step, viewSize));
  };

  const handleCheckMark = () => {
    if (!mark) return;
    const check = store.recordElevation(mark, dialMultiple);
    if (check.ok) {
      setProblem(null);
      const needed = getDialMultiple(check.pxPerUnit, clicks * scope.clickSize);
      if (needed > dialMultiple) {
        // Too short to measure precisely: dial further and tap the mark again
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setDialMultiple(needed);
        setMark(null);
        setPhase("dialMore");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShortMove(check.movedPx < TARGET_MEASURED_MOVE_PX);
      setPhase("dialBack");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setProblem({ kind: check.problem, movedPx: check.movedPx });
    }
  };

  const handleStartOver = () => {
    setProblem(null);
    setMark(null);
    setDialMultiple(1);
    setShortMove(false);
    setPhase("dial");
  };

  const handleFinish = async () => {
    if (!gun) return;
    setBusy(true);
    try {
      const result = await store.finish();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startSession(result, gun);
      router.replace("/(hunt)/active");
    } catch (error) {
      console.error("Could not finish calibration:", error);
      setBusy(false);
    }
  };

  const overlay = (
    <>
      <Marker point={scopeCenterPx} />
      {mark && phase !== "dial" && <Marker point={mark} color="orange" />}
      {phase === "tap" && !mark && <CameraHint text="Tap the mark you aimed at" />}
      {phase === "tap" && mark && !mustRedial && <NudgePad onNudge={handleNudge} />}
    </>
  );

  const common = {
    layout: cameraLayout,
    showCamera,
    zoom: store.cameraZoom,
    focusLocked: store.focusPoint !== null,
    rotation: store.screenRotation,
    onCameraLayout: setViewSize,
    overlay,
    stepLabel: "Step 2 of 2",
    progress: { step: 2, total: 2 },
  };

  if (phase === "dial") {
    return (
      <CalibrationStage
        {...common}
        title={`Dial UP ${clicks} clicks`}
        message={`Rest the rifle with the crosshair on a small, sharp mark. Without moving the rifle, turn the elevation turret UP ${clicks} clicks (${movement}).`}
        primary={{ label: "Done dialing", onPress: () => setPhase("tap") }}
        onBack={() => router.back()}
      >
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/45 text-xs leading-4">
          {`Tip: the turret numbers count too - turning ${movement} is the same as ${clicks} clicks.`}
        </Text>
      </CalibrationStage>
    );
  }

  if (phase === "dialMore") {
    const extraClicks = totalClicks - clicks * (dialMultiple - 1);
    return (
      <CalibrationStage
        {...common}
        title={`Dial ${extraClicks} more clicks UP`}
        message={`The move is small on screen, so dialing further measures it more precisely. Without moving the rifle, keep turning the elevation turret UP another ${extraClicks} clicks (${totalMovement} in total).`}
        primary={{ label: "Done dialing", onPress: () => setPhase("tap") }}
        onBack={() => {
          setDialMultiple(1);
          setPhase("tap");
        }}
      />
    );
  }

  if (phase === "tap") {
    return (
      <CalibrationStage
        {...common}
        onCameraTap={mustRedial ? undefined : handleTap}
        title={mustRedial ? "Let's try that again" : "Tap your mark"}
        message={mustRedial ? undefined : "The crosshair stays put and the picture moves. Find the mark you aimed at and tap it."}
        primary={
          mustRedial
            ? { label: "Start over", onPress: handleStartOver }
            : { label: "That's my mark", onPress: handleCheckMark, disabled: !mark }
        }
        onBack={handleStartOver}
      >
        {problem && (
          <View className="rounded-xl bg-amber-500/10 border border-amber-500/40 p-3">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-amber-200 text-sm leading-5">{PROBLEM_TEXT[problem.kind](problem.movedPx)}</Text>
          </View>
        )}
      </CalibrationStage>
    );
  }

  return (
    <CalibrationStage
      {...common}
      title={`Dial back ${totalClicks} clicks`}
      message="Turn the elevation turret back DOWN to zero. When your mark is back under the green crosshair, start hunting."
      primary={{ label: "Start hunting", onPress: handleFinish, busy }}
      onBack={() => setPhase("tap")}
    >
      {shortMove && (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} className="text-white/45 text-xs leading-4">
          {`Your scope picture is a little small on screen. This calibration is fine to use, no need to redo it: the difference only shows on long shots (inside about ${
            gun?.unitSystem === "IMPERIAL" ? "300 yards it is usually an inch" : "275 meters it is usually 2.5 cm"
          } or less). Next time you calibrate, zooming the camera in a bit more helps at long range.`}
        </Text>
      )}
    </CalibrationStage>
  );
}
