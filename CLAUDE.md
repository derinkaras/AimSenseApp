# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AimSense** is a React Native mobile app (Expo + Expo Router) that helps rifle shooters calibrate their scopes using the phone's camera and IMU sensors. Users complete an 8-step calibration wizard, then use the active hunt screen as a live aiming aid.

## Commands

```bash
npm run start       # Start Expo dev server
npm run android     # Run on Android device/emulator
npm run ios         # Run on iOS device/simulator
npm run web         # Run web version
npm run lint        # ESLint + Prettier check
npm run format      # ESLint autofix + Prettier write
npm run prebuild    # Regenerate native iOS/Android projects
```

There are no tests configured.

## Architecture

### Routing (Expo Router — file-based)

| Group | Purpose |
|-------|---------|
| `app/(onboarding)/` | Login/signup; redirects to tabs if already authenticated |
| `app/(tabs)/` | Main bottom-tab shell: Home, Guns, Store, Profile |
| `app/(calibration)/` | 8-step calibration wizard (step1–step8) |
| `app/(hunt)/` | Active hunt session (gun selection + live overlay) |
| `app/(pages)/` | Modal/detail screens (e.g., AddGunProfile) |

Navigation uses `<Redirect>` conditionally based on auth state from `AuthContext`.

### State Management (hybrid)

| Concern | Solution | Location |
|---------|----------|----------|
| Auth / session | React Context | `app/contexts/AuthContext.tsx` |
| Active hunt session | Zustand | `app/hunt/store.ts` |
| Network / sync queue | React Context | `app/contexts/NetworkStatusContext.tsx` |
| Gun profiles refresh signal | React Context | `app/contexts/GunProfilesDirtyContext.tsx` |
| Offline-pending ops | AsyncStorage cache | `app/api/apiCache.ts` |

All contexts are mounted at the root in `app/_layout.tsx`.

### Backend

- **Supabase** (`app/lib/supabase.ts`) — auth, database, realtime
- Auth methods: email/password + OTP for password reset (`app/api/supabaseService.ts`)
- Gun profiles and user profiles have CRUD wrappers in `app/api/`
- Offline-first: failed API calls are queued in `apiCache.ts` and replayed by `app/services/syncService.ts` when connection is restored

### Sensors & Camera

- `expo-camera` — used during calibration to capture scope images
- `expo-sensors` — IMU/accelerometer data via `app/hooks/useTiltLevel.ts`
- `expo-screen-orientation` — orientation locking during calibration steps

### Styling

NativeWind (Tailwind CSS for React Native). Custom brand palette defined in `tailwind.config.js`:
- `brand-greenDark` (`#0e2018`) — primary background
- `brand-green` (`#284a37`) — surface/card color
- `brand-greenLight` (`#0b7f4f`) — accent/CTA
- `brand-black` (`#121212`) — deep background

### Calibration Flow

The 8-step wizard (`app/(calibration)/step1–step8.tsx`) collects camera settings, sensor baselines, and shot-group data. Results are stored as `CalibrationResult` (typed in `app/calibration/exports/index.ts`) and passed into the Zustand hunt store when a hunt session starts. The full UX spec lives in `AimSense_ScopePhone_Calibration_UI_Spec.md`.

### Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).