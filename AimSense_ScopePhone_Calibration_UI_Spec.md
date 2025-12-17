# AimSense Scope → Phone Calibration Flow (UI + UX Spec)

This document describes **what the user sees**, the **order of screens**, and the **copy/instructions** to keep the calibration seamless and low‑error.  
It intentionally avoids implementation details—use it as the product/UX spec.

---

## Design principles

- **Seamless for the 99%**: assume standard scope layout and typical turret behavior.
- **No user math**: AimSense always converts units into an exact **click count**.
- **Precision without anxiety**: avoid technical terms (IMU, sensor fusion). Use “reference”, “center”, “setup”.
- **Fallback only when needed**: show a small “Unexpected behavior?” link; don’t force extra steps.
- **Repeatable**: calibration is per setup (rifle/scope/mount/phone). User can redo anytime.

---

## What calibration produces (conceptual outputs)

- **Scope center point**: the pixel location of the true scope reticle center.
- **Pixel scale**: pixels-per-angular-unit for horizontal and vertical corrections (unit = MOA or MIL).
- **Reference orientation**: a captured “zero reference” used to compute changes (deltas) during Hunt Mode.

*User does not need to see raw numbers.*

---

## Full screen flow

### 1) Scope Setup (Units + Click Size)

**Purpose:** AimSense learns the scope’s unit system and click size so it can tell the user exact click counts.

**Title:** Scope Setup  
**Subtitle:** AimSense will guide your scope adjustments.

**UI**
- Selection: **MOA** or **MIL / MRAD**
- Click size options (radio):
  - If MOA: **¼ MOA** (default), ½ MOA, ⅛ MOA, Other
  - If MIL: **0.1 mil** (default), 0.2 mil, 0.05 mil, Other
- Helper: “Check your turret markings or manual.”

**Primary CTA:** Continue

---

### 2) Align Scope Center (Tap + Micro Adjust)

**Purpose:** Capture the **true reticle center** on the phone screen.

**Title:** Align Scope Center  
**Subtitle:** Tap the crosshair center, then fine‑tune.

**UI**
- Camera feed with a visible guide/crosshair overlay.
- User interaction:
  - **Tap** to place the center point roughly.
  - **Micro adjust controls**: Up / Down / Left / Right.
  - Step size toggle: **1 px / 5 px / 10 px**.
  - **Reset** (back to last tap) option.
- Strongly recommended: a small **magnifier** (zoomed inset) around the current center point.

**Primary CTA:** Save Center

**Microcopy (small)**
- “Take your time—this sets your overlay reference.”

---

### 3) Elevation Dial Calibration (UP)

**Purpose:** Measure vertical pixels-per-unit (and handle unexpected axis behavior via fallback).

**Title:** Elevation Calibration

**Main instruction (big)**
- “Turn the **ELEVATION** turret **UP**”
- “**{X} clicks**” (AimSense computes X)

**Helper text**
- “Elevation is usually on top of the scope.”
- “Follow the arrow marked on your turret.”

**Link (small, low emphasis)**
- “Unexpected behavior?”

**Primary CTA:** I’ve dialed it

**What happens next (UX)**
- The user is shown the **same center picking UI** again:
  - Title: “Confirm New Crosshair Position”
  - Subtitle: “Tap the crosshair center again, then fine‑tune.”
- This produces the movement needed for scale calibration without requiring computer vision.

---

### 4) Windage Dial Calibration (RIGHT)

**Purpose:** Measure horizontal pixels-per-unit (with fallback).

**Title:** Windage Calibration

**Main instruction (big)**
- “Turn the **WINDAGE** turret **RIGHT**”
- “**{X} clicks**” (AimSense computes X)

**Helper text**
- “Windage is usually on the side of the scope.”
- “Follow the arrow marked on your turret.”

**Link (small)**
- “Unexpected behavior?”

**Primary CTA:** I’ve dialed it

**Next (UX)**
- Again, show the **center picking UI**:
  - Title: “Confirm New Crosshair Position”
  - Subtitle: “Tap the crosshair center again, then fine‑tune.”

---

### 5) Unexpected Behavior (Fallback Modal)

This appears only if the user taps **Unexpected behavior?** on either dial screen.

**Title:** Unexpected behavior  
**Prompt:** “When you made that adjustment, the crosshair moved:”

**Options (big buttons)**
- Up
- Down
- Left
- Right

**CTA:** Confirm

**Notes**
- Keep the tone neutral (not an error).
- No technical explanation; user just chooses what they observed once.

---

### 6) Set Reference (Level & Hold Steady)

**Purpose:** Capture the “zero reference” for live cant/pitch changes later.

**Title:** Set Reference  
**Subtitle:** Get it close, then hold steady.

**Instructions**
- “Hold the rifle upright and pointing forward.”
- “Small adjustments are enough.”

**Status messages**
- Not ready: “Adjust until level…”
- Ready: “Reference ready — tap Continue”

**Primary CTA:** Continue (enabled only when the app considers it “ready”)

**Important UX rule**
- Don’t demand **0.0°**.
- This step should feel achievable (no perfection pressure).

---

### 7) Confirm & Save

**Purpose:** One final confidence step before saving.

**Title:** Confirm Calibration  
**Subtitle:** Review your setup before saving.

**Show only high-level confirmations**
- Scope center: Captured ✅
- Scope adjustments: Calibrated ✅ (MOA/MIL)
- Reference: Captured ✅

**Ready-to-save message (AimSense tone)**
- Header: “Ready to save”
- Body: “All set. AimSense is ready when you are.”

**Primary CTA:** Save Calibration  
**Secondary CTA:** Redo / Cancel

---

## Copy snippets (ready to paste)

### General helper (shared)
- “AimSense handles the math—just follow the steps.”

### Elevation dial helper (standard)
- “Elevation is usually on top of the scope. Follow the arrow on your turret.”

### Windage dial helper (standard)
- “Windage is usually on the side of the scope. Follow the arrow on your turret.”

### Crosshair center screen
- “Tap the crosshair center, then fine‑tune.”

### Reference (baseline) screen
- “Get it close, then hold steady.”

---

## What to avoid in the UI (to reduce anxiety)

- Avoid “IMU”, “sensor fusion”, “baseline values”, raw roll/pitch numbers.
- Avoid “accuracy reduced” language during calibration.
- Avoid asking users to compute clicks, convert units, or interpret angles.

---

## Success criteria (user perspective)

- User never does math.
- User always knows exactly what to do next.
- Calibration feels like 5–7 clear screens with one primary action each.
- “Unexpected behavior” exists but stays out of the way unless needed.
- Confirmation step is short, confidence‑building, and number‑free.
