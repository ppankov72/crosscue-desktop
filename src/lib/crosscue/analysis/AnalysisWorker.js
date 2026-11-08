/**
 * AnalysisWorker — runs in a separate Web Worker thread.
 *
 * COMPATIBILITY APPROACH:
 *   This worker does NOT use OfflineAudioContext, AudioContext, or
 *   decodeAudioData. Audio decoding happens on the main thread (in
 *   AnalysisService) because OfflineAudioContext/decodeAudioData inside
 *   a Worker is not universally supported across browsers (notably
 *   Safari). By keeping the worker dependency-free of Web Audio API,
 *   it works in every browser that supports Web Workers + crypto.subtle.
 *
 *   The main thread decodes the file (using its own OfflineAudioContext,
 *   completely separate from audioEngine's AudioContext) and transfers
 *   the raw PCM Float32Array to this worker. The worker performs only
 *   CPU-heavy math: fingerprint hashing and waveform peak extraction.
 *
 * Message protocol (Main → Worker):
 *   { type: 'ANALYZE', id, pcm: Float32Array, sampleRate, duration, fileSize, fileKey }
 *   { type: 'CANCEL',  id }
 *
 * Message protocol (Worker → Main):
 *   { type: 'PROGRESS',  id, progress: 0..1 }
 *   { type: 'COMPLETE',  id, result: TrackAnalysis }
 *   { type: 'ERROR',     id, error: string }
 *   { type: 'CANCELLED', id }
 */

// --- Phase 4.2: Acoustic Musical Key Detection (inlined for worker compatibility) ---
// KeyNotation — note names, Camelot, Open Key mappings
const KEY_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B'];
const KEY_CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A'];
const KEY_OPENKEY_MAJOR = ['1d', '8d', '3d', '10d', '5d', '12d', '7d', '2d', '9d', '4d', '11d', '6d'];
const KEY_OPENKEY_MINOR = ['10m', '5m', '12m', '7m', '2m', '9m', '4m', '11m', '6m', '1m', '8m', '3m'];

function _keyNoteName(rootIndex) {
  return KEY_NOTE_NAMES[((rootIndex % 12) + 12) % 12];
}
function _keyKeyName(rootIndex, mode) {
  return `${_keyNoteName(rootIndex)} ${mode}`;
}
function _keyCamelotCode(rootIndex, mode) {
  const idx = ((rootIndex % 12) + 12) % 12;
  return mode === 'minor' ? KEY_CAMELOT_MINOR[idx] : KEY_CAMELOT_MAJOR[idx];
}
function _keyOpenKeyCode(rootIndex, mode) {
  const idx = ((rootIndex % 12) + 12) % 12;
  return mode === 'minor' ? KEY_OPENKEY_MINOR[idx] : KEY_OPENKEY_MAJOR[idx];
}

// KeyDetector — chroma-based acoustic key detection
const KEY_TARGET_RATE = 11025;
const KEY_FFT_SIZE = 4096;
const KEY_HOP_SIZE = 2048;
const KEY_MIN_FREQ = 55;
const KEY_MAX_FREQ = 2000;
const KEY_MIN_USABLE_ENERGY = 0.001;
const KEY_MIN_USABLE_FRAMES = 10;
const KEY_NUM_REGIONS = 10;
const KEY_MAX_FRAMES_PER_REGION = 30;
const KEY_MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.30, 1.70];
const KEY_MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 1.83];

let _keyHannCache = null;
let _keyBinMapCache = null;

function _keyDownsample(pcm, sourceRate, targetRate) {
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

function _keyFft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
  }
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
        const aReal = real[i + j];
        const aImag = imag[i + j];
        real[i + j] = aReal + tReal;
        imag[i + j] = aImag + tImag;
        real[i + j + half] = aReal - tReal;
        imag[i + j + half] = aImag - tImag;
        const ncReal = cReal * wReal - cImag * wImag;
        const ncImag = cReal * wImag + cImag * wReal;
        cReal = ncReal;
        cImag = ncImag;
      }
    }
  }
}

function _keyGetHannWindow(size) {
  if (_keyHannCache && _keyHannCache.length === size) return _keyHannCache;
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
  _keyHannCache = w;
  return w;
}

function _keyGetBinMapping(fftSize, sampleRate) {
  if (_keyBinMapCache && _keyBinMapCache.fftSize === fftSize && _keyBinMapCache.sampleRate === sampleRate) {
    return _keyBinMapCache.map;
  }
  const map = [];
  for (let k = 1; k < fftSize / 2; k++) {
    const freq = k * sampleRate / fftSize;
    if (freq < KEY_MIN_FREQ || freq > KEY_MAX_FREQ) { map.push(-1); continue; }
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    map.push(pitchClass);
  }
  _keyBinMapCache = { fftSize, sampleRate, map };
  return map;
}

function _keyNormalizeChroma(chroma) {
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-10) return null;
  const result = new Float32Array(12);
  for (let i = 0; i < 12; i++) result[i] = chroma[i] / norm;
  return result;
}

