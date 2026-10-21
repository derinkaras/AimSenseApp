import React, { useRef, useState, useEffect } from "react";
import {
    View,
    Text,
    Animated,
    Easing,
    PanResponder,
    Dimensions,
    Image,
    StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import icons from "@/constants/icons";

type Props = {
    onComplete: () => void;
    label?: string;
};

// Brand palette (tailwind.config.js)
const BUTTON = "#284a37"; // brand-green
const ACCENT = "#0b7f4f"; // brand-greenLight

const TRACK_HEIGHT = 64;
const THUMB_SIZE = 52;
const PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2 - 1; // centers the thumb inside the 1px border
const CHEVRONS = 3;

export function SlideToStartCalibration({ onComplete, label }: Props) {
    const slideX = useRef(new Animated.Value(0)).current;
    const nudge = useRef(new Animated.Value(0)).current;
    const chevronPulse = useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = useState(0);
    const [done, setDone] = useState(false);

    // Use measured width or fallback to screen width minus padding
    const effectiveWidth = containerWidth || (Dimensions.get('window').width - 48);
    const MAX_SLIDE = Math.max(1, effectiveWidth - THUMB_SIZE - PADDING * 2 - 2);

    // Store MAX_SLIDE in a ref so PanResponder can access current value
    const maxSlideRef = useRef(MAX_SLIDE);
    const onCompleteRef = useRef(onComplete);
    const nudgeLoopRef = useRef<Animated.CompositeAnimation | null>(null);

    // Update refs when values change
    useEffect(() => {
        maxSlideRef.current = MAX_SLIDE;
    }, [MAX_SLIDE]);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Reset animation value on mount to ensure clean state
    useEffect(() => {
        slideX.setValue(0);
        setContainerWidth(0); // Force remeasurement
    }, []);

    // Chevrons pulse left to right, and the thumb gives a small nudge now and then, as a swipe hint
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.timing(chevronPulse, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
        );
        const nudgeLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(2600),
                Animated.timing(nudge, { toValue: 12, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }),
                Animated.spring(nudge, { toValue: 0, tension: 120, friction: 5, useNativeDriver: false }),
            ])
        );
        nudgeLoopRef.current = nudgeLoop;
        pulse.start();
        nudgeLoop.start();
        return () => {
            pulse.stop();
            nudgeLoop.stop();
        };
    }, [chevronPulse, nudge]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,

            onPanResponderGrant: () => {
                // The shooter found the thumb: stop hinting
                nudgeLoopRef.current?.stop();
                nudge.setValue(0);
                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {
                    console.log("Haptics not available");
                }
            },

            onPanResponderMove: (_, gesture) => {
                const currentMaxSlide = maxSlideRef.current;
                const newValue = Math.max(0, Math.min(gesture.dx, currentMaxSlide));
                slideX.setValue(newValue);
            },

            onPanResponderRelease: (_, gesture) => {
                const currentMaxSlide = maxSlideRef.current;
                const threshold = currentMaxSlide * 0.8;

                if (gesture.dx >= threshold) {
                    // Success - complete the slide
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (e) {
                        console.log("Haptics not available");
                    }
                    setDone(true);

                    Animated.timing(slideX, {
                        toValue: currentMaxSlide,
                        duration: 200,
                        useNativeDriver: false,
                    }).start(() => {
                        setTimeout(() => {
                            onCompleteRef.current();
                        }, 150);
                    });
                } else {
                    // Spring back
                    Animated.spring(slideX, {
                        toValue: 0,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    const thumbX = Animated.add(slideX, nudge);
    // The crosshair turns a quarter turn across the track, like dialing a turret
    const thumbRotate = slideX.interpolate({
        inputRange: [0, MAX_SLIDE],
        outputRange: ["0deg", "90deg"],
        extrapolate: "clamp",
    });

    return (
        <View
            onLayout={(e) => {
                const width = e.nativeEvent.layout.width;

                if (width > 0) {
                    if (containerWidth === 0 || Math.abs(width - containerWidth) > 1) {
                        setContainerWidth(width);
                    }
                }
            }}
            style={styles.track}
        >
            {/* Progress fill: grows behind the thumb */}
            <Animated.View
                style={[
                    styles.fill,
                    {
                        width: thumbX.interpolate({
                            inputRange: [0, MAX_SLIDE],
                            outputRange: [THUMB_SIZE + PADDING * 2, effectiveWidth],
                            extrapolate: "clamp",
                        }),
                    },
                ]}
                pointerEvents="none"
            >
                <LinearGradient
                    colors={["rgba(14,32,24,0.95)", "rgba(11,127,79,0.55)"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            {/* Label + pulsing chevrons, fading out as the thumb moves */}
            <Animated.View
                style={[
                    styles.labelRow,
                    {
                        opacity: slideX.interpolate({
                            inputRange: [0, MAX_SLIDE * 0.4],
                            outputRange: [1, 0],
                            extrapolate: "clamp",
                        }),
                    },
                ]}
                pointerEvents="none"
            >
                <Text style={styles.label}>{label}</Text>
                <View style={styles.chevronRow}>
                    {Array.from({ length: CHEVRONS }, (_, i) => {
                        const start = i / (CHEVRONS + 1);
                        return (
                            <Animated.Text
                                key={i}
                                style={[
                                    styles.chevron,
                                    {
                                        opacity: chevronPulse.interpolate({
                                            inputRange: [0, start, start + 0.2, start + 0.45, 1],
                                            outputRange: [0.2, 0.2, 1, 0.2, 0.2],
                                        }),
                                    },
                                ]}
                            >
                                ›
                            </Animated.Text>
                        );
                    })}
                </View>
            </Animated.View>

            {/* Draggable Thumb */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[styles.thumb, { transform: [{ translateX: thumbX }] }]}
            >
                {/* Only the crosshair rotates; the check sits in its own unrotated view so it is always upright */}
                {done ? (
                    <Image source={icons.check} style={styles.checkIcon} resizeMode="contain" />
                ) : (
                    <Animated.View style={{ transform: [{ rotate: thumbRotate }] }}>
                        <Image source={icons.crosshair} style={styles.crosshairIcon} resizeMode="contain" />
                    </Animated.View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        height: TRACK_HEIGHT,
        width: "100%",
        borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: "rgba(18, 18, 18, 0.85)", // brand-black/85, same as the home checklist card
        borderWidth: 1,
        borderColor: "rgba(40, 74, 55, 0.7)", // brand-green/70
        paddingHorizontal: PADDING,
        justifyContent: "center",
        overflow: "hidden",
    },
    fill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: TRACK_HEIGHT / 2,
        overflow: "hidden",
    },
    labelRow: {
        position: "absolute",
        left: THUMB_SIZE + PADDING * 2,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    label: {
        color: "white",
        fontWeight: "700",
        fontSize: 17,
        letterSpacing: 0.3,
    },
    chevronRow: {
        flexDirection: "row",
        gap: 2,
    },
    chevron: {
        color: ACCENT,
        fontSize: 24,
        fontWeight: "700",
        lineHeight: 26,
    },
    thumb: {
        height: THUMB_SIZE,
        width: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: BUTTON,
        borderWidth: 1.5,
        borderColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },
    crosshairIcon: {
        width: 26,
        height: 26,
        tintColor: "#ffffff",
    },
    checkIcon: {
        width: 22,
        height: 22,
        tintColor: "#ffffff",
    },
});
