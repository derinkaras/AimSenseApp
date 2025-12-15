// app/api/apiTypes.ts
// Centralized type definitions for all API calls

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