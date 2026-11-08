// Isolated diagnostic math & simulation models for Channel Faders (Ch A / Ch B)
// Linear MiXXX & Pioneer DDJ-200 architecture:
// 1. Hardware physical slider position (0 = bottom / mute, 10 = top / max)
// 2. MIDI 7-bit CC raw input (0..127) and normalized (0..1)
// 3. UI slider visual position (0 = top / 10, 1 = bottom / 0 in DOM / VerticalSlider)
// 4. Stored linear volume (0.0 .. 1.0) and dB (-60 dB to 0 dB / unity)

import { gainToDb, dbToGain } from './audioMath';

export const FADER_MIN_DB = -60;
export const FADER_MAX_DB = 0;

/**
 * Maps physical position 0..10 to normalized position (0 = bottom, 1 = top)
 */
export const physicalToNorm = pos10 => {
  const clamped = Math.max(0, Math.min(10, Number(pos10) || 0));
  return clamped / 10;
};

/**
 * Maps normalized position (0 = bottom, 1 = top) to physical 0..10
 */
export const normToPhysical = norm => {
  const clamped = Math.max(0, Math.min(1, Number(norm) || 0));
  return clamped * 10;
};

/**
 * UI DOM slider pos:
 * 0 = top (10 on scale)
 * 1 = bottom (0 on scale)
 */
export const uiPosToPhysical = uiPos => {
  const clamped = Math.max(0, Math.min(1, Number(uiPos) || 0));
  return (1 - clamped) * 10;
};

export const physicalToUiPos = phys10 => {
  const clamped = Math.max(0, Math.min(10, Number(phys10) || 0));
  return 1 - clamped / 10;
};

/**
 * Linear volume to dB
 */
export const volToDb = vol => {
  const clamped = Math.max(0, Math.min(1, Number(vol) || 0));
  return clamped > 0 ? gainToDb(clamped) : -60;
};

/**
 * Evaluates full state for a given physical position (0..10)
 */
export const evaluatePhysicalPoint = phys10 => {
  const physical = Math.max(0, Math.min(10, Number(phys10) || 0));
  const norm = physical / 10; // 0..1 linear
  const midiCc = Math.round(norm * 127);
  const uiPos = 1 - norm; // 0=top, 1=bottom
  const volume = norm;
  const db = volToDb(volume);

  return {
    physical: Number(physical.toFixed(2)),
    norm: Number(norm.toFixed(4)),
    midiCc,
    uiPos: Number(uiPos.toFixed(4)),
    volume: Number(volume.toFixed(4)),
    db: Number(db.toFixed(1)),
    gain: Number(volume.toFixed(4))
  };
};

/**
 * Evaluates full state from raw MIDI input (0..127)
 */
export const evaluateMidiPoint = rawMidiCc => {
  const cc = Math.max(0, Math.min(127, Math.round(Number(rawMidiCc) || 0)));
  const norm = cc / 127;
  const physical = norm * 10;
  const uiPos = 1 - norm;
  const volume = norm;
  const db = volToDb(volume);

  return {
    physical: Number(physical.toFixed(2)),
    norm: Number(norm.toFixed(4)),
    midiCc: cc,
    uiPos: Number(uiPos.toFixed(4)),
    volume: Number(volume.toFixed(4)),
    db: Number(db.toFixed(1)),
    gain: Number(volume.toFixed(4))
  };
};

/**
 * Test cases for linear 0..10 scale matching MiXXX
 */
export const TEST_CASES = [
  {
    id: 'tc-bottom',
    name: 'TC-1: Долен край (Mute / 0)',
    description: 'Позиция 0 съответства на MIDI 0, пълно изключване (volume = 0, gain = 0, -60 dB).',
    inputPhysical: 0,
    expectedMidi: 0,
    expectedVol: 0.0,
    expectedGain: 0.0,
    tolerance: 0.01
  },
  {
    id: 'tc-quarter',
    name: 'TC-2: Четвърт ход (2.5 / 10)',
    description: 'Линейно 25% ход: съответства на 25% MIDI CC (32) и 0.25 линейна сила.',
    inputPhysical: 2.5,
    expectedMidi: 32,
    expectedVol: 0.25,
    expectedGain: 0.25,
    tolerance: 1.5
  },
  {
    id: 'tc-mid',
    name: 'TC-3: Средна точка (5.0 / 10)',
    description: 'Физическата среда отговаря точно на 50% MIDI CC (64) и 0.50 линейна сила (-6 dB).',
    inputPhysical: 5.0,
    expectedMidi: 64,
    expectedVol: 0.50,
    expectedGain: 0.50,
    tolerance: 1.5
  },
  {
    id: 'tc-three-quarter',
    name: 'TC-4: Три четвърти ход (7.5 / 10)',
    description: 'Позиция 7.5 съответства на 75% MIDI CC (95) и 0.75 линейна сила.',
    inputPhysical: 7.5,
    expectedMidi: 95,
    expectedVol: 0.75,
    expectedGain: 0.75,
    tolerance: 1.5
  },
  {
    id: 'tc-top',
    name: 'TC-5: Горен край (Max / 10)',
    description: 'Максимална позиция 10 = MIDI 127 и 1.0 максимална линейна сила (0 dB).',
    inputPhysical: 10,
    expectedMidi: 127,
    expectedVol: 1.0,
    expectedGain: 1.0,
    tolerance: 0.05
  }
];

export const analyzeSequenceMonotonicity = sequence => {
  const anomalies = [];
  for (let i = 1; i < sequence.length; i++) {
    const prev = sequence[i - 1];
    const curr = sequence[i];
    const delta = curr.physical - prev.physical;
    if (Math.abs(delta) > 3.0) {
      anomalies.push({
        index: i,
        type: 'jump',
        message: `Рязък скок от ${prev.physical} към ${curr.physical} (Δ = ${delta.toFixed(2)})`
      });
    }
    if (sequence.direction === 'up' && delta < -0.1) {
      anomalies.push({
        index: i,
        type: 'inversion',
        message: `Връщане назад при движение нагоре: от ${prev.physical} към ${curr.physical}`
      });
    } else if (sequence.direction === 'down' && delta > 0.1) {
      anomalies.push({
        index: i,
        type: 'inversion',
        message: `Подскачане нагоре при движение надолу: от ${prev.physical} към ${curr.physical}`
      });
    }
  }
  return anomalies;
};