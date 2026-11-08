/**
 * KeyDetector — acoustic musical key detection via chroma analysis.
 *
 * Pipeline:
 *   PCM (mono) → downsample → Hann-windowed FFT frames → chroma vectors
 *   → temporal region aggregation → Krumhansl-Schmuckler profile matching
 *   → 24-candidate ranking → confidence calculation
 *
 * CRITICAL: Uses ONLY PCM spectral content. Never reads metadata, tags,
 * filenames, BPM, or any non-acoustic source. Metadata Key and Acoustic
 * Key are completely independent data sources.
 */

import { noteName, keyName, camelotCode, openKeyCode } from './KeyNotation.js';

// --- Configuration ---
const KEY_TARGET_RATE = 11025;
const KEY_FFT_SIZE = 4096;
const KEY_HOP_SIZE = 2048;
const KEY_MIN_FREQ = 55;     // A1 — lower bound of useful harmonic content
const KEY_MAX_FREQ = 2000;   // B6 — upper bound (avoids sub-bass and noise)
const KEY_MIN_USABLE_ENERGY = 0.001;
const KEY_MIN_USABLE_FRAMES = 10;
const KEY_NUM_REGIONS = 10;
const KEY_MAX_FRAMES_PER_REGION = 30;

// Krumhansl-Schmuckler key profiles (indexed by pitch class from tonic)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.30, 1.70];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 1.83];

// --- DSP utilities ---

function downsamplePcm(pcm, sourceRate, targetRate) {
  if (sourceRate <= targetRate) return pcm;
  const ratio = sourceRate / targetRate;
  const newLength = Math.floor(pcm.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), pcm.length);
    let sum = 0, count = 0;
    for (let j = start; j < end; j++) { sum += pcm[j]; count++; }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

// Radix-2 Cooley-Tukey FFT (in-place, operates on Float32Array)
function fft(real, imag) {
  const n = real.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
  }
  // Cooley-Tukey butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wReal = Math.cos(ang);
    const wImag = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cReal = 1, cImag = 0;
      for (let j = 0; j < half; j++) {
        const oReal = real[i + j + half];
        const oImag = imag[i + j + half];
        const tReal = cReal * oReal - cImag * oImag;
        const tImag = cReal * oImag + cImag * oReal;
        real[i + j] += tReal;
        imag[i + j] += tImag;
        real[i + j + half] -= tReal;
        imag[i + j + half] -= tImag;
        const ncReal = cReal * wReal - cImag * wImag;
        const ncImag = cReal * wImag + cImag * wReal;
        cReal = ncReal;
        cImag = ncImag;
      }
    }
  }
}

// Cached Hann window
let _hannCache = null;
function getHannWindow(size) {
  if (_hannCache && _hannCache.length === size) return _hannCache;
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
  _hannCache = w;
  return w;
}

// Cached frequency-bin → pitch-class mapping
let _binMapCache = null;
function getBinMapping(fftSize, sampleRate) {
  if (_binMapCache && _binMapCache.fftSize === fftSize && _binMapCache.sampleRate === sampleRate) {
    return _binMapCache.map;
  }
  const map = [];
  for (let k = 1; k < fftSize / 2; k++) {
    const freq = k * sampleRate / fftSize;
    if (freq < KEY_MIN_FREQ || freq > KEY_MAX_FREQ) { map.push(-1); continue; }
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    map.push(pitchClass);
  }
  _binMapCache = { fftSize, sampleRate, map };
  return map;
}

// L2-normalize a 12-bin chroma vector
function normalizeChroma(chroma) {
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return null;
  const result = new Float32Array(12);
  for (let i = 0; i < 12; i++) result[i] = chroma[i] / norm;
  return result;
}

// Cosine similarity between chroma and a rotated key profile
function cosineSimilarity(chroma, profile, rotation) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < 12; i++) {
    const a = chroma[i];
    const b = profile[(i - rotation + 12) % 12];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 1e-10 ? dot / denom : 0;
}

