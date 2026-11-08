/**
 * midiSmoother.js
 * Hardware MIDI Input 14-bit Pairing and Damped Smoothing Filter.
 *
 * 1. 14-bit MIDI CC Pairing:
 *    DJ controllers such as the Pioneer DDJ-200 use paired CCs for high-resolution
 *    faders (Pitch: CC 0 MSB + CC 32 LSB, Channel Faders: CC 19 MSB + CC 51 LSB).
 *    Treating CC 32 or CC 51 as standalone 7-bit values causes the fader to jump
 *    violently between coarse (e.g. 0.50) and fine (e.g. 0.05).
 *    This decoder unifies MSB + LSB into a single 14-bit float [0..1] with 16,384 steps.
 *
 * 2. Exponential Moving Average (EMA) Damping / Slew-Rate Limiter:
 *    Applies a smooth physical glide on continuous hardware sliders (Tempo, Channel Faders,
 *    Crossfader, EQs), matching the smooth, natural feel of software mouse/touch dragging.
 */

class MidiSmoother {
  constructor() {
    // 14-bit CC state: `${deviceId}:${channel}:${baseCC}` -> { msb, lsb, is14Bit }
    this.ccPairs = new Map();
    // Smoothing states: `${target}` -> { current, target, callback, active }
    this.targets = new Map();
    this.rafId = null;
    this.step = this.step.bind(this);
  }

  /**
   * Decodes an incoming CC message, pairing 14-bit MSB (0..31) and LSB (32..63)
   * into a seamless, high-resolution normalized float [0..1].
   */
  decodeContinuous(message) {
    if (message.type !== 'cc') {
      return message.normalized ?? (message.value / 127);
    }

    const { channel, number, value, device } = message;
    const deviceId = device?.id || '*';

    // Check if this CC is in 14-bit range (0..31 MSB, 32..63 LSB)
    const isLsb = number >= 32 && number <= 63;
    const isMsb = number < 32;

    if (!isMsb && !isLsb) {
      // Standard 7-bit CC (e.g. CC 70)
      return value / 127;
    }

    const baseCC = isMsb ? number : (number - 32);
    const key = `${deviceId}:${channel}:${baseCC}`;

    let pair = this.ccPairs.get(key);
    if (!pair) {
      pair = { msb: null, lsb: null, is14Bit: false };
      this.ccPairs.set(key, pair);
    }

    if (isMsb) {
      pair.msb = value;
    } else {
      pair.lsb = value;
      pair.is14Bit = true; // Receiving a message on LSB CC marks this control as 14-bit
    }

    if (pair.is14Bit) {
      const msb = pair.msb !== null ? pair.msb : 64;
      const lsb = pair.lsb !== null ? pair.lsb : 0;
      // 14-bit combined: 0 to 16383
      return Math.max(0, Math.min(1, ((msb << 7) | lsb) / 16383));
    }

    // Single 7-bit MSB (no LSB received yet)
    return value / 127;
  }

  /**
   * Updates target for a continuous control and glides smoothly towards it.
   * alpha = 0.42 gives ~50ms responsive, organic settling time without latency or stepping.
   */
  setTarget(targetName, normalizedValue, onApply) {
    let state = this.targets.get(targetName);
    if (!state) {
      state = {
        current: normalizedValue,
        target: normalizedValue,
        callback: onApply,
        active: false,
      };
      this.targets.set(targetName, state);
      onApply(normalizedValue);
      return;
    }

    state.callback = onApply;
    state.target = normalizedValue;

    // If already at target within tiny epsilon, keep inactive
    if (Math.abs(state.target - state.current) < 0.0005) {
      state.current = state.target;
      onApply(state.current);
      return;
    }

    state.active = true;
    if (!this.rafId && typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(this.step);
    }
  }

  /**
   * Sync current value from software UI (e.g. mouse drag)
   * so future hardware adjustments start from the UI position.
   */
  syncCurrent(targetName, normalizedValue) {
    const state = this.targets.get(targetName);
    if (state) {
      state.current = normalizedValue;
      state.target = normalizedValue;
      state.active = false;
    } else {
      this.targets.set(targetName, {
        current: normalizedValue,
        target: normalizedValue,
        callback: null,
        active: false,
      });
    }
  }

  /**
   * Animation frame loop for continuous damped glide.
   */
  step() {
    let stillActive = false;
    const alpha = 0.42; // Smoothing coefficient per frame (~16ms)

    for (const [, state] of this.targets.entries()) {
      if (!state.active) continue;

      const diff = state.target - state.current;
      if (Math.abs(diff) < 0.0008 || (state.target === 0 && state.current < 0.004) || (state.target === 1 && state.current > 0.996)) {
        state.current = state.target;
        state.active = false;
      } else {
        state.current += diff * alpha;
        stillActive = true;
      }

      if (state.callback) {
        state.callback(state.current);
      }
    }

    if (stillActive && typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(this.step);
    } else {
      this.rafId = null;
    }
  }

  dispose() {
    if (this.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.targets.clear();
    this.ccPairs.clear();
  }
}

export const midiSmoother = new MidiSmoother();