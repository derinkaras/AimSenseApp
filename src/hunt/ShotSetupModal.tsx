// ============================================================
// src/hunt/ShotSetupModal.tsx - Target distance + optional wind and air conditions
// ============================================================
// Opens when the shooter confirms a target. Distance is the only required entry; wind,
// altitude, temperature and pressure are optional (blank = calm air / standard air).
// Distance: tap the field to type the exact yardage, or use a quick pick. The keyboard never
// opens by itself, so the sheet slides up cleanly. Landscape puts distance and conditions side by side.

import React, { useEffect, useRef, useState } from "react";
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSheetFrame } from "@/components/sheetFrame";
import * as Haptics from "expo-haptics";
import icons from "@/constants/icons";
import {
    getConditionLimits,
    getConditionUnits,
    hasConditions,
    parseNumber,
    type ShotConditions,
} from "./conditions";
import { parseVoiceShotSetup } from "./voiceParse";
import { SpeechModule, useSpeechEvent, VOICE_AVAILABLE } from "./speech";
import HelpButton from "@/help/HelpButton";
import HelpTopicBody from "@/help/HelpTopicBody";

const CLOCK_POSITIONS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MAX_DISTANCE = 3000; // exclusive, same limit as before
const QUICK_DISTANCES = [100, 200, 300, 400, 500];
// Large system text sizes would push the sheet past the screen; text grows at most this much
const MAX_FONT_SCALE = 1.2;

type Section = "wind" | "air";

interface ShotSetupModalProps {
    visible: boolean;
    isImperial: boolean;
    /** Distance already entered, if any */
    initialDistance: number | null;
    /** Conditions already entered (or remembered from last time) */
    initialConditions: ShotConditions;
    onCancel: () => void;
    onConfirm: (distance: number, conditions: ShotConditions) => void;
}

const asText = (v: number | null) => (v === null ? "" : String(v));

