/**
 * Crossfader software damper with time-step exponential smoothing.
 * Ensures consistent physical feel across different monitor refresh rates (60Hz, 120Hz, etc.),
 * preserves exact bounds [-1.0, 1.0] and center 0.0, and prevents audio stepping.
 */

export class CrossfaderDamper {
  constructor({ tau = 0.09, onUpdate } = {}) {
    this.tau = tau; // Time constant in seconds (~90ms silky, weighted glide)
    this.current = 0;
    this.target = 0;
    this.onUpdate = onUpdate;
    this.rafId = null;
    this.lastTime = null;
    this.step = this.step.bind(this);
  }

  setTarget(newTarget) {
    let clamped = Math.max(-1, Math.min(1, Number(newTarget)));
    if (!Number.isFinite(clamped)) clamped = 0;

    // End-stop deadzones: ensure reaching full 100% (-1.0 and +1.0) and center (0.0)
    if (clamped >= 0.94) clamped = 1;
    else if (clamped <= -0.94) clamped = -1;
    else if (Math.abs(clamped) <= 0.03) clamped = 0;

    this.target = clamped;

    // If already at target within threshold, snap immediately
    if (Math.abs(this.target - this.current) < 0.001) {
      this.current = this.target;
      this.onUpdate?.(this.current);
      return;
    }

    if (!this.rafId && typeof requestAnimationFrame !== 'undefined') {
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.step);
    }
  }

  setCurrent(val) {
    let clamped = Math.max(-1, Math.min(1, Number(val)));
    if (!Number.isFinite(clamped)) clamped = 0;
    if (clamped >= 0.94) clamped = 1;
    else if (clamped <= -0.94) clamped = -1;
    else if (Math.abs(clamped) <= 0.03) clamped = 0;
    this.current = clamped;
    this.target = clamped;
    if (this.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTime = null;
    this.onUpdate?.(this.current);
  }

  step(now) {
    if (this.lastTime === null) this.lastTime = now;
    const dt = Math.min(0.08, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    const diff = this.target - this.current;

    // Delta-time based exponential smoothing: alpha = 1 - exp(-dt / tau)
    const alpha = 1 - Math.exp(-dt / this.tau);
    let next = this.current + diff * alpha;

    // End-stop snapping: guarantee exact bounds at -1.0, 0.0, and +1.0
    const remaining = this.target - next;
    const isSettled =
      Math.abs(remaining) < 0.002 ||
      (this.target === 1 && next >= 0.985) ||
      (this.target === -1 && next <= -0.985) ||
      (this.target === 0 && Math.abs(next) <= 0.003);

    if (isSettled) {
      this.current = this.target;
      this.rafId = null;
      this.lastTime = null;
      this.onUpdate?.(this.current);
      return;
    }

    this.current = next;
    this.onUpdate?.(this.current);

    this.rafId = requestAnimationFrame(this.step);
  }

  dispose() {
    if (this.rafId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}