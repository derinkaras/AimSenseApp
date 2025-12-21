// ============================================================
// styles.ts - Shared Styling Utilities & Responsive System
// ============================================================
// Centralized responsive design system for calibration screens.
// Uses device dimensions to provide consistent, scalable styling
// across all device sizes (iPhone SE to iPad Pro, Android phones to tablets).

import { useWindowDimensions, Platform, PixelRatio } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";

// ==================== DEVICE BREAKPOINTS ====================
// Based on common device widths in portrait mode
const BREAKPOINTS = {
  xs: 320,   // iPhone SE, small Android
  sm: 375,   // iPhone 12 mini, standard Android
  md: 414,   // iPhone 12/13/14 Pro Max
  lg: 768,   // iPad Mini
  xl: 1024,  // iPad Pro 11"
  xxl: 1366, // iPad Pro 12.9"
} as const;

// ==================== SCALE FACTORS ====================
// For responsive sizing based on device width
const BASE_WIDTH = 375; // iPhone 12/13 as reference
const BASE_HEIGHT = 812;

export function useResponsiveScale() {
  const { width, height } = useWindowDimensions();
  
  return useMemo(() => {
    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    // Normalize for pixel density
    const fontScale = PixelRatio.getFontScale();
    
    return {
      scaleX,
      scaleY,
      scale,
      fontScale,
      // Responsive sizing helpers
      wp: (percent: number) => width * (percent / 100),
      hp: (percent: number) => height * (percent / 100),
      // Scale a value proportionally
      rs: (size: number) => Math.round(size * scale),
      // Scale font size (with font scale consideration)
      fs: (size: number) => Math.round(size * scale * (1 / fontScale)),
    };
  }, [width, height]);
}

// ==================== RESPONSIVE HOOK ====================
export type LayoutMode = "portrait" | "landscape";
export type DeviceSize = "compact" | "regular" | "large";

export interface ResponsiveStyles {
  // Layout info
  isLandscape: boolean;
  layoutMode: LayoutMode;
  deviceSize: DeviceSize;
  
  // Screen dimensions
  screenWidth: number;
  screenHeight: number;
  
