# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AimSense** is a React Native mobile app (Expo + Expo Router) that helps rifle shooters calibrate their scopes using the phone's camera and IMU sensors. Users set up each rifle once (three screens), then use the active hunt screen as a live aiming aid.

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

`npm test` runs the Vitest unit tests for the pure math (`src/**/*.test.ts`).

## Architecture

### Project Layout

`app/` contains **routes only** (Expo Router treats every file there as a screen). All other code lives in `src/`, and images live in `assets/`.

```
app/            Routes and route-group layouts
src/
  components/   Shared UI (modals, banners, inputs, badges); components/contents = modal bodies
  constants/    icons, images, toast config
  contexts/     Auth, network status, gun-profiles-dirty providers
  hooks/        useApi, useNetworkStatus, useTiltLevel
  services/     Firebase init, Firestore CRUD, auth, offline cache + sync
  calibration/  Calibration wizard logic: types, math, layout, geometry, store (import from "@/calibration")
  help/         All help text (content.ts) + the "?" popups, the full guide page, and the one-time hunt briefing
  hunt/         Hunt mode logic: store, drop + aim math, G1 ballistics with wind + air conditions, units, shot-setup form (import from "@/hunt")
  types/        Shared API types
  utils/        Small helpers (auth error messages)
assets/         icons/ and images/
docs/           Design specs
```

### Routing (Expo Router — file-based)

| Group | Purpose |
|-------|---------|
| `app/(onboarding)/` | Login/signup; redirects to tabs if already authenticated |
| `app/(tabs)/` | Main bottom-tab shell: Home, Guns, Store, Profile |
| `app/(calibration)/` | Calibration: `rifle` (choose rifle, scope details, phone mount) → `lineup` → `measure` |
| `app/(hunt)/` | Active hunt session (live overlay) |
| `app/(pages)/` | Modal/detail screens (e.g., AddGunProfile) |

Navigation uses `<Redirect>` conditionally based on auth state from `AuthContext`.

### State Management (hybrid)

| Concern | Solution | Location |
|---------|----------|----------|
| Auth / session | React Context | `src/contexts/AuthContext.tsx` |
| Active hunt session | Zustand | `src/hunt/store.ts` |
| Network / sync queue | React Context | `src/contexts/NetworkStatusContext.tsx` |
| Gun profiles refresh signal | React Context | `src/contexts/GunProfilesDirtyContext.tsx` |
| Offline-pending ops | AsyncStorage cache | `src/services/apiCache.ts` |

All contexts are mounted at the root in `app/_layout.tsx`.

### Backend

- **Firebase** (`src/services/firebase.ts`, JS SDK) — Auth + Cloud Firestore; there is no separate backend server. Config comes from `EXPO_PUBLIC_FIREBASE_*` env vars (see `.env.example`); security rules live in `firestore.rules`
- Auth: email/password; password reset sends a Firebase email link (`src/services/authService.ts`)
- Data model: `users/{uid}` (profile) and `users/{uid}/gunProfiles/{id}`. CRUD wrappers are in `src/services/gunProfile.ts` and `src/services/userProfile.ts`, with shared helpers in `src/services/firestoreUtils.ts`
- Offline-first: the Firestore JS SDK has no on-disk cache in React Native, so writes that time out are queued in `src/services/apiCache.ts` and replayed by `src/services/syncService.ts`. Gun profile doc IDs are generated client-side so replays are idempotent
- Account deletion is client-side (re-authenticate, delete Firestore docs, then the Auth user)

### Sensors & Camera

- `expo-camera` — used during calibration to capture scope images
- `expo-sensors` — IMU/accelerometer data via `src/hooks/useTiltLevel.ts`
- `expo-screen-orientation` — orientation locking during calibration steps

### Styling

NativeWind (Tailwind CSS for React Native). Custom brand palette defined in `tailwind.config.js`:
- `brand-greenDark` (`#0e2018`) — primary background
- `brand-green` (`#284a37`) — surface/card color
- `brand-greenLight` (`#0b7f4f`) — accent/CTA
- `brand-black` (`#121212`) — deep background

