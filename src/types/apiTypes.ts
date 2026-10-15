// src/types/apiTypes.ts
// Centralized type definitions for all API calls

import type { ScopeUnit } from "@/calibration/types";

// ============================================
// Gun Profile Types
// ============================================

export type UnitSystem = "METRIC" | "IMPERIAL";

export type GunProfile = {
    id?: string;
    name: string;
    caliber: string;
    bulletWeightGrains: number;
    ballisticCoefficient: number;
    muzzleVelocityFps: number;
    zeroDistance: number;
    scopeHeight: number;
    unitSystem: UnitSystem;
    gunPhotoUri?: string | null;
    // Scope details (optional: older profiles don't have them; calibration asks once)
    scopeUnit?: ScopeUnit;
    clickSize?: number;
    scopeMagnification?: number;
};

export type CreateGunProfileData = {
    name: string;
    caliber: string;
    bulletWeightGrains: number;
    ballisticCoefficient: number;
    muzzleVelocityFps: number;
    zeroDistance: number;
    scopeHeight: number;
    unitSystem: UnitSystem;
    gunPhotoUri?: string;
    scopeUnit?: ScopeUnit;
    clickSize?: number;
    scopeMagnification?: number;
};

export type UpdateGunProfileData = {
    name?: string;
    caliber?: string;
    bulletWeightGrains?: number;
    ballisticCoefficient?: number;
    muzzleVelocityFps?: number;
    zeroDistance?: number;
    scopeHeight?: number;
    unitSystem?: UnitSystem;
    gunPhotoUri?: string;
    scopeUnit?: ScopeUnit;
    clickSize?: number;
    scopeMagnification?: number;
};

// ============================================
// User Profile Types
// ============================================

export type UserProfile = {
    id?: string;
    firstName?: string;
    lastName?: string;
    profilePhotoUri?: string;
};

export type CreateUserProfileData = {
    firstName?: string;
    lastName?: string;
    profilePhotoUri?: string;
};

export type UpdateUserProfileData = {
    firstName?: string;
    lastName?: string;
    profilePhotoUri?: string;
};

// ============================================
// Subscription Types (for future use)
// ============================================

export type SubscriptionPlan = "free" | "trial" | "premium";

export type Subscription = {
    id?: string;
    userId: string;
    plan: SubscriptionPlan;
    expiresAt: string; // ISO date string
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateSubscriptionData = {
    plan: SubscriptionPlan;
    expiresAt: string;
};

export type UpdateSubscriptionData = {
    plan?: SubscriptionPlan;
    expiresAt?: string;
    isActive?: boolean;
};