  // Safe areas
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  
  // Spacing scale (responsive)
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  // Typography scale (responsive)
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  
  // Component sizing
  buttonSize: {
    sm: number;
    md: number;
    lg: number;
  };
  iconSize: {
    sm: number;
    md: number;
    lg: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  
  // Panel dimensions
  panelWidth: number;
  panelHeight: number;
  bottomPadding: number;
  
  // NativeWind class helpers
  tw: {
    containerPadding: string;
    headerPadding: string;
    cardPadding: string;
    titleSize: string;
    subtitleSize: string;
    bodySize: string;
    buttonPadding: string;
    iconContainer: string;
    gap: string;
  };
}

export function useResponsiveStyles(isLandscapeMode: boolean = false): ResponsiveStyles {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { scale, rs } = useResponsiveScale();
  
  return useMemo(() => {
    // Determine layout mode based on actual dimensions
    const isLandscape = width > height;
    const layoutMode: LayoutMode = isLandscape ? "landscape" : "portrait";
    
    // Determine device size category
    const shortSide = Math.min(width, height);
    let deviceSize: DeviceSize = "regular";
    if (shortSide < BREAKPOINTS.sm) {
      deviceSize = "compact";
    } else if (shortSide >= BREAKPOINTS.lg) {
      deviceSize = "large";
    }
    
    // Calculate responsive spacing
    const baseSpacing = isLandscape ? 8 : 12;
    const spacing = {
      xs: rs(baseSpacing * 0.5),
      sm: rs(baseSpacing),
      md: rs(baseSpacing * 1.5),
      lg: rs(baseSpacing * 2),
      xl: rs(baseSpacing * 3),
      xxl: rs(baseSpacing * 4),
    };
    
    // Calculate responsive font sizes
    const baseFontSize = isLandscape ? 12 : 14;
    const fontSize = {
      xs: rs(baseFontSize * 0.75),   // 9-10.5
      sm: rs(baseFontSize * 0.875),  // 10.5-12.25
      base: rs(baseFontSize),         // 12-14
      lg: rs(baseFontSize * 1.125),  // 13.5-15.75
      xl: rs(baseFontSize * 1.25),   // 15-17.5
      xxl: rs(baseFontSize * 1.5),   // 18-21
      xxxl: rs(baseFontSize * 2),    // 24-28
    };
    
    // Button sizes
    const buttonSize = {
      sm: rs(isLandscape ? 36 : 40),
      md: rs(isLandscape ? 44 : 52),
      lg: rs(isLandscape ? 52 : 60),
    };
    
    // Icon sizes
    const iconSize = {
      sm: rs(isLandscape ? 16 : 20),
      md: rs(isLandscape ? 20 : 24),
      lg: rs(isLandscape ? 28 : 32),
    };
    
    // Border radius
    const borderRadius = {
      sm: rs(8),
      md: rs(12),
      lg: rs(16),
      xl: rs(24),
      full: 9999,
    };
    
    // Panel dimensions
    const panelWidth = isLandscape 
      ? Math.min(280, Math.max(220, width * 0.34))
      : 0;
    const panelHeight = isLandscape ? 0 : 240;
    const bottomPadding = Math.max(insets.bottom, 8);
    
    // NativeWind class helpers based on mode
    const tw = isLandscape ? {
      containerPadding: "px-3",
      headerPadding: "p-2.5",
      cardPadding: "p-3",
      titleSize: "text-lg",
      subtitleSize: "text-xs",
      bodySize: "text-sm",
      buttonPadding: "py-2 px-4",
      iconContainer: "w-8 h-8",
      gap: "gap-2",
    } : {
      containerPadding: "px-5",
      headerPadding: "p-4",
      cardPadding: "p-4",
      titleSize: "text-xl",
      subtitleSize: "text-sm",
      bodySize: "text-base",
      buttonPadding: "py-3 px-5",
      iconContainer: "w-11 h-11",
      gap: "gap-3",
    };
    
    return {
      isLandscape,
      layoutMode,
      deviceSize,
      screenWidth: width,
      screenHeight: height,
      safeTop: insets.top,
      safeBottom: insets.bottom,
      safeLeft: insets.left,
      safeRight: insets.right,
      spacing,
      fontSize,
      buttonSize,
      iconSize,
      borderRadius,
      panelWidth,
      panelHeight,
      bottomPadding,
      tw,
    };
  }, [width, height, insets, scale, rs, isLandscapeMode]);
}

// ==================== SAFE AREA EDGES HELPER ====================
export function getSafeAreaEdges(isLandscape: boolean): ("top" | "bottom" | "left" | "right")[] {
  const edges: ("top" | "bottom" | "left" | "right")[] = ["top", "bottom"];
  if (isLandscape) {
    edges.push("left", "right");
  }
  return edges;
}

// ==================== TAILWIND CLASS BUILDERS ====================
// Helper to build dynamic Tailwind classes

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Button variant classes
export const buttonVariants = {
  primary: "bg-brand-greenLight border-brand-green/60",
  secondary: "bg-brand-black/50 border-brand-green/35",
  ghost: "bg-transparent border-transparent",
  danger: "bg-red-500/20 border-red-500/40",
  warning: "bg-yellow-500/20 border-yellow-500/40",
  success: "bg-brand-greenLight/20 border-brand-greenLight",
} as const;

// Card variant classes
export const cardVariants = {
  primary: "bg-brand-greenDark/70 border-brand-green/60",
  secondary: "bg-brand-greenDark/50 border-brand-green/40",
  muted: "bg-brand-black/40 border-brand-green/25",
  elevated: "bg-brand-greenDark/65 border-brand-green/45",
  selected: "bg-brand-greenDark/80 border-brand-greenLight",
  unselected: "bg-brand-black/60 border-brand-green/35",
} as const;

// Status indicator classes
export const statusVariants = {
  success: "bg-brand-greenLight/15 border-brand-greenLight",
  warning: "bg-yellow-500/20 border-yellow-500",
  error: "bg-red-500/20 border-red-500",
  info: "bg-blue-500/15 border-blue-400/30",
  neutral: "bg-brand-black/40 border-brand-green/30",
} as const;

// ==================== ANIMATION PRESETS ====================
export const animationPresets = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  slideUp: {
    from: { opacity: 0, transform: [{ translateY: 20 }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] },
  },
  scaleIn: {
    from: { opacity: 0, transform: [{ scale: 0.9 }] },
    to: { opacity: 1, transform: [{ scale: 1 }] },
  },
  pulse: {
    from: { opacity: 1, transform: [{ scale: 1 }] },
    to: { opacity: 0.7, transform: [{ scale: 1.05 }] },
  },
};

// ==================== COLOR TOKENS ====================
// For use with StyleSheet.create when Tailwind isn't sufficient
export const colors = {
  brand: {
    black: "#0a0a0a",
    green: "#0b7f4f",
    greenLight: "#22c55e",
    greenDark: "#064e3b",
  },
  text: {
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.8)",
    muted: "rgba(255, 255, 255, 0.6)",
    disabled: "rgba(255, 255, 255, 0.4)",
  },
  border: {
    primary: "rgba(11, 127, 79, 0.6)",
    secondary: "rgba(11, 127, 79, 0.4)",
    muted: "rgba(11, 127, 79, 0.25)",
  },
  overlay: {
    dark: "rgba(0, 0, 0, 0.85)",
    medium: "rgba(0, 0, 0, 0.6)",
    light: "rgba(0, 0, 0, 0.4)",
  },
} as const;
