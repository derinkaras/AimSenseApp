import React, { useRef, useState, useEffect } from "react";
import {
    View,
    Text,
    Animated,
    PanResponder,
    Dimensions,
    Image,
} from "react-native";
import * as Haptics from "expo-haptics";
import icons from "@/app/constants/icons";

interface SlideToStartProps {
    onComplete: () => void;
}

export function SlideToStart({ onComplete }: SlideToStartProps) {
    const slideX = useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = useState(0);

    const THUMB_SIZE = 60;
    const PADDING = 6;

    // Use measured width or fallback to screen width minus padding
    const effectiveWidth = containerWidth || (Dimensions.get('window').width - 48);
    const MAX_SLIDE = Math.max(0, effectiveWidth - THUMB_SIZE - PADDING * 2);

    // Store MAX_SLIDE in a ref so PanResponder can access current value
    const maxSlideRef = useRef(MAX_SLIDE);
    const onCompleteRef = useRef(onComplete);

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

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,

            onPanResponderGrant: () => {
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

                    Animated.timing(slideX, {
                        toValue: currentMaxSlide,
                        duration: 200,
                        useNativeDriver: false,
                    }).start(() => {
                        setTimeout(() => {
                            onCompleteRef.current();
                        }, 100);
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
            style={{
                height: 72,
                width: '100%', // Explicitly set full width
                borderRadius: 16,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderWidth: 2,
                borderColor: 'rgba(11, 127, 79, 0.4)',
                paddingHorizontal: PADDING,
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {/* Background Progress Fill */}
            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(11, 127, 79, 0.2)',
                    borderRadius: 16,
                    width: slideX.interpolate({
                        inputRange: [0, MAX_SLIDE],
                        outputRange: [THUMB_SIZE + PADDING * 2, effectiveWidth],
                        extrapolate: 'clamp',
                    }),
                }}
            />

            {/* Text Instructions */}
            <Animated.View
                style={{
                    position: 'absolute',
                    alignSelf: 'center',
                    opacity: slideX.interpolate({
                        inputRange: [0, MAX_SLIDE * 0.4],
                        outputRange: [1, 0],
                        extrapolate: 'clamp',
                    }),
                }}
                pointerEvents="none"
            >
                <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 18,
                    textAlign: 'center',
                }}>
                    Slide to start hunt
                </Text>
                <Text style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 4,
                }}>
                    Swipe right →
                </Text>
            </Animated.View>

            {/* Draggable Thumb */}
            <Animated.View
                {...panResponder.panHandlers}
                style={{
                    height: THUMB_SIZE,
                    width: THUMB_SIZE,
                    borderRadius: 12,
                    backgroundColor: '#0b7f4f',
                    borderWidth: 2,
                    borderColor: 'rgba(11, 127, 79, 0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#0b7f4f',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                    transform: [{ translateX: slideX }],
                }}
            >
                <Image
                    source={icons.arrowRight}
                    style={{ width: 28, height: 28, tintColor: '#ffffff' }}
                    resizeMode="contain"
                />
            </Animated.View>

        </View>
    );
}