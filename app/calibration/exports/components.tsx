// ============================================================
// components.tsx - Shared UI Components for Calibration
// ============================================================
// Reusable, responsive components used across all calibration steps.
// Built with NativeWind for consistent styling.

import React, { ReactNode } from "react";
import { View, Text, Pressable, Image, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { cn, buttonVariants, cardVariants, statusVariants, useResponsiveStyles, getSafeAreaEdges } from "./styles";

// ==================== ICON BUTTON ====================
interface IconButtonProps {
  icon: any;
  onPress: () => void;
  variant?: keyof typeof buttonVariants;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  tintColor?: string;
  className?: string;
}

export function IconButton({
  icon,
  onPress,
  variant = "secondary",
  disabled = false,
  size = "md",
  tintColor = "#e5e5e5",
  className = "",
}: IconButtonProps) {
  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-14 h-14",
  };
  
  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "rounded-xl items-center justify-center border",
        sizeClasses[size],
        buttonVariants[variant],
        disabled && "opacity-40",
        className
      )}
    >
      <Image
        source={icon}
        className={iconSizeClasses[size]}
        resizeMode="contain"
        style={{ tintColor: disabled ? "#666666" : tintColor }}
      />
    </Pressable>
  );
}

// ==================== NAVIGATION BAR ====================
interface NavBarProps {
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextDisabled?: boolean;
  backIcon?: any;
  nextIcon?: any;
  cancelIcon?: any;
  compact?: boolean;
  className?: string;
}

export function NavBar({
  onBack,
  onNext,
  onCancel,
  nextDisabled = false,
  backIcon,
  nextIcon,
  cancelIcon,
  compact = false,
  className = "",
}: NavBarProps) {
  const size = compact ? "sm" : "md";

  return (
    <View className={cn("flex-row items-center justify-center", compact ? "gap-3" : "gap-4", className)}>
      {onBack && backIcon && (
        <IconButton
          icon={backIcon}
          onPress={onBack}
          size={size}
          variant="secondary"
        />
      )}
      
      {onNext && nextIcon && (
        <IconButton
          icon={nextIcon}
          onPress={onNext}
          disabled={nextDisabled}
          size={size}
          variant="primary"
          tintColor="#ffffff"
        />
      )}
      
      {onCancel && cancelIcon && (
        <IconButton
          icon={cancelIcon}
          onPress={onCancel}
          size={size}
          variant="secondary"
        />
      )}
    </View>
  );
}

// ==================== HEADER CARD ====================
interface HeaderCardProps {
  icon: any;
  title: string;
  subtitle?: string;
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}