export default function ShotSetupModal({
    visible,
    isImperial,
    initialDistance,
    initialConditions,
    onCancel,
    onConfirm,
}: ShotSetupModalProps) {
    const window = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const frame = getSheetFrame(window, insets);
    const landscape = frame.landscape;
    const distanceUnit = isImperial ? "yd" : "m";
    const units = getConditionUnits(isImperial);
    const limits = getConditionLimits(isImperial);

    const [distanceText, setDistanceText] = useState("");
    const [windSpeedText, setWindSpeedText] = useState("");
    const [windClock, setWindClock] = useState<number | null>(null);
    const [altitudeText, setAltitudeText] = useState("");
    const [temperatureText, setTemperatureText] = useState("");
    const [pressureText, setPressureText] = useState("");
    const [openSection, setOpenSection] = useState<Section | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Voice input: speak the distance/wind/conditions instead of typing them
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const voiceTranscriptRef = useRef(""); // avoids a stale closure in the "end" event handler
    const distanceInputRef = useRef<TextInput>(null);

    // Start from the current values each time the form opens
    useEffect(() => {
        if (!visible) return;
        setDistanceText(initialDistance ? String(initialDistance) : "");
        setWindSpeedText(asText(initialConditions.windSpeed));
        setWindClock(initialConditions.windClock);
        setAltitudeText(asText(initialConditions.altitude));
        setTemperatureText(asText(initialConditions.temperature));
        setPressureText(asText(initialConditions.pressure));
        setOpenSection(initialConditions.windSpeed !== null ? "wind" : hasConditions(initialConditions) ? "air" : null);
        setShowHelp(false);
        setError(null);
        setIsListening(false);
        setVoiceTranscript("");
        voiceTranscriptRef.current = "";
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Stop listening if the shooter closes the sheet mid-recognition
    useEffect(() => {
        if (!visible && isListening) {
            SpeechModule?.stop();
        }
    }, [visible, isListening]);

    // Fills the same fields manual typing would, so the shooter can glance-confirm before Confirm
    const applyVoiceTranscript = (transcript: string) => {
        if (!transcript.trim()) return;
        const parsed = parseVoiceShotSetup(transcript);
        if (!parsed.matchedAny) {
            setError('Didn\'t catch that — try "300 yards, wind 10 from 3 o\'clock"');
            return;
        }
        if (parsed.distanceText !== null) {
            setDistanceText(parsed.distanceText);
        }
        if (parsed.windSpeedText !== null) {
            setWindSpeedText(parsed.windSpeedText);
        }
        if (parsed.windClock !== null) {
            setWindClock(parsed.windClock);
        }
        if (parsed.altitudeText !== null) setAltitudeText(parsed.altitudeText);
        if (parsed.temperatureText !== null) setTemperatureText(parsed.temperatureText);
        if (parsed.pressureText !== null) setPressureText(parsed.pressureText);
        if (parsed.windSpeedText !== null) {
            setOpenSection("wind");
        } else if (parsed.altitudeText !== null || parsed.temperatureText !== null || parsed.pressureText !== null) {
            setOpenSection("air");
        }
        setError(null);
    };

    useSpeechEvent("start", () => setIsListening(true));

    useSpeechEvent("result", (event) => {
        const transcript = event.results[0]?.transcript ?? "";
        voiceTranscriptRef.current = transcript;
        setVoiceTranscript(transcript);
    });

    useSpeechEvent("error", (event) => {
        setIsListening(false);
        setError(`Didn't catch that (${event.error}). You can still type it in.`);
    });

    useSpeechEvent("end", () => {
        setIsListening(false);
        applyVoiceTranscript(voiceTranscriptRef.current);
    });

    const handleMicPress = async () => {
        if (!SpeechModule) return;
        if (isListening) {
            SpeechModule.stop();
            return;
        }
        Keyboard.dismiss();
        const permission = await SpeechModule.requestPermissionsAsync();
        if (!permission.granted) {
            setError("Microphone permission is needed for voice input");
            return;
        }
        voiceTranscriptRef.current = "";
        setVoiceTranscript("");
        setError(null);
        SpeechModule.start({
            lang: "en-US",
            interimResults: true,
            continuous: false,
        });
    };

    const checkRange = (label: string, value: number | null, [min, max]: number[], unit: string): string | null => {
        if (value === null) return null;
        if (value < min || value > max) return `${label} must be between ${min} and ${max} ${unit}`;
        return null;
    };

    const handleConfirm = () => {
        Keyboard.dismiss();

        const distance = parseFloat(distanceText);
        if (isNaN(distance) || distance <= 0 || distance >= MAX_DISTANCE) {
            setError(`Enter a distance between 1 and ${MAX_DISTANCE - 1} ${distanceUnit}`);
            return;
        }

        const windSpeed = parseNumber(windSpeedText);
        const altitude = parseNumber(altitudeText);
        const temperature = parseNumber(temperatureText);
        const pressure = parseNumber(pressureText);

        const rangeError =
            checkRange("Wind speed", windSpeed, limits.wind, units.wind) ??
            checkRange("Altitude", altitude, limits.altitude, units.altitude) ??
            checkRange("Temperature", temperature, limits.temperature, units.temperature) ??
            checkRange("Pressure", pressure, limits.pressure, units.pressure);
        if (rangeError) {
            setOpenSection(rangeError.startsWith("Wind") ? "wind" : "air");
            setError(rangeError);
            return;
        }

        const hasWind = windSpeed !== null && windSpeed > 0;
        if (hasWind && windClock === null) {
            setOpenSection("wind");
            setError("Pick which direction the wind is coming from");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm(distance, {
            windSpeed: hasWind ? windSpeed : null,
            windClock: hasWind ? windClock : null,
            altitude,
            temperature,
            pressure,
        });
    };

    const clearWind = () => {
        setWindSpeedText("");
        setWindClock(null);
    };

    const toggleSection = (section: Section) => {
        Haptics.selectionAsync();
        Keyboard.dismiss();
        setOpenSection((open) => (open === section ? null : section));
    };

    const pickDistance = (d: number) => {
        Haptics.selectionAsync();
        setDistanceText(String(d));
        setError(null);
    };

    // One-line summaries shown on the collapsed cards
    const windSummary =
        windSpeedText.trim() !== ""
            ? `${windSpeedText} ${units.wind}${windClock !== null ? ` from ${windClock}` : ""}`
            : "Calm";
    const airParts = [
        altitudeText.trim() !== "" && `${altitudeText} ${units.altitude}`,
        temperatureText.trim() !== "" && `${temperatureText}${units.temperature}`,
        pressureText.trim() !== "" && `${pressureText} ${units.pressure}`,
    ].filter(Boolean);
    const airSummary = airParts.length > 0 ? airParts.join(" · ") : "Standard";

    const renderField = (
        label: string,
        value: string,
        onChange: (t: string) => void,
        unit: string,
        keyboard: "numeric" | "numbers-and-punctuation" = "numeric"
    ) => (
        <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {label}
            </Text>
            <View style={styles.fieldBox}>
                <TextInput
                    style={styles.fieldInput}
                    value={value}
                    onChangeText={(t) => {
                        onChange(t);
                        setError(null);
                    }}
                    keyboardType={keyboard}
                    placeholder="Standard"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    returnKeyType="done"
                    accessibilityLabel={label}
                    maxFontSizeMultiplier={MAX_FONT_SCALE}
                />
                <Text style={styles.fieldUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {unit}
                </Text>
            </View>
        </View>
    );

    // ==================== DISTANCE ====================
    const distanceDisplay = (
        <View>
            <Pressable style={styles.distanceCard} onPress={() => distanceInputRef.current?.focus()}>
                    <TextInput
                        ref={distanceInputRef}
                        style={styles.distanceInput}
                        value={distanceText}
                        onChangeText={(t) => {
                            setDistanceText(t.replace(/[^0-9]/g, ""));
                            setError(null);
                        }}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        selectTextOnFocus
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        maxLength={4}
                        maxFontSizeMultiplier={MAX_FONT_SCALE}
                        accessibilityLabel={`Target distance in ${distanceUnit === "yd" ? "yards" : "meters"}`}
                    />
                    <Text style={styles.distanceUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        {distanceUnit}
                    </Text>
            </Pressable>
            {distanceText === "" && (
                <Text style={styles.distanceHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    Tap to enter the exact distance
                </Text>
            )}

            <View style={styles.quickRow}>
                {QUICK_DISTANCES.map((d) => {
                    const selected = distanceText === String(d);
                    return (
                        <Pressable
                            key={d}
                            onPress={() => pickDistance(d)}
                            accessibilityRole="button"
                            accessibilityLabel={`${d} ${distanceUnit}`}
                            style={[styles.quickChip, selected && styles.quickChipSelected]}
                        >
                            <Text
                                style={[styles.quickChipText, selected && styles.quickChipTextSelected]}
                                maxFontSizeMultiplier={MAX_FONT_SCALE}
                            >
                                {d}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {VOICE_AVAILABLE && (
                <Pressable
                    onPress={handleMicPress}
                    accessibilityRole="button"
                    style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
                >
                    <View style={[styles.voiceDot, isListening && styles.voiceDotActive]} />
                    <Text style={[styles.voiceText, isListening && styles.voiceTextActive]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        {isListening ? "Listening - tap to stop" : "Say it instead"}
                    </Text>
                </Pressable>
            )}
            {isListening && voiceTranscript !== "" && (
                <Text style={styles.voiceTranscript} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    &ldquo;{voiceTranscript}&rdquo;
                </Text>
            )}
        </View>
    );

    // ==================== CONDITIONS ====================
    const conditionsBlock = (
        <View style={{ gap: 8 }}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    CONDITIONS
                </Text>
                <Text style={styles.sectionHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    Optional
                </Text>
            </View>

            <View style={styles.conditionCard}>
                <Pressable
                    onPress={() => toggleSection("wind")}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: openSection === "wind" }}
                    style={styles.conditionHeader}
                >
                    <Text style={styles.conditionTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        Wind
                    </Text>
                    <Text
                        style={[styles.conditionSummary, windSummary !== "Calm" && styles.conditionSummarySet]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={MAX_FONT_SCALE}
                    >
                        {windSummary}
                    </Text>
                    <Image
                        source={openSection === "wind" ? icons.chevronUp : icons.chevronDown}
                        style={styles.chevron}
                        resizeMode="contain"
                    />
                </Pressable>
                {openSection === "wind" && (
                    <View style={styles.conditionBody}>
                        {renderField("Speed", windSpeedText, setWindSpeedText, units.wind)}
                        <WindClock
                            value={windClock}
                            onChange={(c) => {
                                Haptics.selectionAsync();
                                setWindClock(c);
                                setError(null);
                            }}
                        />
                        <Text style={styles.helpText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                            Where it comes from, looking at the target. 12 = headwind, 3 = from your right.
                        </Text>
                        {(windSpeedText.trim() !== "" || windClock !== null) && (
                            <Pressable onPress={clearWind} accessibilityRole="button" hitSlop={8}>
                                <Text style={styles.clearText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                                    Clear wind
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>

            <View style={styles.conditionCard}>
                <Pressable
                    onPress={() => toggleSection("air")}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: openSection === "air" }}
                    style={styles.conditionHeader}
                >
                    <Text style={styles.conditionTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        Air
                    </Text>
                    <Text
                        style={[styles.conditionSummary, airSummary !== "Standard" && styles.conditionSummarySet]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={MAX_FONT_SCALE}
                    >
                        {airSummary}
                    </Text>
                    <Image
                        source={openSection === "air" ? icons.chevronUp : icons.chevronDown}
                        style={styles.chevron}
                        resizeMode="contain"
                    />
                </Pressable>
                {openSection === "air" && (
                    <View style={styles.conditionBody}>
                        {renderField("Altitude", altitudeText, setAltitudeText, units.altitude, "numbers-and-punctuation")}
                        {renderField("Temp", temperatureText, setTemperatureText, units.temperature, "numbers-and-punctuation")}
                        {renderField("Pressure", pressureText, setPressureText, units.pressure)}
                        <Text style={styles.helpText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                            Blank = standard air. Use the pressure where you are, not the sea-level figure. Remembered for next time.
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    const confirmButton = (
        <Pressable onPress={handleConfirm} accessibilityRole="button" style={styles.confirmBtn}>
            <Text style={styles.confirmText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                Show holdover
            </Text>
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onCancel}
            supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
        >
            <KeyboardAvoidingView style={[styles.root, frame.rootStyle]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close" />
                <View style={[styles.sheet, landscape && styles.sheetLandscape, frame.sheetStyle]}>
                    <View style={styles.grabber} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eyebrow} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                                TARGET
                            </Text>
                            <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1}>
                                How far is it?
                            </Text>
                        </View>
                        <HelpButton onPress={() => setShowHelp((v) => !v)} size={30} />
                        <Pressable
                            onPress={onCancel}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel"
                            hitSlop={10}
                            style={styles.closeButton}
                        >
                            <Image source={icons.cancel} style={styles.closeIcon} resizeMode="contain" />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={frame.scrollStyle}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {showHelp && (
                            <View style={styles.helpBox}>
                                <HelpTopicBody topic="shotSetup" compact />
                            </View>
                        )}

                        {landscape ? (
                            <View style={styles.columns}>
                                <View style={{ flex: 1 }}>{distanceDisplay}</View>
                                <View style={{ flex: 1 }}>{conditionsBlock}</View>
                            </View>
                        ) : (
                            <View style={{ gap: 14 }}>
                                {distanceDisplay}
                                {conditionsBlock}
                            </View>
                        )}

                        {error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                                    {error}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: frame.footerPaddingBottom }]}>{confirmButton}</View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ==================== WIND CLOCK ====================
// The 12 clock positions around a circle, as seen from the rifle looking at the target.

const CLOCK_SIZE = 156;
const CLOCK_CHIP = 32;
const CLOCK_RADIUS = (CLOCK_SIZE - CLOCK_CHIP) / 2;

function WindClock({ value, onChange }: { value: number | null; onChange: (c: number) => void }) {
    return (
        <View style={styles.clock}>
            <View style={styles.clockRing} />
            <View style={styles.clockCenter} pointerEvents="none">
                <Text style={styles.clockCenterLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    FROM
                </Text>
                <Text style={styles.clockCenterValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {value === null ? "-" : `${value}:00`}
                </Text>
            </View>
            {CLOCK_POSITIONS.map((c) => {
                const angle = ((c % 12) * 30 * Math.PI) / 180;
                const left = CLOCK_SIZE / 2 + CLOCK_RADIUS * Math.sin(angle) - CLOCK_CHIP / 2;
                const top = CLOCK_SIZE / 2 - CLOCK_RADIUS * Math.cos(angle) - CLOCK_CHIP / 2;
                const selected = value === c;
                return (
                    <Pressable
                        key={c}
                        onPress={() => onChange(c)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Wind from ${c} o'clock`}
                        style={[styles.clockChip, { left, top }, selected && styles.clockChipSelected]}
                    >
                        <Text
                            style={[styles.clockChipText, selected && styles.clockChipTextSelected]}
                            maxFontSizeMultiplier={MAX_FONT_SCALE}
                        >
                            {c}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// Brand palette (tailwind.config.js)
const BUTTON = "#284a37"; // brand-green: buttons
const GREEN = "#0b7f4f"; // brand-greenLight: accents and selection
const SELECTED_BG = "#0e2018"; // brand-greenDark
const SURFACE = "rgba(14, 32, 24, 0.6)"; // brand-greenDark/60: cards
const BORDER = "rgba(40, 74, 55, 0.5)"; // brand-green/50

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    sheet: {
        backgroundColor: "#121212", // brand-black
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(40, 74, 55, 0.6)", // brand-green/60
        width: "100%",
    },
    sheetLandscape: {
        alignSelf: "center",
        borderRadius: 24,
    },
    grabber: {
        alignSelf: "center",
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.2)",
        marginTop: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 18,
        paddingTop: 8,
    },
    eyebrow: {
        color: GREEN,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.6,
    },
    title: {
        color: "white",
        fontSize: 19,
        fontWeight: "700",
        marginTop: 1,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: SELECTED_BG,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    closeIcon: {
        width: 11,
        height: 11,
        tintColor: "#ffffff",
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 6,
    },
    columns: {
        flexDirection: "row",
        gap: 14,
    },
    helpBox: {
        backgroundColor: SURFACE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 12,
        marginBottom: 12,
    },

    // Distance
    distanceCard: {
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SURFACE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 12,
    },
    distanceInput: {
        minWidth: 64,
        fontSize: 32,
        fontWeight: "700",
        color: "white",
        textAlign: "center",
        fontVariant: ["tabular-nums"],
        paddingVertical: 0,
    },
    distanceHint: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 12,
        textAlign: "center",
        marginTop: 6,
    },
    distanceUnit: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 17,
        fontWeight: "600",
        marginLeft: 6,
    },
    quickRow: {
        flexDirection: "row",
        gap: 6,
        marginTop: 8,
    },
    quickChip: {
        flex: 1,
        height: 34,
        borderRadius: 10,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    quickChipSelected: {
        backgroundColor: SELECTED_BG,
        borderColor: GREEN,
    },
    quickChipText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        fontWeight: "600",
    },
    quickChipTextSelected: {
        color: "white",
    },
    voiceButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: BORDER,
        marginTop: 8,
    },
    voiceButtonActive: {
        backgroundColor: "rgba(11,127,79,0.15)",
        borderColor: GREEN,
    },
    voiceDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.4)",
    },
    voiceDotActive: {
        backgroundColor: GREEN,
    },
    voiceText: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 13,
        fontWeight: "600",
    },
    voiceTextActive: {
        color: GREEN,
    },
    voiceTranscript: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        fontStyle: "italic",
        textAlign: "center",
        marginTop: 6,
    },

    // Conditions
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
    },
    sectionLabel: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.6,
    },
    sectionHint: {
        color: "rgba(255,255,255,0.35)",
        fontSize: 11,
    },
    conditionCard: {
        backgroundColor: SURFACE,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: "hidden",
    },
    conditionHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        height: 44,
        gap: 8,
    },
    conditionTitle: {
        color: "white",
        fontSize: 15,
        fontWeight: "600",
    },
    conditionSummary: {
        flex: 1,
        textAlign: "right",
        color: "rgba(255,255,255,0.45)",
        fontSize: 13,
    },
    conditionSummarySet: {
        color: GREEN,
        fontWeight: "600",
    },
    chevron: {
        width: 12,
        height: 12,
        tintColor: "rgba(255,255,255,0.5)",
    },
    conditionBody: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        gap: 8,
    },
    fieldRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    fieldLabel: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 13,
        width: 64,
    },
    fieldBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#121212",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 10,
        height: 38,
    },
    fieldInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        color: "white",
    },
    fieldUnit: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 6,
    },
    helpText: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 11,
        lineHeight: 15,
    },
    clearText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        fontWeight: "600",
    },

    // Wind clock
    clock: {
        width: CLOCK_SIZE,
        height: CLOCK_SIZE,
        alignSelf: "center",
        marginVertical: 2,
    },
    clockRing: {
        position: "absolute",
        left: CLOCK_CHIP / 2,
        top: CLOCK_CHIP / 2,
        width: CLOCK_SIZE - CLOCK_CHIP,
        height: CLOCK_SIZE - CLOCK_CHIP,
        borderRadius: (CLOCK_SIZE - CLOCK_CHIP) / 2,
        borderWidth: 1,
        borderColor: BORDER,
    },
    clockCenter: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    clockCenterLabel: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: 1.4,
    },
    clockCenterValue: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
        marginTop: 1,
    },
    clockChip: {
        position: "absolute",
        width: CLOCK_CHIP,
        height: CLOCK_CHIP,
        borderRadius: CLOCK_CHIP / 2,
        backgroundColor: "#121212",
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    clockChipSelected: {
        backgroundColor: BUTTON,
        borderColor: GREEN,
    },
    clockChipText: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 13,
        fontWeight: "600",
    },
    clockChipTextSelected: {
        color: "white",
        fontWeight: "700",
    },

    errorBox: {
        marginTop: 10,
        backgroundColor: "rgba(239,68,68,0.1)",
        borderWidth: 1,
        borderColor: "rgba(239,68,68,0.4)",
        borderRadius: 10,
        padding: 10,
    },
    errorText: {
        color: "#fca5a5",
        fontSize: 12,
        textAlign: "center",
    },
    footer: {
        paddingHorizontal: 18,
        paddingTop: 8,
    },
    confirmBtn: {
        height: 48,
        borderRadius: 14,
        backgroundColor: BUTTON,
        borderWidth: 1,
        borderColor: "rgba(11, 127, 79, 0.5)", // brand-greenLight/50
        alignItems: "center",
        justifyContent: "center",
    },
    confirmText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
});
