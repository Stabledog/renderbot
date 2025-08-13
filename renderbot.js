/**
 * RenderBot Phase 1 (UI + debug log only)
 * --------------------------------------------------
 * This script is loaded inside a Max for Live (M4L) device via a [js renderbot.js] object.
 * Phase 1 goal: When the user presses the Render button, gather contextual info and
 * log (simulate) the actions that later phases will perform. No transport control,
 * arming, recording, cropping, or file operations happen yet.
 *
 * EXPECTED PATCH WIRING (see README or instructions):
 *  - [textedit] (scripting name: output_dir_text) -> [prepend output_dir] -> [js renderbot.js]
 *  - [live.button] (scripting name: render_button) -> (bang) -> [js renderbot.js]
 *  - (optional) [print] connected to outlet of this js for UI status echo.
 *
 * PUBLIC MESSAGES / FUNCTIONS:
 *  - output_dir <path with/without spaces>
 *  - bang  (alias for render())
 *  - render
 *  - debug <0|1>
 *  - test_locators (quick locator listing)
 *
 * LOGGING STYLE:
 *  All debug output prefixed with "[RenderBot]" for easy filtering in Max Console.
 *
 * LIMITATIONS (Phase 1):
 *  - Does not validate whether track input is set to Resampling (only reports placeholder TODO).
 *  - Does not confirm actual future file path (only predicts naming format).
 *  - Does not move transport or perform recording.
 */

inlets = 1;
outlets = 1; // Outlet 0: status / summary lines (optional for UI display)
// Auto-reload this script in Max when the file changes on disk.
autowatch = 1;

// Bump this VERSION string whenever you want to visually confirm a reload.
var VERSION = '0.1.1-dev';
var LOAD_TIME_ISO = (new Date()).toISOString();

var state = {
  outputDir: '',
  debug: 1,
  lastSummary: ''
};

// Utility: console post with consistent prefix.
function log() {
  var args = Array.prototype.slice.call(arguments);
  post('[RenderBot]', args.join(' '), '\n');
}

function dlog() {
  if (!state.debug) return;
  log.apply(this, arguments);
}

// Entry points -------------------------------------------------------------

function debug(v) {
  state.debug = (parseInt(v, 10) === 0) ? 0 : 1;
  log('Debug mode =', state.debug);
}

// Accept directory path from [prepend output_dir]
function output_dir() {
  var parts = arrayfromargs(arguments);
  state.outputDir = parts.join(' ');
  log('Set output directory to:', state.outputDir);
}

// Support pressing the button (bang) or explicit 'render'.
function bang() { render(); }
function render() {
  log('--- Render (Phase 1 simulation) ---');
  if (!state.outputDir) {
    log('ABORT: Output directory not set.');
    outlet(0, 'ABORT: Output directory not set.');
    return;
  }

  var song = getSong();
  if (!song) {
    log('ERROR: Could not access live_set');
    outlet(0, 'ERROR: live_set');
    return;
  }

  var trackInfo = getHostTrackInfo();
  var locInfo = findRenderEndLocator();
  if (!locInfo.found) {
    log('ABORT: Locator named "RenderEnd" not found.');
    outlet(0, 'ABORT: missing RenderEnd locator');
    return;
  }

  var startPosBeats = computePreRollStart(locInfo.timeBeats, 4.0); // 1 bar @ 4/4 assumed
  var predictedFileName = buildPredictedFileName(trackInfo.trackName);
  var predictedFullPath = state.outputDir + '/' + predictedFileName;

  dlog('Song current position (beats):', getSongCurrentBeatPosition(song));
  dlog('Host track path:', trackInfo.trackPath);
  dlog('Host track index:', trackInfo.trackIndex);
  dlog('Host track name:', trackInfo.trackName);
  dlog('RenderEnd time (beats):', locInfo.timeBeats);
  dlog('Calculated pre-roll start (beats):', startPosBeats);

  // Simulated steps
  log('Simulate: Would arm track #' + trackInfo.trackIndex + ' (' + trackInfo.trackName + ')');
  log('Simulate: Would move transport to beat', startPosBeats, '(pre-roll start)');
  log('Simulate: Would start recording until beat', locInfo.timeBeats, '(RenderEnd)');
  log('Simulate: Would crop recorded clip to', startPosBeats, '->', locInfo.timeBeats);
  log('Simulate: Would rename & move recorded file to:');
  log('   ', predictedFullPath);
  log('Simulate: Would report success in status bar');

  var summary = 'Render simulation OK: start=' + startPosBeats + ' end=' + locInfo.timeBeats + ' file=' + predictedFileName;
  state.lastSummary = summary;
  outlet(0, summary);
  log('--- End simulation ---');
}

// live.button outputs 1 (press) then 0 (release). Treat a 1 as a render trigger.
function msg_int(v) {
  if (v === 1) {
    dlog('Received int 1 from button -> triggering render()');
    render();
  }
}

function msg_float(v) { // Just delegate to int logic after truncation
  msg_int(Math.floor(v));
}

// Catch-all for unexpected symbols (debug aid). Disabled by default to avoid noise.
// Uncomment if you need to inspect stray messages reaching the js object.
// function anything() {
//   var a = arrayfromargs(messagename, arguments);
//   dlog('ANYTHING message:', a);
// }

