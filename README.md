# RenderBot (Phase 1 – Simulation)

This repository contains the JavaScript (`renderbot.js`) for a Max for Live device that will eventually automate an Arrangement View resample + crop + rename workflow. **Phase 1** only simulates actions and logs them; no transport or file changes occur.

## Files

* `renderbot.js` – M4L JavaScript core (Phase 1). Place inside a `js` object in your Max device.
* `renderbot-spec.md` – Original specification / requirements.

## Build the M4L Device (Manual Steps)

1. In Ableton Live 12, create (or select) the **Resample Capture** audio track where you want this device to live.
2. Drag a blank *Max Audio Effect* onto the track.
3. Open the Max editor (click the device edit button).
4. In the patcher, add:
   * `[js renderbot.js]` (open the object box, type `js renderbot.js`).
   * A `textedit` object for the output directory path. Give it a scripting name: `output_dir_text`.
   * A `[prepend output_dir]` object, connect `textedit` outlet -> `[prepend output_dir]` -> inlet of `[js renderbot.js]`.
   * A `live.button` (Momentary) named `render_button`; connect its outlet (bang) to the inlet of `[js renderbot.js]`.
   * Optionally, a `[print RenderBotUI]` object connected to the outlet of `[js renderbot.js]` for quick UI feedback.
5. Save the device (e.g., `RenderBot.amxd`). Ensure `renderbot.js` sits alongside the device file or in the device's embedded folder (Device > Save will bundle it if it is in the same directory when first added).
6. Back in Live, add an Arrangement locator named exactly `RenderEnd` at the intended stop position.
7. Enter a valid full path in the `textedit` (e.g., `D:/Exports/RenderBot`).
8. Press the Render button.

## Using Phase 1

Console output (Max window) will show lines prefixed with `[RenderBot]` describing:

* Host track identification.
* Locator discovery and computed pre-roll start (currently assumes fixed 1 bar / 4 beats pre-roll).
* Simulated sequence: arm, move transport, record, crop, rename.
* Predicted output filename and path.

If `RenderEnd` is missing or the output directory is blank, the simulation aborts with an explanatory log.

### Commands / Messages

Send these into the `[js renderbot.js]` object (they're already wired via UI, but useful for testing):

* `output_dir <path>` – Set output directory.
* `bang` or `render` – Run simulation.
* `debug 0|1` – Toggle verbose logging.
* `test_locators` – Print a list of all locators with beat positions.

## Next Phase Preview

Phase 2 will replace simulation logs with real actions:

* Arm track & set monitoring.
* Set transport position & start recording.
* Monitor position; stop exactly at `RenderEnd`.
* Locate the newly created clip, crop to boundaries.
* Predict & move/rename resulting file (or open Explorer if move not possible within M4L sandbox).

## Troubleshooting

* If the track name shows `(Unknown)`, re-save device or ensure it sits directly on a standard audio track (not inside racks-within-racks edge cases).
* If no locators are found, confirm you're in **Arrangement View** and the arrangement has at least one locator.
* Tempo changes are not yet accounted for (beat-time conversion assumes constant tempo at time of query).

## License

MIT (placeholder – adjust as desired).

## Development Tips (Appendix)

These guidelines help you iterate quickly on `renderbot.js` without constant copy/paste between VS Code and Max for Live.

### 1. Auto‑Reload (`autowatch`)
`renderbot.js` sets `autowatch = 1;` so Max automatically reloads the script whenever you save in VS Code. After each save, look for the reload log line in the Max Console to confirm.

### 2. Recommended Workflow (Option B)
Keep the `.amxd` file and `renderbot.js` in the same folder (this repo). In the device, the object is simply `[js renderbot.js]`. With `autowatch`, saving in VS Code instantly refreshes the running script.

### 3. Alternate File Strategies
* Option A (Embedded): Let Max embed the JS. Simple but splits editing between Max and VS Code.
* Option B (Preferred): External file in repo + `autowatch` (no embedding worries).
* Option C (Symlink): If device lives elsewhere (User Library), symlink `renderbot.js` into that folder, then reference `[js renderbot.js]`.
* Option D (Dev vs Release Copies): Keep a dev device pointing to external JS; duplicate and embed for a “release” snapshot.

### 4. Version Pings
Add a constant near the top of `renderbot.js`:
```
var VERSION = '0.1.0-dev';
post('[RenderBot] Reloaded version', VERSION, '\n');
```
Increment when you ship behavior changes; quick confirmation of which code is live.

### 5. Manual Reload / State Echo
Provide a convenience message handler (future addition) like `function reload(){ post('[RenderBot] state', JSON.stringify(state), '\n'); }` to inspect current config without re-saving.

### 6. Debug Noise Control
Use `debug 0` to silence detailed logs once basic wiring is validated; switch back with `debug 1` when investigating timing/locator data.

### 7. Locators Sanity Check
Run `test_locators` after adding or renaming the `RenderEnd` locator to verify the name and beat position before simulating a render.

### 8. Symlink Example (Windows Git Bash)
```
ln -s /c/Users/<you>/path/to/repo/renderbot/renderbot.js \
   /c/Users/<you>/Documents/Ableton/User\ Library/Presets/Audio\ Effects/Max\ Audio\ Effect/RenderBot/renderbot.js
```
Then in device: `[js renderbot.js]`.

### 9. Suggested .gitignore (if/when needed)
```
*.amxd~
*.wav
*.aif
```

### 10. Error Tracing
If a stack trace line number seems off, insert temporary `post('checkpoint A');` breadcrumbs to narrow the failing region (remove after). Avoid minifiers/transpilers during early phases—plain JS keeps line mapping stable.

### 11. Preparing for Phase 2
Add a feature gate:
```
var ACTIONS_ENABLED = 0; // set to 1 when enabling real record logic
```
Then wrap future transport/record code with `if(!ACTIONS_ENABLED){ log('Simulate only'); return; }` until you are confident.

### 12. Tempo & Time Signatures (Future)
Currently conversions assume constant tempo & 4/4 pre-roll bar = 4 beats. For setlists with tempo automation, consider querying `current_song_time` periodically and computing beats on the fly or switching to raw seconds for start/stop boundaries.

### 13. Minimal Commit Rhythm
Commit after each logical change (e.g., locator parsing, filename generation refactor). This lets you quickly revert if a transport feature breaks simulation.

### 14. Safety Checklist Before Enabling Actions
* Confirm correct track (device located on intended resample track)
* `RenderEnd` locator present & at expected beat
* Output directory set & accessible
* Dry-run simulation logs look correct

Following this flow keeps iteration fast and reduces Live session surprises when moving to real recording control.