// Score all 24 candidates (12 major + 12 minor) for a chroma vector
function scoreCandidates(chroma) {
  const candidates = [];
  for (let root = 0; root < 12; root++) {
    candidates.push({ root, mode: 'major', score: cosineSimilarity(chroma, MAJOR_PROFILE, root) });
    candidates.push({ root, mode: 'minor', score: cosineSimilarity(chroma, MINOR_PROFILE, root) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Detect the musical key of an audio track from PCM data.
 *
 * @param {Float32Array} pcm - Mono PCM audio data (channel 0)
 * @param {number} sampleRate - Sample rate of the PCM data
 * @returns {object} Key analysis result
 */
export function detectKey(pcm, sampleRate) {
  // Limit analysis to first 10 minutes for performance
  const maxSamples = 10 * 60 * sampleRate;
  const analysisPcm = pcm.length > maxSamples ? pcm.subarray(0, maxSamples) : pcm;

  // Downsample for efficiency
  const downsampled = downsamplePcm(analysisPcm, sampleRate, KEY_TARGET_RATE);

  if (downsampled.length < KEY_FFT_SIZE) {
    return { key: null, confidence: 0, reason: 'insufficient_harmonic_content' };
  }

  const hann = getHannWindow(KEY_FFT_SIZE);
  const binMap = getBinMapping(KEY_FFT_SIZE, KEY_TARGET_RATE);
  const real = new Float32Array(KEY_FFT_SIZE);
  const imag = new Float32Array(KEY_FFT_SIZE);
  const mags = new Float32Array(binMap.length);

  const totalFrames = Math.floor((downsampled.length - KEY_FFT_SIZE) / KEY_HOP_SIZE) + 1;
  const framesPerRegion = Math.max(1, Math.floor(totalFrames / KEY_NUM_REGIONS));
  const framesToAnalyze = Math.min(framesPerRegion, KEY_MAX_FRAMES_PER_REGION);

  const regionalChromas = [];
  let totalUsableFrames = 0;

  for (let region = 0; region < KEY_NUM_REGIONS; region++) {
    const regionStart = region * framesPerRegion * KEY_HOP_SIZE;
    const regionEnd = Math.min((region + 1) * framesPerRegion * KEY_HOP_SIZE, downsampled.length);
    if (regionEnd - regionStart < KEY_FFT_SIZE) continue;

    const chroma = new Float32Array(12);
    let usableFrames = 0;

    for (let f = 0; f < framesToAnalyze; f++) {
      const t = framesToAnalyze > 1 ? f / (framesToAnalyze - 1) : 0;
      const frameStart = Math.floor(regionStart + (regionEnd - regionStart - KEY_FFT_SIZE) * t);

      // Fill FFT buffers with Hann-windowed samples
      for (let i = 0; i < KEY_FFT_SIZE; i++) {
        const idx = frameStart + i;
        real[i] = idx < downsampled.length ? downsampled[idx] * hann[i] : 0;
        imag[i] = 0;
      }

      fft(real, imag);

      // Compute magnitude spectrum and energy
      let energy = 0;
      for (let k = 0; k < binMap.length; k++) {
        const pc = binMap[k];
        if (pc < 0) { mags[k] = 0; continue; }
        const re = real[k + 1];
        const im = imag[k + 1];
        const mag = Math.sqrt(re * re + im * im);
        mags[k] = mag;
        energy += mag;
      }

      // Only accumulate usable (non-silent) frames
      if (energy >= KEY_MIN_USABLE_ENERGY) {
        for (let k = 0; k < binMap.length; k++) {
          if (binMap[k] >= 0) chroma[binMap[k]] += mags[k];
        }
        usableFrames++;
        totalUsableFrames++;
      }
    }

    if (usableFrames === 0) continue;
    const normalized = normalizeChroma(chroma);
    if (!normalized) continue;
    regionalChromas.push({ chroma: normalized, usableFrames });
  }

  if (totalUsableFrames < KEY_MIN_USABLE_FRAMES) {
    return { key: null, confidence: 0, reason: 'insufficient_harmonic_content' };
  }

  // Aggregate chroma across regions (weighted by usable frame count)
  const aggregateChroma = new Float32Array(12);
  let totalWeight = 0;
  for (const rc of regionalChromas) {
    for (let i = 0; i < 12; i++) aggregateChroma[i] += rc.chroma[i] * rc.usableFrames;
    totalWeight += rc.usableFrames;
  }
  for (let i = 0; i < 12; i++) aggregateChroma[i] /= totalWeight;
  const normalizedAggregate = normalizeChroma(aggregateChroma);
  if (!normalizedAggregate) {
    return { key: null, confidence: 0, reason: 'insufficient_harmonic_content' };
  }

  // Score all 24 candidates on aggregate chroma
  const overallCandidates = scoreCandidates(normalizedAggregate);
  const best = overallCandidates[0];
  const second = overallCandidates[1];

  // Regional consistency: fraction of regions agreeing with overall best
  let agreeingRegions = 0;
  for (const rc of regionalChromas) {
    const rcCands = scoreCandidates(rc.chroma);
    if (rcCands[0].root === best.root && rcCands[0].mode === best.mode) agreeingRegions++;
  }
  const regionalConsistency = regionalChromas.length > 0 ? agreeingRegions / regionalChromas.length : 0;

  // Score margin (normalized)
  const scoreMargin = best.score > 0 ? (best.score - second.score) / best.score : 0;

  // Usable harmonic material ratio
  const usableRatio = Math.min(1, totalUsableFrames / (KEY_NUM_REGIONS * KEY_MAX_FRAMES_PER_REGION));

  // Confidence: margin × consistency × material availability
  const confidence = Math.min(1, scoreMargin * (0.4 + 0.6 * regionalConsistency) * (0.5 + 0.5 * usableRatio));

  const r3 = v => Math.round(v * 1000) / 1000;

  return {
    root: noteName(best.root),
    rootIndex: best.root,
    mode: best.mode,
    key: keyName(best.root, best.mode),
    camelot: camelotCode(best.root, best.mode),
    openKey: openKeyCode(best.root, best.mode),
    confidence: r3(confidence),
    alternative: {
      key: keyName(second.root, second.mode),
      root: noteName(second.root),
      rootIndex: second.root,
      mode: second.mode,
      camelot: camelotCode(second.root, second.mode),
      confidence: r3(second.score),
    },
    diagnostics: {
      bestScore: r3(best.score),
      secondScore: r3(second.score),
      scoreMargin: r3(scoreMargin),
      usableFrames: totalUsableFrames,
      totalFrames,
      regionalConsistency: r3(regionalConsistency),
      numRegions: regionalChromas.length,
      rankedCandidates: overallCandidates.slice(0, 5).map(c => ({
        key: keyName(c.root, c.mode),
        root: noteName(c.root),
        rootIndex: c.root,
        mode: c.mode,
        score: r3(c.score),
        camelot: camelotCode(c.root, c.mode),
      })),
    },
  };
}