// Debug helper to list locators.
function test_locators() {
  var locs = listLocators();
  log('Locator list (' + locs.length + '):');
  for (var i = 0; i < locs.length; i++) {
    log('  #' + i + ' name=' + locs[i].name + ' timeBeats=' + locs[i].timeBeats);
  }
}

// Core helpers -------------------------------------------------------------

function getSong() {
  try {
    return new LiveAPI('live_set');
  } catch (e) {
    log('LiveAPI error (live_set):', e);
    return null;
  }
}

function getSongCurrentBeatPosition(song) {
  // Song property 'current_song_time' returns seconds; convert using tempo.
  try {
    var timeSec = song.get('current_song_time');
    var tempo = parseFloat(song.get('tempo')) || 120.0;
    // beats = (seconds * tempo) / 60
    return (parseFloat(timeSec) * tempo) / 60.0;
  } catch (e) {
    return -1;
  }
}

function getHostTrackInfo() {
  // Use this_device path to derive track.
  var dev;
  try {
    dev = new LiveAPI('this_device');
  } catch (e) {
    log('ERROR: cannot access this_device', e);
    return { trackIndex: -1, trackName: 'Unknown', trackPath: '' };
  }
  var devPath = dev.path; // e.g., "live_set tracks 3 devices 2"
  var parts = devPath.split(' ');
  var tracksIdx = parts.indexOf('tracks');
  var trackIndex = -1;
  if (tracksIdx >= 0 && parts.length > tracksIdx + 1) {
    trackIndex = parseInt(parts[tracksIdx + 1], 10);
  }
  var trackPath = 'live_set tracks ' + trackIndex;
  var trackName = '(Unknown)';
  try {
    var trackAPI = new LiveAPI(trackPath);
    trackName = trackAPI.get('name');
  } catch (e2) {
    log('WARN: could not read track name', e2);
  }
  return { trackIndex: trackIndex, trackName: trackName, trackPath: trackPath };
}

function listLocators() {
  var song = getSong();
  if (!song) return [];
  var propsToTry = ['locators', 'cue_points']; // Different Live versions / docs naming
  var propUsed = null;
  var count = 0;
  for (var p = 0; p < propsToTry.length; p++) {
    try {
      count = song.getcount(propsToTry[p]);
      propUsed = propsToTry[p];
      break;
    } catch (e) {
      // continue
    }
  }
  if (propUsed === null) {
    log('Could not access locators (tried: locators, cue_points). Live version difference?');
    return [];
  }
  dlog('Locator container property detected:', propUsed, 'count=', count);
  var locs = [];
  for (var i = 0; i < count; i++) {
    try {
      var locPath = 'live_set ' + propUsed + ' ' + i;
      var locAPI = new LiveAPI(locPath);
      var rawName = locAPI.get('name');
      var name = (rawName && rawName.trim) ? rawName.trim() : rawName;
      var timeSecRaw = locAPI.get('time');
      var timeSec = parseFloat(timeSecRaw);
      if (isNaN(timeSec)) timeSec = 0;
      var timeBeats = secondsToBeats(timeSec);
      locs.push({ index: i, name: name, timeBeats: timeBeats });
    } catch (e2) {
      log('Locator read error @', i, e2);
    }
  }
  return locs;
}

function findRenderEndLocator() {
  var locs = listLocators();
  for (var i = 0; i < locs.length; i++) {
    var nm = ('' + locs[i].name).trim().toLowerCase();
    if (nm === 'renderend') {
      return { found: true, timeBeats: locs[i].timeBeats, index: locs[i].index };
    }
  }
  if (locs.length) {
    dlog('Available locator names:', locs.map(function(l){return l.name;}).join(', '));
  }
  return { found: false };
}

function secondsToBeats(seconds) {
  var song = getSong();
  if (!song) return 0;
  var tempo = parseFloat(song.get('tempo')) || 120.0;
  return (seconds * tempo) / 60.0;
}

function beatsToSeconds(beats) {
  var song = getSong();
  if (!song) return 0;
  var tempo = parseFloat(song.get('tempo')) || 120.0;
  return (beats * 60.0) / tempo;
}

function computePreRollStart(endBeat, preRollBeats) {
  var start = endBeat - preRollBeats; // naive; ensure >= 0.0
  if (start < 0) start = 0.0;
  return start;
}

function buildPredictedFileName(trackName) {
  var safeTrack = sanitizeName(trackName || 'Track');
  var now = new Date();
  var ts = now.getFullYear().toString() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '_' + pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
  // Placeholder naming pattern: <TrackName>_<YYYYMMDD_HHMMSS>.wav
  return safeTrack + '_' + ts + '.wav';
}

function sanitizeName(name) {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '_');
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

// Initialization log (prints each time the script is (re)loaded by autowatch)
log('Loaded RenderBot Phase 1 JS v' + VERSION + ' @ ' + LOAD_TIME_ISO + '  Send "output_dir <path>" then bang to simulate.');

// Manual version ping (invoke by sending the symbol 'ping' to the js object)
function ping() {
  log('Ping v' + VERSION + ' (loaded ' + LOAD_TIME_ISO + ') debug=' + state.debug + ' outputDir=' + (state.outputDir||'(not set)'));
}