function _keyCosineSimilarity(chroma, profile, rotation) {
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

function _keyScoreCandidates(chroma) {
  const candidates = [];
  for (let root = 0; root < 12; root++) {
    candidates.push({ root, mode: 'major', score: _keyCosineSimilarity(chroma, KEY_MAJOR_PROFILE, root) });
    candidates.push({ root, mode: 'minor', score: _keyCosineSimilarity(chroma, KEY_MINOR_PROFILE, root) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function detectKey(pcm, sampleRate) {
  const maxSamples = 10 * 60 * sampleRate;
  const analysisPcm = pcm.length > maxSamples ? pcm.subarray(0, maxSamples) : pcm;
  const downsampled = _keyDownsample(analysisPcm, sampleRate, KEY_TARGET_RATE);
  if (downsampled.length < KEY_FFT_SIZE) {
    return { key: null, confidence: 0, reason: 'insufficient_harmonic_content',
      diagnostics: { inputPcmLength: pcm.length, inputSampleRate: sampleRate, downsampledLength: downsampled.length, fftSize: KEY_FFT_SIZE, totalFrames: 0, usableFrames: 0 } };
  }
  const hann = _keyGetHannWindow(KEY_FFT_SIZE);
  const binMap = _keyGetBinMapping(KEY_FFT_SIZE, KEY_TARGET_RATE);
  const real = new Float32Array(KEY_FFT_SIZE);
  const imag = new Float32Array(KEY_FFT_SIZE);
  const mags = new Float32Array(binMap.length);
  const totalFrames = Math.floor((downsampled.length - KEY_FFT_SIZE) / KEY_HOP_SIZE) + 1;
  const framesPerRegion = Math.max(1, Math.floor(totalFrames / KEY_NUM_REGIONS));
  const framesToAnalyze = Math.min(framesPerRegion, KEY_MAX_FRAMES_PER_REGION);
  let mappedBins = 0;
  for (let k = 0; k < binMap.length; k++) if (binMap[k] >= 0) mappedBins++;
  const regionalChromas = [];
  let totalUsableFrames = 0;
  let framesProcessed = 0;
  let framesRejectedLowEnergy = 0;
  let minEnergy = Infinity, maxEnergy = 0, sumEnergy = 0;
  let chromaAccumCount = 0;
  let hasNaN = false;
  for (let region = 0; region < KEY_NUM_REGIONS; region++) {
    const regionStart = region * framesPerRegion * KEY_HOP_SIZE;
    const regionEnd = Math.min((region + 1) * framesPerRegion * KEY_HOP_SIZE, downsampled.length);
    if (regionEnd - regionStart < KEY_FFT_SIZE) continue;
    const chroma = new Float32Array(12);
    let usableFrames = 0;
    for (let f = 0; f < framesToAnalyze; f++) {
      const t = framesToAnalyze > 1 ? f / (framesToAnalyze - 1) : 0;
      const frameStart = Math.floor(regionStart + (regionEnd - regionStart - KEY_FFT_SIZE) * t);
      for (let i = 0; i < KEY_FFT_SIZE; i++) {
        const idx = frameStart + i;
        real[i] = idx < downsampled.length ? downsampled[idx] * hann[i] : 0;
        imag[i] = 0;
      }
      _keyFft(real, imag);
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
      framesProcessed++;
      if (isNaN(energy) || !isFinite(energy)) hasNaN = true;
      if (energy < minEnergy) minEnergy = energy;
      if (energy > maxEnergy) maxEnergy = energy;
      sumEnergy += energy;
      if (energy >= KEY_MIN_USABLE_ENERGY) {
        for (let k = 0; k < binMap.length; k++) {
          if (binMap[k] >= 0) chroma[binMap[k]] += mags[k];
        }
        chromaAccumCount++;
        usableFrames++;
        totalUsableFrames++;
      } else {
        framesRejectedLowEnergy++;
      }
    }
    if (usableFrames === 0) continue;
    const normalized = _keyNormalizeChroma(chroma);
    if (!normalized) continue;
    regionalChromas.push({ chroma: normalized, usableFrames });
  }
  if (totalUsableFrames < KEY_MIN_USABLE_FRAMES) {
    return { key: null, confidence: 0, reason: 'insufficient_harmonic_content',
      diagnostics: { inputPcmLength: pcm.length, inputSampleRate: sampleRate, downsampleRatio: sampleRate / KEY_TARGET_RATE, downsampledLength: downsampled.length, targetRate: KEY_TARGET_RATE, fftSize: KEY_FFT_SIZE, hopSize: KEY_HOP_SIZE, totalFrames, framesProcessed, framesUsable: totalUsableFrames, framesRejectedLowEnergy, minEnergy, maxEnergy, meanEnergy: framesProcessed > 0 ? sumEnergy / framesProcessed : 0, binsExamined: binMap.length, mappedBins, chromaAccumCount, numRegions: 0, hasNaN } };
  }
  const aggregateChroma = new Float32Array(12);
  let totalWeight = 0;
  for (const rc of regionalChromas) {
    for (let i = 0; i < 12; i++) aggregateChroma[i] += rc.chroma[i] * rc.usableFrames;
    totalWeight += rc.usableFrames;
  }
  for (let i = 0; i < 12; i++) aggregateChroma[i] /= totalWeight;
  const normalizedAggregate = _keyNormalizeChroma(aggregateChroma);
  if (!normalizedAggregate) {
    return { key: null, confidence: 0, reason: 'insufficient_harmonic_content' };
  }
  const overallCandidates = _keyScoreCandidates(normalizedAggregate);
  const best = overallCandidates[0];
  const second = overallCandidates[1];
  let agreeingRegions = 0;
  for (const rc of regionalChromas) {
    const rcCands = _keyScoreCandidates(rc.chroma);
    if (rcCands[0].root === best.root && rcCands[0].mode === best.mode) agreeingRegions++;
  }
  const regionalConsistency = regionalChromas.length > 0 ? agreeingRegions / regionalChromas.length : 0;
  const scoreMargin = best.score > 0 ? (best.score - second.score) / best.score : 0;
  const usableRatio = Math.min(1, totalUsableFrames / (KEY_NUM_REGIONS * KEY_MAX_FRAMES_PER_REGION));
  const confidence = Math.min(1, scoreMargin * (0.4 + 0.6 * regionalConsistency) * (0.5 + 0.5 * usableRatio));
  const r3 = v => Math.round(v * 1000) / 1000;
  return {
    root: _keyNoteName(best.root),
    rootIndex: best.root,
    mode: best.mode,
    key: _keyKeyName(best.root, best.mode),
    camelot: _keyCamelotCode(best.root, best.mode),
    openKey: _keyOpenKeyCode(best.root, best.mode),
    confidence: r3(confidence),
    alternative: {
      key: _keyKeyName(second.root, second.mode),
      root: _keyNoteName(second.root),
      rootIndex: second.root,
      mode: second.mode,
      camelot: _keyCamelotCode(second.root, second.mode),
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
      inputPcmLength: pcm.length,
      inputSampleRate: sampleRate,
      downsampleRatio: sampleRate / KEY_TARGET_RATE,
      downsampledLength: downsampled.length,
      targetRate: KEY_TARGET_RATE,
      fftSize: KEY_FFT_SIZE,
      hopSize: KEY_HOP_SIZE,
      framesProcessed,
      framesRejectedLowEnergy,
      minEnergy: r3(minEnergy),
      maxEnergy: r3(maxEnergy),
      meanEnergy: r3(framesProcessed > 0 ? sumEnergy / framesProcessed : 0),
      binsExamined: binMap.length,
      mappedBins,
      chromaAccumCount,
      hasNaN,
      rankedCandidates: overallCandidates.slice(0, 5).map(c => ({
        key: _keyKeyName(c.root, c.mode),
        root: _keyNoteName(c.root),
        rootIndex: c.root,
        mode: c.mode,
        score: r3(c.score),
        camelot: _keyCamelotCode(c.root, c.mode),
      })),
    },
  };
}

const ANALYSIS_VERSION = '1.0.0';
// ALGORITHM VERSION 2.2.1 — BPM/OCTAVE RESOLUTION FROZEN.
// Canonical BPM regression set (do not tune thresholds/scoring against these):
//   GenX Hip Hop Anthem      raw 62.777  → 125.555 DOUBLE  (DJ prior + existing BPM)
//   Alannah Myles           raw 67.843  → 67.843  BASE    (acoustic override guard)
//   Gary Moore              raw 161.625 → 161.625 BASE    (HALF wins 3/4, not dominant)
//   Krivo Sadovsko horo     raw 115.563 → 115.563 BASE    (single-candidate path)
//   George Michael – Careless Whisper  raw 76.256 → 76.256 BASE (DOUBLE 152.512 rejected; BASE wins 4/4 acoustic)
const ALGORITHM_VERSION = '2.4.1'; // 2.4.1: FFT butterfly fix in KeyDetector (in-place A overwrite bug). BPM/octave frozen at 2.2.1, beat grid at 2.3.0.
const OVERVIEW_RESOLUTION = 256;
const FINGERPRINT_SEGMENT_MS = 50;
const FINGERPRINT_QUANTIZE = 1000; // quantize amplitudes to reduce encoding sensitivity
const BPM_TARGET_RATE=11025;
const BPM_FRAME_SIZE=1024;
const BPM_HOP_SIZE=256;
const BPM_MIN=60;
const BPM_MAX=200;
const BPM_CONFIDENCE_SCALE=1.5;
const BPM_OCTAVE_TIEBREAK_RATIO=0.92;
const BPM_OCTAVE_AMBIGUITY_PENALTY=0.75;
const BPM_DJ_RANGE_MIN=80;
const BPM_DJ_RANGE_MAX=180;
const BPM_DJ_PRIOR_CENTER=130;
const BPM_DJ_PRIOR_SIGMA=55;
const W_ALIGNMENT=0.25;
const W_AUTOCORR=0.15;
const W_DIST=0.10;
const W_SUPPORT=0.10;
const W_DJ_PRIOR=0.25;
const W_EXISTING=0.15;
const ACOUSTIC_MIN_STRENGTH=0.35;
const ACOUSTIC_WEAK_THRESHOLD=0.32;
const ACOUSTIC_MIN_MARGIN=0.05;
const ACOUSTIC_OVERRIDE_PENALTY=0.85;

const cancelled = new Set();

async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fingerprint = SHA-256(fileSize + quantized PCM from start + middle + end).
 *
 * Three 50ms segments are sampled from the beginning, middle, and near the
 * end of the decoded audio. Amplitudes are quantized (×1000, rounded) to
 * tolerate minor float precision differences across decoders.
 *
 * Filename is deliberately NOT included — renaming the same track produces
 * the same fingerprint, so the existing analysis is found after decode.
 * File size IS included because it's a content property (not a name property)
 * and adds a cheap extra layer of distinction.
 */
async function computeFingerprint(pcm, sampleRate, fileSize) {
  const segmentLength = Math.floor(sampleRate * FINGERPRINT_SEGMENT_MS / 1000);
  const positions = [
    0,
    Math.floor((pcm.length - segmentLength) / 2),
    Math.max(0, pcm.length - segmentLength),
  ];

  const parts = [String(fileSize)];
  for (const pos of positions) {
    let segment = '';
    for (let i = 0; i < segmentLength; i++) {
      const sample = Math.abs(pcm[pos + i] || 0);
      segment += Math.round(sample * FINGERPRINT_QUANTIZE) + ',';
    }
    parts.push(segment);
  }

  const data = new TextEncoder().encode(parts.join('|'));
  return sha256(data);
}

/**
 * Waveform overview: 256 min/max peak pairs from the PCM data.
 * The `resolutions` object allows adding zoom levels later without migration.
 */
function computeWaveformOverview(pcm) {
  const samplesPerPeak = Math.max(1, Math.floor(pcm.length / OVERVIEW_RESOLUTION));
  const peaks = [];

  for (let i = 0; i < OVERVIEW_RESOLUTION; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, pcm.length);
    let min = 0, max = 0;
    for (let j = start; j < end; j++) {
      const s = pcm[j];
      if (s < min) min = s;
      if (s > max) max = s;
    }
    peaks.push({
      min: Math.round(min * 10000) / 10000,
      max: Math.round(max * 10000) / 10000,
    });
  }

  return { resolution: OVERVIEW_RESOLUTION, peaks };
}

// --- BPM Detection (Phase 3) ---
// Onset-based autocorrelation with parabolic interpolation and half/double evaluation.
// Runs entirely in the Worker — no CPU-heavy computation on the main thread.

function downsamplePcm(pcm,sourceRate,targetRate){if(sourceRate<=targetRate)return pcm;const ratio=sourceRate/targetRate,newLength=Math.floor(pcm.length/ratio),result=new Float32Array(newLength);for(let i=0;i<newLength;i++){const start=Math.floor(i*ratio),end=Math.min(Math.floor((i+1)*ratio),pcm.length);let sum=0,count=0;for(let j=start;j<end;j++){sum+=pcm[j];count++;}result[i]=count>0?sum/count:0;}return result;}
function computeEnergyEnvelope(pcm,frameSize,hopSize){const numFrames=Math.max(0,Math.floor((pcm.length-frameSize)/hopSize)+1),energy=new Float32Array(numFrames);for(let i=0;i<numFrames;i++){const start=i*hopSize;let sum=0;for(let j=0;j<frameSize;j++){const s=pcm[start+j];sum+=s*s;}energy[i]=Math.sqrt(sum/frameSize);}return energy;}
function computeOnsets(energy){const onsets=new Float32Array(energy.length);for(let i=1;i<energy.length;i++)onsets[i]=Math.max(0,energy[i]-energy[i-1]);return onsets;}
function computeNormalizedAutocorrelation(onsets,minLag,maxLag){const result=new Float32Array(maxLag-minLag+1);let totalPower=0;for(let i=0;i<onsets.length;i++)totalPower+=onsets[i]*onsets[i];if(totalPower===0)return result;for(let lag=minLag;lag<=maxLag;lag++){let correlation=0,powerA=0,powerB=0;for(let i=lag;i<onsets.length;i++){correlation+=onsets[i]*onsets[i-lag];powerA+=onsets[i]*onsets[i];powerB+=onsets[i-lag]*onsets[i-lag];}const denom=Math.sqrt(powerA*powerB);result[lag-minLag]=denom>0?correlation/denom:0;}return result;}
function parabolicInterpolation(yMinus1,y0,yPlus1){const denom=yMinus1-2*y0+yPlus1;if(Math.abs(denom)<1e-10)return 0;return 0.5*(yMinus1-yPlus1)/denom;}

function djTempoPrior(bpm){const delta=bpm-BPM_DJ_PRIOR_CENTER;return Math.exp(-(delta*delta)/(2*BPM_DJ_PRIOR_SIGMA*BPM_DJ_PRIOR_SIGMA));}
function existingProximity(candidateBpm,existingBpm){if(!existingBpm||existingBpm<=0)return 0.5;return Math.max(0,1-Math.abs(candidateBpm-existingBpm)/existingBpm);}
function computeOnsetAlignmentScore(onsets,beatPeriodFrames){const empty={score:0,energyRatio:0,supportRatio:0,numBeats:0,supportedBeats:0,meanOnsetDist:0,normalizedMeanOnsetDist:1,distScore:0,phaseOffset:0};if(onsets.length<4||beatPeriodFrames<2)return empty;const windowSize=Math.max(1,Math.floor(beatPeriodFrames*0.1));let totalEnergy=0;for(let i=0;i<onsets.length;i++)totalEnergy+=onsets[i];if(totalEnergy===0)return empty;let beatEnergy=0,weightedDist=0,onsetEnergySum=0;for(let i=0;i<onsets.length;i++){if(onsets[i]===0)continue;const phase=i%beatPeriodFrames;const distToBeat=Math.min(phase,beatPeriodFrames-phase);weightedDist+=distToBeat*onsets[i];onsetEnergySum+=onsets[i];if(distToBeat<=windowSize)beatEnergy+=onsets[i];}const energyRatio=beatEnergy/totalEnergy;const meanOnsetDist=onsetEnergySum>0?weightedDist/onsetEnergySum:0;const normalizedMeanOnsetDist=Math.min(1,meanOnsetDist/(beatPeriodFrames*0.5));const distScore=Math.max(0,1-normalizedMeanOnsetDist);const numBeats=Math.floor(onsets.length/beatPeriodFrames);if(numBeats<4)return{score:0,energyRatio,supportRatio:0,numBeats,supportedBeats:0,meanOnsetDist,normalizedMeanOnsetDist,distScore,phaseOffset:0};const numBeatsToCheck=Math.min(numBeats,50);let supportedBeats=0;const avgOnset=totalEnergy/onsets.length,threshold=avgOnset*0.3;for(let beat=0;beat<numBeatsToCheck;beat++){const beatPos=Math.round(beat*beatPeriodFrames);let maxOnset=0;for(let w=-windowSize;w<=windowSize;w++){const idx=beatPos+w;if(idx>=0&&idx<onsets.length)maxOnset=Math.max(maxOnset,onsets[idx]);}if(maxOnset>threshold)supportedBeats++;}const supportRatio=supportedBeats/numBeatsToCheck;return{score:energyRatio*supportRatio,energyRatio,supportRatio,numBeats,supportedBeats,meanOnsetDist,normalizedMeanOnsetDist,distScore,phaseOffset:0};}

function detectBpm(pcm,sampleRate,existingBpm){
 // Limit analysis to first 10 minutes for performance
 const maxSamples=10*60*sampleRate,analysisPcm=pcm.length>maxSamples?pcm.subarray(0,maxSamples):pcm;
 // 1. Downsample to target rate
 const downsampled=downsamplePcm(analysisPcm,sampleRate,BPM_TARGET_RATE);
 // 2. Compute energy envelope
 const energy=computeEnergyEnvelope(downsampled,BPM_FRAME_SIZE,BPM_HOP_SIZE);
 if(energy.length<4)return{value:0,confidence:0};
 // 3. Compute onset detection function
 const onsets=computeOnsets(energy);
 // 4. Compute normalized autocorrelation for wide range (30-400 BPM for half/double eval)
 const frameRate=BPM_TARGET_RATE/BPM_HOP_SIZE;
 const minLag=Math.max(1,Math.floor(60*frameRate/400)),maxLag=Math.ceil(60*frameRate/30);
 const autocorr=computeNormalizedAutocorrelation(onsets,minLag,maxLag);
 // 5. Find local maxima
 const peaks=[];for(let i=1;i<autocorr.length-1;i++){if(autocorr[i]>autocorr[i-1]&&autocorr[i]>=autocorr[i+1]&&autocorr[i]>0)peaks.push({lag:i+minLag,score:autocorr[i],index:i});}
 peaks.sort((a,b)=>b.score-a.score);
 if(!peaks.length)return{value:0,confidence:0};
 // 6. Best candidate in 60-200 BPM range
 const bpmMinLag=Math.floor(60*frameRate/BPM_MAX),bpmMaxLag=Math.ceil(60*frameRate/BPM_MIN);
 const inRange=peaks.filter(p=>p.lag>=bpmMinLag&&p.lag<=bpmMaxLag);
 if(!inRange.length)return{value:0,confidence:0};
 const best=inRange[0];
 // 7. Parabolic interpolation for sub-lag precision
 let refinedLag=best.lag;
 if(best.index>0&&best.index<autocorr.length-1){const offset=parabolicInterpolation(autocorr[best.index-1],autocorr[best.index],autocorr[best.index+1]);refinedLag=best.lag+offset;}
 const bestBpm=60*frameRate/refinedLag;
 // 8. Generate octave candidates: base, half (base/2), double (base*2)
 const baseBpm=bestBpm;
 const halfBpm=baseBpm/2,doubleBpm=baseBpm*2;
 const baseDiag=computeOnsetAlignmentScore(onsets,refinedLag);
 const halfDiag=halfBpm>=BPM_MIN&&halfBpm<=BPM_MAX?computeOnsetAlignmentScore(onsets,refinedLag*2):null;
 const doubleDiag=doubleBpm>=BPM_MIN&&doubleBpm<=BPM_MAX?computeOnsetAlignmentScore(onsets,refinedLag/2):null;
 const halfLagIdx=Math.round(refinedLag*2)-minLag,halfAutocorr=halfLagIdx>=0&&halfLagIdx<autocorr.length?autocorr[halfLagIdx]:0;
 const doubleLagIdx=Math.round(refinedLag/2)-minLag,doubleAutocorr=doubleLagIdx>=0&&doubleLagIdx<autocorr.length?autocorr[doubleLagIdx]:0;
 const candidates=[];
 candidates.push({bpm:baseBpm,type:'BASE',alignment:baseDiag.score,diag:baseDiag,autocorr:best.score});
 if(halfDiag)candidates.push({bpm:halfBpm,type:'HALF',alignment:halfDiag.score,diag:halfDiag,autocorr:halfAutocorr});
 if(doubleDiag)candidates.push({bpm:doubleBpm,type:'DOUBLE',alignment:doubleDiag.score,diag:doubleDiag,autocorr:doubleAutocorr});
 // 9. Canonical DJ tempo resolution: composite score from multiple weak signals
 for(const c of candidates){
  const djPrior=djTempoPrior(c.bpm);
  const exProx=existingProximity(c.bpm,existingBpm);
  c.djPrior=djPrior;
  c.existingProximity=exProx;
  c.acousticStrength=(c.alignment+c.diag.energyRatio+c.diag.supportRatio)/3;
  c.contextContribution=W_DJ_PRIOR*djPrior+W_EXISTING*exProx;
  c.compositeScore=W_ALIGNMENT*c.alignment+W_AUTOCORR*c.autocorr+W_DIST*c.diag.distScore+W_SUPPORT*c.diag.supportRatio+W_DJ_PRIOR*djPrior+W_EXISTING*exProx;
 }
 candidates.sort((a,b)=>b.compositeScore-a.compositeScore);
 const compositeWinner=candidates[0];
 const second=candidates[1];
 let octaveAmbiguous=false;
 if(second&&second.compositeScore>compositeWinner.compositeScore*0.95)octaveAmbiguous=true;
 // 9b. Acoustic dominance guard — contextual signals cannot override strong acoustic evidence
 let winner=compositeWinner;
 let overrideApplied=false;
 let overrideReason='';
 let acousticDominantCandidate=null;
 if(candidates.length>1){
  let maxChallengerWins=0;
  for(const c of candidates){
   if(c===compositeWinner)continue;
   const wA=c.alignment>compositeWinner.alignment?1:0;
   const wC=c.autocorr>compositeWinner.autocorr?1:0;
   const wE=c.diag.energyRatio>compositeWinner.diag.energyRatio?1:0;
   const wS=c.diag.supportRatio>compositeWinner.diag.supportRatio?1:0;
   c.acousticWins=(wA?1:0)+(wC?1:0)+(wE?1:0)+(wS?1:0);
   if(c.acousticWins>maxChallengerWins)maxChallengerWins=c.acousticWins;
   if(c.acousticWins>=4&&c.acousticStrength>ACOUSTIC_MIN_STRENGTH&&compositeWinner.acousticStrength<ACOUSTIC_WEAK_THRESHOLD&&(c.acousticStrength-compositeWinner.acousticStrength)>ACOUSTIC_MIN_MARGIN){
    acousticDominantCandidate=c;
    overrideApplied=true;
    overrideReason='acoustic dominance guard';
    winner=c;
   }
  }
  compositeWinner.acousticWins=4-maxChallengerWins;
 }
 // 10. Confidence: periodicity × octave
 const periodicityConfidence=Math.min(1,best.score*BPM_CONFIDENCE_SCALE);
 let octaveConfidence,octaveConfidenceBeforePenalty;
 if(candidates.length===1){octaveConfidence=1;octaveConfidenceBeforePenalty=1;}
 else{
  if(overrideApplied){octaveConfidenceBeforePenalty=Math.min(1,winner.acousticStrength*2);octaveConfidence=octaveConfidenceBeforePenalty*ACOUSTIC_OVERRIDE_PENALTY;if(octaveAmbiguous)octaveConfidence*=BPM_OCTAVE_AMBIGUITY_PENALTY;}
  else{octaveConfidenceBeforePenalty=Math.min(1,winner.compositeScore*2);octaveConfidence=octaveConfidenceBeforePenalty;if(octaveAmbiguous)octaveConfidence*=BPM_OCTAVE_AMBIGUITY_PENALTY;}
 }
 const finalConfidence=periodicityConfidence*octaveConfidence;
 const r3=v=>Math.round(v*1000)/1000;
 return{
  value:r3(winner.bpm),confidence:r3(finalConfidence),
  rawBpm:r3(baseBpm),rawValue:r3(baseBpm),canonicalBpm:r3(winner.bpm),
  halfCandidate:halfBpm>=BPM_MIN&&halfBpm<=BPM_MAX?r3(halfBpm):null,
  baseCandidate:r3(baseBpm),
  doubleCandidate:doubleBpm>=BPM_MIN&&doubleBpm<=BPM_MAX?r3(doubleBpm):null,
  periodicityConfidence:r3(periodicityConfidence),
  octaveConfidence:r3(octaveConfidence),
  octaveConfidenceBeforePenalty:r3(octaveConfidenceBeforePenalty),
  octaveDecision:winner.type,
  octaveAmbiguous,
  compositeWinnerType:compositeWinner.type,
  finalWinnerType:winner.type,
  overrideApplied,
  overrideReason,
  acousticDominantType:acousticDominantCandidate?acousticDominantCandidate.type:null,
  contextInfluence:r3(compositeWinner.contextContribution),
  candidateScores:candidates.map(c=>({type:c.type,bpm:r3(c.bpm),alignment:r3(c.alignment),autocorr:r3(c.autocorr),energyRatio:r3(c.diag.energyRatio),supportRatio:r3(c.diag.supportRatio),numBeats:c.diag.numBeats,supportedBeats:c.diag.supportedBeats,meanOnsetDist:r3(c.diag.meanOnsetDist),normalizedMeanOnsetDist:r3(c.diag.normalizedMeanOnsetDist),distScore:r3(c.diag.distScore),djPrior:r3(c.djPrior),existingProximity:r3(c.existingProximity),compositeScore:r3(c.compositeScore),acousticStrength:r3(c.acousticStrength),acousticWins:c.acousticWins||0,contextContribution:r3(c.contextContribution),phaseOffset:r3(c.diag.phaseOffset)})),
  _onsets:onsets,_frameRate:frameRate,
 };
}

// --- Beat-Grid Anchoring (Phase 4.1) ---
// Pure consumer of the frozen canonical BPM. Does NOT modify any BPM-scoring variable.
// Uses fractional beat period (no round()) and linear interpolation for onset sampling.
function computeBeatGrid(onsets,frameRate,canonicalBpm,duration){
 const empty={firstBeat:0,beatInterval:0,totalBeats:0,downbeat:null,downbeatConfidence:0,confidence:0,anchors:[]};
 if(!canonicalBpm||canonicalBpm<=0||onsets.length<4)return empty;
 const beatInterval=60/canonicalBpm;
 const beatPeriodFrames=frameRate*beatInterval; // FLOATING POINT — no round()
 const totalFrames=onsets.length;
 const sample=pos=>{if(pos<0||pos>=totalFrames-1)return 0;const i0=Math.floor(pos),frac=pos-i0;return onsets[i0]*(1-frac)+onsets[i0+1]*frac;};
 const scorePhase=phi=>{let score=0;for(let n=0;;n++){const pos=phi+n*beatPeriodFrames;if(pos>=totalFrames)break;let mx=0;for(let w=-1;w<=1;w++){const e=sample(pos+w);if(e>mx)mx=e;}score+=mx;}return score;};
 const phaseStep=0.1;
 let bestPhi=0,bestScore=0,sumScores=0,numScores=0;
 for(let phi=0;phi<beatPeriodFrames;phi+=phaseStep){const s=scorePhase(phi);if(s>bestScore){bestScore=s;bestPhi=phi;}sumScores+=s;numScores++;}
 if(numScores===0||bestScore===0)return empty;
 const sM=scorePhase(bestPhi-phaseStep),s0=bestScore,sP=scorePhase(bestPhi+phaseStep),denom=sM-2*s0+sP;
 let refinedPhi=bestPhi;
 if(Math.abs(denom)>1e-10)refinedPhi=bestPhi+0.5*(sM-sP)/denom*phaseStep;
 const firstBeat=refinedPhi/frameRate;
 const totalBeats=Math.floor((duration-firstBeat)/beatInterval)+1;
 if(totalBeats<4)return{firstBeat:Math.round(firstBeat*1000)/1000,beatInterval:Math.round(beatInterval*1000)/1000,totalBeats,downbeat:null,downbeatConfidence:0,confidence:0,anchors:[]};
 const meanScore=sumScores/numScores;
 const phaseConfidence=meanScore>0?Math.min(1,(bestScore-meanScore)/meanScore):0;
 let downbeat=null,downbeatConfidence=0;
 const numBars=Math.min(8,Math.floor(totalBeats/4));
 if(numBars>=2){
  const be=[0,0,0,0];
  for(let bar=0;bar<numBars;bar++)for(let bi=0;bi<4;bi++){const pos=refinedPhi+(bar*4+bi)*beatPeriodFrames;if(pos>=totalFrames)break;let mx=0;for(let w=-1;w<=1;w++){const e=sample(pos+w);if(e>mx)mx=e;}be[bi]+=mx;}
  let mi=0;for(let i=1;i<4;i++)if(be[i]>be[mi])mi=i;
  const tot=be[0]+be[1]+be[2]+be[3],other=(tot-be[mi])/3;
  if(tot>0&&other>0){downbeatConfidence=(be[mi]-other)/be[mi];if(downbeatConfidence>=0.25)downbeat=mi;}
 }
 return{firstBeat:Math.round(firstBeat*1000)/1000,beatInterval:Math.round(beatInterval*1000)/1000,totalBeats,downbeat,downbeatConfidence:Math.round(downbeatConfidence*1000)/1000,confidence:Math.round(phaseConfidence*1000)/1000,anchors:[]};
}

self.onmessage = async (event) => {
  const { type, id } = event.data;

  if (type === 'CANCEL') {
    cancelled.add(id);
    self.postMessage({ type: 'CANCELLED', id });
    return;
  }

  if (type !== 'ANALYZE') return;

  const { pcm, sampleRate, duration, fileSize, existingBpm = 0 } = event.data;

  try {
    self.postMessage({ type: 'PROGRESS', id, progress: 0.1 });

    // Fingerprint (CPU-heavy: iterates 3 segments × 50ms of samples + SHA-256)
    const trackFingerprint = await computeFingerprint(pcm, sampleRate, fileSize);
    if (cancelled.has(id)) { self.postMessage({ type: 'CANCELLED', id }); return; }

    self.postMessage({ type: 'PROGRESS', id, progress: 0.5 });

    // Waveform overview (CPU-heavy: iterates entire PCM once)
    const overview = computeWaveformOverview(pcm);
    if (cancelled.has(id)) { self.postMessage({ type: 'CANCELLED', id }); return; }

    self.postMessage({ type: 'PROGRESS', id, progress: 0.7 });

    // BPM detection (Phase 3: onset-based autocorrelation with half/double evaluation)
    const bpmResult = detectBpm(pcm, sampleRate, existingBpm);
    const beatGrid = computeBeatGrid(bpmResult._onsets, bpmResult._frameRate, bpmResult.value, duration);
    if (cancelled.has(id)) { self.postMessage({ type: 'CANCELLED', id }); return; }

    self.postMessage({ type: 'PROGRESS', id, progress: 0.9 });

    // Key detection (Phase 4.2) — acoustic only, no metadata influence
    const keyResult = detectKey(pcm, sampleRate);
    if (cancelled.has(id)) { self.postMessage({ type: 'CANCELLED', id }); return; }

    self.postMessage({ type: 'PROGRESS', id, progress: 0.95 });

    const analysis = {
      analysisVersion: ANALYSIS_VERSION,
      algorithmVersion: ALGORITHM_VERSION,
      trackFingerprint,
      duration: Math.round(duration * 1000) / 1000,
      waveform: {
        resolutions: {
          overview,
          // Future: zoom_1, zoom_2, etc. — no schema migration needed
        },
      },
      bpm: { value: bpmResult.value, confidence: bpmResult.confidence, rawBpm: bpmResult.rawBpm, rawValue: bpmResult.rawValue, canonicalBpm: bpmResult.canonicalBpm, halfCandidate: bpmResult.halfCandidate, baseCandidate: bpmResult.baseCandidate, doubleCandidate: bpmResult.doubleCandidate, periodicityConfidence: bpmResult.periodicityConfidence, octaveConfidence: bpmResult.octaveConfidence, octaveConfidenceBeforePenalty: bpmResult.octaveConfidenceBeforePenalty, octaveDecision: bpmResult.octaveDecision, octaveAmbiguous: bpmResult.octaveAmbiguous, compositeWinnerType: bpmResult.compositeWinnerType, finalWinnerType: bpmResult.finalWinnerType, overrideApplied: bpmResult.overrideApplied, overrideReason: bpmResult.overrideReason, acousticDominantType: bpmResult.acousticDominantType, contextInfluence: bpmResult.contextInfluence, candidateScores: bpmResult.candidateScores },
      beatGrid,
      keyAnalysis: keyResult,
      state: {
        status: 'ready',
        analyzedAt: new Date().toISOString(),
        error: null,
      },
    };

    self.postMessage({ type: 'PROGRESS', id, progress: 1 });
    self.postMessage({ type: 'COMPLETE', id, result: analysis });
  } catch (error) {
    if (cancelled.has(id)) { self.postMessage({ type: 'CANCELLED', id }); return; }
    self.postMessage({
      type: 'ERROR',
      id,
      error: error.message || 'Analysis failed',
    });
  } finally {
    cancelled.delete(id);
  }
};

// Worker startup handshake — sent after all code is loaded and initialized
self.postMessage({ type: 'worker-ready', algorithmVersion: ALGORITHM_VERSION });