export function HeaderCard({
  icon,
  title,
  subtitle,
  compact = false,
  children,
  className = "",
}: HeaderCardProps) {
  return (
    <View
      className={cn(
        "rounded-3xl bg-brand-greenDark/70 border border-brand-green/60",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <View className="flex-row items-center">
        <View
          className={cn(
            "rounded-2xl bg-brand-black/50 border border-brand-green/40 items-center justify-center",
            compact ? "w-9 h-9 mr-2" : "w-11 h-11 mr-3"
          )}
        >
          <Image
            source={icon}
            className={compact ? "w-4 h-4" : "w-6 h-6"}
            resizeMode="contain"
            style={{ tintColor: "#0b7f4f" }}
          />
        </View>
        
        <View className="flex-1">
          <Text
            className={cn(
              "text-white font-semibold",
              compact ? "text-lg" : "text-xl"
            )}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              className={cn(
                "text-white/70",
                compact ? "text-xs mt-0.5" : "text-sm mt-1"
              )}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {children && <View className={compact ? "mt-2" : "mt-3"}>{children}</View>}
    </View>
  );
}

// ==================== INFO CARD ====================
interface InfoCardProps {
  icon?: any;
  title?: string;
  children: ReactNode;
  variant?: "info" | "tip" | "warning" | "success";
  compact?: boolean;
  className?: string;
}

export function InfoCard({
  icon,
  title,
  children,
  variant = "tip",
  compact = false,
  className = "",
}: InfoCardProps) {
  const variantStyles = {
    info: "bg-blue-500/15 border-blue-400/30",
    tip: "bg-brand-black/40 border-brand-green/25",
    warning: "bg-yellow-500/15 border-yellow-500/30",
    success: "bg-brand-greenLight/15 border-brand-greenLight/40",
  };

  const iconTintColors = {
    info: "#60a5fa",
    tip: "#9ca3af",
    warning: "#eab308",
    success: "#22c55e",
  };

  return (
    <View
      className={cn(
        "rounded-2xl border",
        compact ? "p-2.5" : "p-3",
        variantStyles[variant],
        className
      )}
    >
      <View className="flex-row items-start">
        {icon && (
          <View
            className={cn(
              "rounded-xl bg-brand-greenDark/60 border border-brand-green/40 items-center justify-center",
              compact ? "w-8 h-8 mr-2" : "w-10 h-10 mr-3"
            )}
          >
            <Image
              source={icon}
              className={compact ? "w-4 h-4" : "w-5 h-5"}
              resizeMode="contain"
              style={{ tintColor: iconTintColors[variant] }}
            />
          </View>
        )}
        
        <View className="flex-1">
          {title && (
            <Text
              className={cn(
                "text-white font-semibold",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {title}
            </Text>
          )}
          <View className={title ? (compact ? "mt-0.5" : "mt-1") : ""}>
            {typeof children === "string" ? (
              <Text
                className={cn(
                  "text-white/70",
                  compact ? "text-[10px] leading-3.5" : "text-sm leading-5"
                )}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ==================== SELECTION OPTION ====================
interface SelectionOptionProps {
  icon?: any;
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
  showRadio?: boolean;
  className?: string;
}

export function SelectionOption({
  icon,
  label,
  sublabel,
  selected,
  onPress,
  compact = false,
  showRadio = true,
  className = "",
}: SelectionOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-2xl border flex-row items-center",
        compact ? "px-3 py-2" : "px-4 py-3",
        selected
          ? "bg-brand-greenLight/15 border-brand-greenLight"
          : "bg-brand-black/40 border-brand-green/30",
        className
      )}
    >
      {icon && (
        <View
          className={cn(
            "rounded-xl items-center justify-center border",
            compact ? "w-9 h-9 mr-2" : "w-11 h-11 mr-3",
            selected
              ? "bg-brand-black/50 border-brand-greenLight"
              : "bg-brand-black/40 border-brand-green/40"
          )}
        >
          <Image
            source={icon}
            className={compact ? "w-4 h-4" : "w-6 h-6"}
            resizeMode="contain"
            style={{ tintColor: selected ? "#0b7f4f" : "#9ca3af" }}
          />
        </View>
      )}
      
      <View className="flex-1">
        <Text
          className={cn(
            "font-semibold",
            compact ? "text-sm" : "text-base",
            selected ? "text-white" : "text-white/70"
          )}
        >
          {label}
        </Text>
        {sublabel && (
          <Text
            className={cn(
              "text-white/50",
              compact ? "text-[10px] mt-0.5" : "text-xs mt-0.5"
            )}
          >
            {sublabel}
          </Text>
        )}
      </View>
      
      {showRadio && (
        <View
          className={cn(
            "rounded-full border items-center justify-center",
            compact ? "w-4 h-4" : "w-5 h-5",
            selected
              ? "border-brand-greenLight bg-brand-greenLight/15"
              : "border-brand-green/40 bg-transparent"
          )}
        >
          {selected && (
            <View
              className={cn(
                "rounded-full bg-brand-greenLight",
                compact ? "w-2 h-2" : "w-2.5 h-2.5"
              )}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

// ==================== STATUS BADGE ====================
interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "neutral";
  label: string;
  showDot?: boolean;
  compact?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  compact = false,
  className = "",
}: StatusBadgeProps) {
  const dotColors = {
    success: "bg-brand-greenLight",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-400",
    neutral: "bg-white/50",
  };

  const textColors = {
    success: "text-brand-greenLight",
    warning: "text-yellow-500",
    error: "text-red-500",
    info: "text-blue-400",
    neutral: "text-white/50",
  };

  return (
    <View
      className={cn(
        "flex-row items-center justify-center rounded-full border",
        compact ? "px-2.5 py-1" : "px-3 py-1.5",
        statusVariants[status],
        className
      )}
    >
      {showDot && (
        <View
          className={cn(
            "rounded-full",
            compact ? "w-1.5 h-1.5 mr-1.5" : "w-2 h-2 mr-2",
            dotColors[status]
          )}
        />
      )}
      <Text
        className={cn(
          "font-semibold",
          compact ? "text-[10px]" : "text-xs",
          textColors[status]
        )}
      >
        {label}
      </Text>
    </View>
  );
}

// ==================== SCREEN WRAPPER ====================
interface ScreenWrapperProps {
  children: ReactNode;
  showCamera?: boolean;
  cameraZoom?: number;
  cameraRotation?: number;
  autofocus?: "on" | "off";
  isLandscapeMode?: boolean;
  cameraRef?: React.RefObject<CameraView>;
  onCameraLayout?: (event: any) => void;
  cameraStyle?: ViewStyle;
}

export function ScreenWrapper({
  children,
  showCamera = false,
  cameraZoom = 0,
  cameraRotation = 0,
  autofocus = "on",
  isLandscapeMode = false,
  cameraRef,
  onCameraLayout,
  cameraStyle,
}: ScreenWrapperProps) {
  const safeAreaEdges = getSafeAreaEdges(isLandscapeMode);
  const rotationTransform = { transform: [{ rotate: `${cameraRotation}deg` }] };

  return (
    <View className="flex-1 bg-brand-black">
      {showCamera && (
        <View
          style={[StyleSheet.absoluteFill, cameraStyle]}
          onLayout={onCameraLayout}
        >
          <View style={[StyleSheet.absoluteFill, rotationTransform]}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              zoom={cameraZoom}
              autofocus={autofocus}
            />
          </View>
        </View>
      )}
      
      <SafeAreaView className="flex-1" edges={safeAreaEdges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

// ==================== SECTION CARD ====================
interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  variant?: keyof typeof cardVariants;
  compact?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  children,
  variant = "secondary",
  compact = false,
  className = "",
}: SectionCardProps) {
  return (
    <View
      className={cn(
        "rounded-3xl border",
        compact ? "p-3" : "p-4",
        cardVariants[variant],
        className
      )}
    >
      {title && (
        <Text
          className={cn(
            "text-white font-semibold",
            compact ? "text-sm mb-1" : "text-lg mb-2"
          )}
        >
          {title}
        </Text>
      )}
      {subtitle && (
        <Text
          className={cn(
            "text-white/60",
            compact ? "text-[10px] mb-2" : "text-sm mb-3"
          )}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}

// ==================== STEP SIZE SELECTOR ====================
interface StepSizeSelectorProps {
  value: 1 | 5 | 10;
  onChange: (size: 1 | 5 | 10) => void;
  compact?: boolean;
  className?: string;
}

export function StepSizeSelector({
  value,
  onChange,
  compact = false,
  className = "",
}: StepSizeSelectorProps) {
  const options: (1 | 5 | 10)[] = [1, 5, 10];

  return (
    <View className={cn("flex-row", compact ? "gap-1.5" : "gap-2", className)}>
      {options.map((size) => {
        const isSelected = value === size;
        return (
          <Pressable
            key={size}
            onPress={() => onChange(size)}
            className={cn(
              "flex-1 rounded-lg items-center justify-center border",
              compact ? "py-1" : "py-1.5",
              isSelected
                ? "bg-brand-greenLight/20 border-brand-greenLight"
                : "bg-brand-black/40 border-brand-green/30"
            )}
          >
            <Text
              className={cn(
                "font-mono font-semibold",
                compact ? "text-[10px]" : "text-xs",
                isSelected ? "text-brand-greenLight" : "text-white/50"
              )}
            >
              {size}px
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ==================== D-PAD CONTROL ====================
interface DPadProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  compact?: boolean;
  className?: string;
  upIcon?: any;
  downIcon?: any;
  leftIcon?: any;
  rightIcon?: any;
}

export function DPad({
  onUp,
  onDown,
  onLeft,
  onRight,
  compact = false,
  className = "",
  upIcon,
  downIcon,
  leftIcon,
  rightIcon,
}: DPadProps) {
  const buttonSize = compact ? "w-9 h-9" : "w-11 h-11";
  const iconSize = compact ? "w-4 h-4" : "w-5 h-5";
  const gap = compact ? "gap-1" : "gap-1.5";

  const DPadButton = ({ onPress, icon }: { onPress: () => void; icon: any }) => (
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-xl items-center justify-center bg-brand-black/60 border border-brand-green/40 active:bg-brand-greenLight/20",
        buttonSize
      )}
    >
      <Image
        source={icon}
        className={iconSize}
        resizeMode="contain"
        style={{ tintColor: "#e5e5e5" }}
      />
    </Pressable>
  );

  return (
    <View className={cn("items-center", className)}>
      <View className={gap}>
        {upIcon && <DPadButton onPress={onUp} icon={upIcon} />}
      </View>
      <View className={cn("flex-row", gap)}>
        {leftIcon && <DPadButton onPress={onLeft} icon={leftIcon} />}
        <View className={buttonSize} />
        {rightIcon && <DPadButton onPress={onRight} icon={rightIcon} />}
      </View>
      <View className={gap}>
        {downIcon && <DPadButton onPress={onDown} icon={downIcon} />}
      </View>
    </View>
  );
}

// ==================== FLOATING PANEL ====================
interface FloatingPanelProps {
  children: ReactNode;
  position?: "bottom" | "right";
  width?: number;
  className?: string;
  style?: ViewStyle;
}

export function FloatingPanel({
  children,
  position = "bottom",
  width,
  className = "",
  style,
}: FloatingPanelProps) {
  const positionClasses = position === "right"
    ? "absolute right-0 top-0 bottom-0 border-l"
    : "absolute bottom-0 left-0 right-0";

  return (
    <View
      className={cn(
        "bg-brand-black/95 border-brand-green/30",
        positionClasses,
        className
      )}
      style={[{ width }, style]}
    >
      {children}
    </View>
  );
}

// ==================== PILL BUTTON ====================
interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: any;
  compact?: boolean;
  className?: string;
}

export function PillButton({
  label,
  onPress,
  variant = "secondary",
  icon,
  compact = false,
  className = "",
}: PillButtonProps) {
  const variantClasses = {
    primary: "bg-brand-greenLight border-brand-green/60",
    secondary: "bg-brand-black/50 border-brand-green/35",
    ghost: "bg-transparent border-brand-green/20",
  };

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center justify-center rounded-xl border",
        compact ? "px-3 py-1.5" : "px-4 py-2",
        variantClasses[variant],
        className
      )}
    >
      {icon && (
        <Image
          source={icon}
          className={cn(compact ? "w-3.5 h-3.5 mr-1.5" : "w-4 h-4 mr-2")}
          resizeMode="contain"
          style={{ tintColor: variant === "primary" ? "#ffffff" : "#e5e5e5" }}
        />
      )}
      <Text
        className={cn(
          "font-semibold",
          compact ? "text-xs" : "text-sm",
          variant === "primary" ? "text-white" : "text-white/90"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
