# Max for Live Device Specification: Pre-Roll & Tail Resample Automation (JavaScript Implementation)

## Purpose
To create a Max for Live (M4L) device that allows one-click resampling of the master bus in Ableton Live with **pre-roll** at the start
and a **tail buffer** at the end, without manual punch-in/out or arrangement shifting.  
This solves the common problem where exported audio starts too abruptly due to plug-in latency on the master bus.

## Context
- Ableton Live **cannot** set export start before 1.1.1.
- Resampling manually captures pre-roll but requires hand setup (arming, transport control, punch points, stop timing, cropping).
- This device automates all steps using **Max for Live's JavaScript API**, providing a single-button workflow.

## Goals
1. Capture full master bus output including latency-heavy devices at the start.
2. Add a 1 bar pre-roll before the actual music starts.
3. Add a short tail (safety margin) at the end to ensure no cut-off.
4. Detect end by position of 'RenderEnd' locator. 
4. Stop recording and transport automatically.
5. Crop the resulting clip to exactly the defined region.
6. Write the file to a user-defined directory, named like `[project]-YY-DD-MM-x.wav`, where 'x' is an incrementing alphabetic char (a-z).

## User Interface
The device will have:
- **Text for output directory**
- **Big “Render” button** that triggers the workflow.

## Workflow
1. **Pre-conditions:**
   - User places device on the capture track, which is set for `Resampling` input mode
   - User creates `RenderEnd` locator at the last sample to be rendered.

2. **When “Render” is pressed:**
   - Arm the capture track for recording.
   - Set transport position to `(song_start - 1 bar pre_roll)`.
   - Continue recording until `RenderEnd )` is reached.
   - Stop transport.
   - Consolidate and Crop the clip to remove extra recorded material outside the defined region.
   - Disarm the track.

3. **Post-processing:**
   - Move the resulting file to the user-defined target dir and auto-generated name as defined above
   - Notify user of successful completion

## Constraints
- Should work in Arrangement View only (not Session View bouncing).
- Must not require moving or altering existing arrangement clips.
- Should work without user intervention once “Render” is pressed.
- Assume user knows the approximate song end point or sets it manually in the UI.

## Implementation Plan (JavaScript + M4L UI)
1. **Max for Live device shell:**
   - Create UI elements (number boxes, button, dropdown) in the Max patch.
   - Connect UI values to a `js` object.

2. **JavaScript core logic:**
   - Use `liveAPI` to access:
     - Transport: set position, start, stop.
     - Tracks: arm/disarm, set input to Resampling if needed.
     - Clip cropping (optional: `crop_clip` call).
   - Create function `startRender(preRoll, tail, trackName)` that:
     - Finds track by name/index.
     - Arms it.
     - Moves transport to start position.
     - Starts recording.
     - Sets a timer for `(song_length + preRoll + tail)` duration.
     - Stops transport, disarms track, optionally crops clip.

3. **Testing considerations:**
   - Verify with master bus latency-inducing devices.
   - Check that resulting audio file matches pre-roll start exactly.
   - Confirm auto-crop works and doesn’t remove needed tails unless disabled.

4. **Deliverables:**
   - `.amxd` Max for Live device with clean, minimal UI.
   - Inline `render.js` file containing all logic.
   - Documentation inside the device with usage steps.

