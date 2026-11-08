/**
 * jogDetector.js
 * Automatic Jog Wheel movement and mode detection for DJ controllers (such as Pioneer DDJ-200).
 *
 * Supports:
 * 1. Relative 2's complement / sign-magnitude:
 *    - Typical DDJ-200 CC 33/34 or CC 35:
 *      clockwise: 1, 2, 3... (small positive numbers)
 *      counter-clockwise: 127, 126, 125... (or 65, 66... in 7-bit binary offset)
 * 2. Absolute 7-bit / 14-bit:
 *    - Consecutive positions (e.g. 0 -> 127 wrapping)
 * 3. Auto-detection logic:
 *    - Tracks stream of messages for a given control key
 *    - Automatically identifies whether values are relative (step deltas) or absolute positions
 *    - Generates smooth scratch/jog velocity & delta output for AudioWorklet scratch engine
 */

class JogDetector {
  constructor() {
    this.controlHistory = new Map(); // key -> { lastValue, lastTime, detectedMode, sampleCount, deltas }
    this.activeScratches = new Map(); // deck -> { timer, releaseTimer, wasPlaying }
  }

  /**
   * Reset tracking state
   */
  reset() {
    this.controlHistory.clear();
    this.activeScratches.forEach(s => clearTimeout(s.timer));
    this.activeScratches.clear();
  }

  /**
   * Analyze an incoming MIDI message and calculate a normalized scratch delta.
   * Delta > 0 = forward (clockwise)
   * Delta < 0 = backward (counter-clockwise)
   * Returns: { delta: number, detectedMode: 'relative' | 'absolute' | 'detecting' }
   */
  processJogMessage(message, explicitMode = 'auto') {
    if (message.type !== 'cc') {
      return { delta: 0, detectedMode: 'unsupported' };
    }

    const key = `${message.device?.id || '*'}:${message.channel}:${message.number}`;
    const now = performance.now();
    const rawVal = message.value; // 0..127

    let history = this.controlHistory.get(key);
    const isKnownDdjOrPioneer = Boolean(
      message.device?.name?.toLowerCase().includes('ddj') ||
      message.device?.name?.toLowerCase().includes('pioneer') ||
      message.number === 33 || message.number === 34 || message.number === 35 || message.number === 36
    );

    if (!history) {
      history = {
        lastValue: rawVal,
        lastTime: now,
        detectedMode: explicitMode !== 'auto' ? explicitMode : (isKnownDdjOrPioneer ? 'binary_offset' : 'detecting'),
        sampleCount: 0,
        recentDeltas: [],
        dtAverage: 16
      };
      this.controlHistory.set(key, history);
    }

    const dt = Math.max(1, Math.min(200, now - history.lastTime));
    history.lastTime = now;
    history.sampleCount++;

    let delta = 0;
    let mode = history.detectedMode;

    // Detect 64-center binary offset mode (Pioneer DDJ-200 standard: 64 = stop, >64 = CW, <64 = CCW)
    if (mode === 'detecting' || explicitMode === 'auto') {
      if (isKnownDdjOrPioneer || (rawVal >= 50 && rawVal <= 78)) {
        history.detectedMode = 'binary_offset';
        mode = 'binary_offset';
      } else if (rawVal <= 15 || rawVal >= 112) {
        history.detectedMode = 'relative';
        mode = 'relative';
      }
    }

    if (mode === 'binary_offset' || isKnownDdjOrPioneer) {
      // Standard 64-centered binary offset:
      // CW (forward): 65..127 => +1..+63
      // CCW (backward): 63..0 => -1..-64
      // 64 => 0 (stationary)
      delta = rawVal - 64;
    } else if (mode === 'relative') {
      // 2's complement relative encoder (1..63 forward, 127..65 backward)
      if (rawVal <= 63) {
        delta = rawVal;
      } else {
        delta = rawVal - 128;
      }
    } else {
      // Absolute encoder with wrap-around at 0/127
      let diff = rawVal - history.lastValue;
      if (diff > 64) diff -= 128; // wrapped backward
      else if (diff < -64) diff += 128; // wrapped forward
      delta = diff;
    }

    history.lastValue = rawVal;

    // Normalized to a standard scratch delta without clipping valid quick spins
    const normalizedDelta = Math.max(-25, Math.min(25, delta));
    return {
      delta: normalizedDelta,
      detectedMode: mode,
      rawDelta: delta,
      dt
    };
  }
}

export const jogDetector = new JogDetector();