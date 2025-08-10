I’ve reviewed your `renderbot-spec.md` requirements against Ableton Live 12’s Max for Live (M4L) capabilities and don’t see any blocking inconsistencies — everything you want is doable via the Live API from JavaScript inside an M4L device.

### Requirements review

**Completeness**

* Covers **pre-roll**, **end locator detection**, **auto-arm/stop/crop**, **file naming**, **user output dir**.
* Scope limited to Arrangement View resampling — no ambiguity about Session View.
* Assumes user has set up a dedicated resample track and `RenderEnd` locator.

**Consistency**

* The “stop at RenderEnd” requirement matches “no manual punch in/out”.
* Cropping spec aligns with `crop_clip` API availability.
* File naming format is clearly defined.

**Feasibility in M4L**

* All transport, track arming, and locator positioning actions are Live API-supported.
* Cropping: doable via `Live.Clip.crop()`.
* File moving/renaming: **cannot be done directly in M4L** — can attempt via Max JS `File` API or, if that fails, launch `explorer.exe` focused on the source dir so the user can handle it manually.
* End detection via locator is supported — you can iterate over `song.get('locators')` and match the name.

**Clarifications (final)**

* **Tail**: Not required. The end marker is the definitive end.
* If `RenderEnd` is missing: Abort and notify user.
* If output folder undefined: Abort and notify user.

---

## High-Level Implementation Plan (updated)

1. **UI layer (Max patch)**

   * `textedit` for output directory.
   * Big `live.button` for **Render**.

2. **JavaScript core (`renderbot.js`)**

   * Use the Live API path `this.patcher.parentpatcher` to identify the host track directly, since the device itself resides on the capture track — no need to “search” for it in the track list.
   * Validate that track input is set to “Resampling”.
   * Locate start position = `1.1.1 - 1 bar` (pre-roll fixed at 1 bar).
   * Locate end position from `RenderEnd` locator.
   * Arm track, set transport to start, start recording.
   * Monitor transport — stop at `RenderEnd`.
   * Crop clip to exact start/end.
   * Export to Live’s recorded files folder.
   * Move/rename file to target directory if possible (else open Explorer in source dir).

3. **Post-processing**

   * Show success message in Live’s status bar and Max console.
   * If move/rename fails, alert user with file path.

---

## Phase 1 Detailed Spec — “UI + debug log only”

**Goal**: Build UI and hook events so pressing **Render** logs intended actions to Max console.

**UI elements**

* `live.text` — label “Output Dir”
* `textedit` — directory path input
* `live.button` — “Render”
* `js` object — load `renderbot.js`

**JavaScript behavior**

* On `Render` click:

  1. Read UI parameters.
  2. Query Live API:

     * Current song position.
     * Track arm state for the device’s host track.
     * Locators list.
  3. Simulate workflow:

     * Log: start pos, end pos, target track.
     * Log: “Would arm track X”, “Would move transport to Y”, etc.
     * Log: output file path as it would be named.
* No transport control or file I/O yet.