### Calibration Flow

Calibration is per rifle and takes three screens:
1. `rifle.tsx` - pick a rifle. A rifle without a saved calibration opens a setup sheet: turret click value and hunting magnification (saved on the gun profile) and the phone mount orientation.
2. `lineup.tsx` - zoom, rotate the preview until the crosshair looks square, tap the crosshair center (also focuses there). The IMU level baseline is captured when the user confirms with the rifle steady.
3. `measure.tsx` - crosshair on a sharp mark, dial the elevation turret UP, tap where the mark went, dial back. Scopes keep the crosshair centered while dialing, so this measures the IMAGE moving. That one move gives `pxPerUnit` and `upAxis` (the screen direction of "up"); windage uses the same scale at a right angle, and hunt mode draws the holdover opposite to the image movement.

The result (`CalibrationResult`, typed in `src/calibration/types.ts`) is saved on the device per rifle and handed to the hunt store with `startSession()`. Picking a rifle that is already calibrated goes straight to a quick check on `lineup.tsx` (re-mark the crosshair, re-capture level) and then hunt mode. Hunt mode checks the camera area still matches calibration and blocks the holdover if it does not. The full UX spec lives in `docs/AimSense_ScopePhone_Calibration_UI_Spec.md`.

### Where to change a calculation

All math is in plain functions (no React/Expo) so it is easy to read and change. Screens only wire sensor readings and UI state into them.

| I want to change... | Edit |
|---------------------|------|
| Bullet drop / trajectory (zeroing, drag constant, time step) | `src/hunt/ballistics.ts` |
| G1 drag curve data | `src/hunt/g1DragTable.ts` |
| Air density / speed of sound from altitude, temperature, pressure | `src/hunt/atmosphere.ts` |
| Wind speed + clock direction -> components | `src/hunt/wind.ts` |
| Which optional entries exist (wind, altitude, temperature, pressure), their units and limits | `src/hunt/conditions.ts` |
| The distance / wind / air-conditions form | `src/hunt/ShotSetupModal.tsx` |
| Privacy Policy / Terms of Service text (keep it true to what the app collects), developer name/address placeholders | `src/legal/content.ts` |
| Any help text, the limits list, the before-you-hunt briefing (bump `BRIEFING_VERSION` to show it again) | `src/help/content.ts` |
| Metric/imperial conversion, drop display text | `src/hunt/units.ts` |
| Holdover: cosine (angle) correction, cant rotation, cant dead zone/warnings, crosshair pixel position and direction | `src/hunt/aim.ts` |
| Camera-match checks between calibration and hunt | `src/hunt/invariants.ts` |
| Hunt session state (selected gun, status) | `src/hunt/store.ts` |
| Clicks needed, checking the dialed move (too small / sideways / down), pixels per MOA/MIL, up/right axes | `src/calibration/math.ts` |
| Camera panel sizes (the camera area shared by calibration and hunt) | `src/calibration/layout.ts` |
| Nudge arrows, tap-to-focus coordinates | `src/calibration/geometry.ts` |
| Turret click options, dialed movement (10 MOA / 3 MIL), minimum measurable move, magnification limits, tilt settings | `src/calibration/constants.ts` |
| Calibration flow state, `finish()`, re-checking a saved rifle | `src/calibration/store.ts` |
| Calibrations saved on the device per rifle (load / save / clear) | `src/calibration/savedCalibration.ts` |
| Calibration screen layout (camera + panel, markers, nudge pad) | `src/calibration/CalibrationStage.tsx` |
| Click value / magnification / phone mount inputs | `src/calibration/ScopeSetupFields.tsx` |
| Camera settings shared by every measuring screen (stabilization off, fixed lens) | `ScopeCamera` in `src/calibration/components.tsx` |
| IMU leveling / roll / pitch smoothing | `src/hooks/useTiltLevel.ts` |
Always use the brand green for buttons and green stuff
### Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json`), e.g. `@/components/OfflineBanner`. Route files import siblings like `./_layout` relatively.