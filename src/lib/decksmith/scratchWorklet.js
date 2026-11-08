/* global AudioWorkletProcessor, sampleRate, registerProcessor */
class DeckSmithScratchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.channels = [];
    this.length = 0;
    this.sourceRate = sampleRate;
    this.position = 0;
    this.startPosition = 0;
    this.endPosition = 0;
    this.velocity = 1;
    this.targetVelocity = 1;
    this.playing = false;
    this.loopActive = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.framesSinceReport = 0;
    this.disposed = false;
    this.keyLock = false;

    // SOLA Time-Stretch state for Key Lock
    this.solaWinSize = 1024;
    this.solaHop = 256;
    this.solaBuffer = [new Float32Array(1024), new Float32Array(1024)];
    this.solaWeight = new Float32Array(1024);
    this.solaPos = 0;
    this.solaWindow = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      this.solaWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / 1024));
    }

    this.port.onmessage = ({ data }) => {
      if (data.type === 'clear') {
        this.playing = false;
        this.channels = [];
        this.length = 0;
        this.loopActive = false;
        this.disposed = true;
      }
      if (data.type === 'buffer') {
        this.channels = data.channels.map(buffer => new Float32Array(buffer));
        this.length = this.channels[0]?.length || 0;
        this.sourceRate = data.sampleRate;
        this.startPosition = data.startPosition || 0;
        this.endPosition = data.endPosition || this.length - 1;
        this.position = this.startPosition;
        this.solaPos = 0;
        this.solaBuffer[0].fill(0);
        this.solaBuffer[1].fill(0);
        this.solaWeight.fill(0);
      }
      if (data.type === 'playing') this.playing = data.value;
      if (data.type === 'velocity') this.targetVelocity = data.value;
      if (data.type === 'keyLock') {
        this.keyLock = Boolean(data.value);
        this.solaPos = 0;
        this.solaBuffer[0].fill(0);
        this.solaBuffer[1].fill(0);
        this.solaWeight.fill(0);
      }
      if (data.type === 'position') {
        this.position = Math.max(this.startPosition, Math.min(this.endPosition, this.startPosition + data.value * this.sourceRate));
        this.solaPos = 0;
        this.solaBuffer[0].fill(0);
        this.solaBuffer[1].fill(0);
        this.solaWeight.fill(0);
      }
      if (data.type === 'loop') {
        this.loopActive = Boolean(data.loop);
        this.loopStart = this.startPosition + (data.loop?.start || 0) * this.sourceRate;
        this.loopEnd = this.startPosition + (data.loop?.end || 0) * this.sourceRate;
      }
    };
  }

  process(_, outputs) {
    if (this.disposed) return false;
    const output = outputs[0];
    if (!this.length) return true;
    const rate = this.sourceRate / sampleRate;

    // Check whether Key Lock should actively stretch:
    // Only when keyLock is enabled, playing steadily, velocity > 0, and not actively scratching
    const isScratching = Math.abs(this.velocity - this.targetVelocity) > 0.05 || this.velocity <= 0;
    const useKeyLock = this.keyLock && this.playing && !isScratching && Math.abs(this.velocity - 1.0) >= 0.002 && this.velocity >= 0.8 && this.velocity <= 1.25;

    if (!useKeyLock) {
      // 100% UNTOUCHED ORIGINAL FAST PATH (Identical to production)
      for (let frame = 0; frame < output[0].length; frame++) {
        this.velocity += (this.targetVelocity - this.velocity) * 0.035;
        const index = Math.floor(this.position), fraction = this.position - index;
        const atStart = this.position <= this.startPosition && this.targetVelocity <= 0;
        for (let channel = 0; channel < output.length; channel++) {
          const samples = this.channels[Math.min(channel, this.channels.length - 1)];
          const current = samples[index] || 0, next = samples[Math.min(index + 1, this.length - 1)] || 0;
          output[channel][frame] = (this.playing && !atStart) ? current + (next - current) * fraction : 0;
        }
        if (this.playing) {
          this.position += this.velocity * rate;
          if (this.position <= this.startPosition) {
            this.position = this.startPosition;
            this.velocity = 0;
          }
          if (this.loopActive && this.velocity > 0 && this.position >= this.loopEnd) this.position = this.loopStart;
          else if (this.position >= this.endPosition) {
            this.position = this.endPosition;
            this.playing = false;
          }
        }
      }
    } else {
      // SOLA TIME-STRETCH PATH (Preserves original pitch at modified tempo)
      const numChannels = output.length;
      for (let frame = 0; frame < output[0].length; frame++) {
        this.velocity += (this.targetVelocity - this.velocity) * 0.035;

        // When sola buffer needs a new grain:
        if (this.solaPos >= this.solaHop) {
          const remain = this.solaWinSize - this.solaHop;
          for (let ch = 0; ch < 2; ch++) {
            this.solaBuffer[ch].copyWithin(0, this.solaHop, this.solaWinSize);
            this.solaBuffer[ch].fill(0, remain);
          }
          this.solaWeight.copyWithin(0, this.solaHop, this.solaWinSize);
          this.solaWeight.fill(0, remain);
          this.solaPos = 0;

          // Cross-correlation search window around this.position to find best phase match
          let bestOffset = 0;
          let maxCorr = -1e9;
          const searchRange = 24;
          const grainBase = Math.floor(this.position);
          const ch0 = this.channels[0];

          if (remain > 64 && ch0) {
            for (let offset = -searchRange; offset <= searchRange; offset += 2) {
              const p = grainBase + offset;
              if (p < this.startPosition || p + 128 >= this.endPosition) continue;
              let corr = 0;
              for (let i = 0; i < 128; i += 4) {
                corr += (ch0[p + i] || 0) * this.solaBuffer[0][i];
              }
              if (corr > maxCorr) {
                maxCorr = corr;
                bestOffset = offset;
              }
            }
          }

          const grainPos = grainBase + bestOffset;
          for (let ch = 0; ch < 2; ch++) {
            const src = this.channels[Math.min(ch, this.channels.length - 1)];
            const buf = this.solaBuffer[ch];
            for (let i = 0; i < this.solaWinSize; i++) {
              const idx = grainPos + i;
              const sample = (idx >= this.startPosition && idx < this.endPosition) ? src[idx] || 0 : 0;
              buf[i] += sample * this.solaWindow[i];
            }
          }
          for (let i = 0; i < this.solaWinSize; i++) {
            this.solaWeight[i] += this.solaWindow[i];
          }

          // Advance macro position by analysis hop (solaHop * velocity * rate)
          this.position += this.solaHop * this.velocity * rate;
          if (this.loopActive && this.position >= this.loopEnd) this.position = this.loopStart;
          else if (this.position >= this.endPosition) {
            this.position = this.endPosition;
            this.playing = false;
          }
        }

        const w = this.solaWeight[this.solaPos] || 1;
        const norm = w > 0.01 ? 1 / w : 1;
        for (let channel = 0; channel < numChannels; channel++) {
          output[channel][frame] = this.solaBuffer[Math.min(channel, 1)][this.solaPos] * norm;
        }
        this.solaPos++;
      }
    }

    if (++this.framesSinceReport >= 16) {
      this.framesSinceReport = 0;
      this.port.postMessage({
        type: 'position',
        value: (this.position - this.startPosition) / this.sourceRate,
        playing: this.playing
      });
    }
    return true;
  }
}
registerProcessor('decksmith-scratch', DeckSmithScratchProcessor);