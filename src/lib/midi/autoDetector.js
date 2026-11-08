/**
 * autoDetector.js
 * Intelligent automatic detection and heuristic analysis of MIDI controller signals for unknown DJ consoles.
 * Analyzes physical control characteristics (faders, knobs, buttons, jog wheels, touch sensors),
 * infers likely CrossCue actions with confidence levels, and formats them into reusable profiles.
 */

import { ACTION_MAP, ALL_ACTIONS } from './actions';
import { createProfile, createEntry } from './mappingProfile';

export class AutoDetector {
  constructor() {
    this.controls = new Map(); // key -> DetectedControl
    this.deviceInfo = { id: '*', name: 'Unknown Controller', manufacturer: '' };
    this.active = false;
    this.listeners = new Set();
    this.lastActiveId = null;
    this.deckChannels = { A: 1, B: 2 }; // Default inferred channels
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const list = this.getControls();
    this.listeners.forEach(cb => cb(list, this.deviceInfo, this.lastActiveId));
  }

  start() {
    this.active = true;
    this.notify();
  }

  stop() {
    this.active = false;
    this.notify();
  }

  reset() {
    this.controls.clear();
    this.lastActiveId = null;
    this.notify();
  }

  getControls() {
    return Array.from(this.controls.values()).sort((a, b) => b.lastActive - a.lastActive);
  }

  /**
   * Process an incoming MIDI message during auto-detection scan.
   */
  processMessage(message) {
    if (!this.active || !message) return null;

    if (message.device && (!this.deviceInfo.name || this.deviceInfo.name === 'Unknown Controller')) {
      this.deviceInfo = {
        id: message.device.id || '*',
        name: message.device.name || 'Unknown Controller',
        manufacturer: message.device.manufacturer || ''
      };
    }

    const channel = message.channel || 1;
    const type = message.type; // 'cc', 'noteon', 'noteoff'
    const number = message.number;
    const value = message.value;
    const now = performance.now();

    // Unique control key: channel + type + number
    // Noteon and Noteoff for the same note belong to the SAME physical button
    const normalizedType = (type === 'noteon' || type === 'noteoff') ? 'note' : 'cc';
    const key = `${channel}:${normalizedType}:${number}`;

    let ctrl = this.controls.get(key);

    if (!ctrl) {
      ctrl = {
        id: key,
        channel,
        type: normalizedType === 'note' ? 'noteon' : 'cc',
        rawType: type,
        number,
        deviceName: message.device?.name || this.deviceInfo.name,
        manufacturer: message.device?.manufacturer || this.deviceInfo.manufacturer,
        firstSeen: now,
        lastActive: now,
        messageCount: 0,
        values: [value],
        minValue: value,
        maxValue: value,
        currentValue: value,
        kind: 'unknown', // 'fader', 'knob', 'button', 'jog_wheel', 'jog_touch', 'pad'
        isRelative: false,
        deck: channel === 2 ? 'B' : 'A',
        suggestedTarget: '',
        confidence: 'low', // 'high', 'medium', 'low'
        confidenceReason: '',
        confirmedTarget: null, // set when user approves or changes
        mode: 'toggle',
        controlType: 'button'
      };
      this.controls.set(key, ctrl);
    }

    // Update telemetry
    ctrl.lastActive = now;
    ctrl.messageCount++;
    ctrl.currentValue = value;
    ctrl.minValue = Math.min(ctrl.minValue, value);
    ctrl.maxValue = Math.max(ctrl.maxValue, value);
    if (ctrl.values.length < 30) ctrl.values.push(value);
    else { ctrl.values.shift(); ctrl.values.push(value); }

    this.lastActiveId = ctrl.id;

    // Detect characteristics
    this.classifyControl(ctrl, message);

    // Heuristic target suggestion
    if (!ctrl.confirmedTarget) {
      this.inferTarget(ctrl);
    }

    this.notify();
    return ctrl;
  }

  /**
   * Classify whether the control is a button, fader, knob, jog wheel, or jog touch sensor.
   */
  classifyControl(ctrl, message) {
    const { channel, type, number, value, minValue, maxValue, messageCount, values } = ctrl;

    // 1. Jog Touch sensor: Note 54 is industry standard on Pioneer/DDJ, or notes triggered with fast on/off
    if (type === 'noteon') {
      if (number === 54 || number === 53) {
        ctrl.kind = 'jog_touch';
        ctrl.controlType = 'button';
        ctrl.mode = 'momentary';
        return;
      }

      // Check if it's a performance pad (groups of 8 or 4)
      if ((number >= 0 && number <= 7) || (number >= 11 && number <= 18) || (number >= 96 && number <= 103)) {
        ctrl.kind = 'pad';
        ctrl.controlType = 'button';
        ctrl.mode = 'trigger';
        return;
      }

      // General button
      ctrl.kind = 'button';
      ctrl.controlType = 'button';
      ctrl.mode = 'toggle';
      return;
    }

    // 2. Continuous controls (CC)
    if (type === 'cc') {
      // Check for Jog Wheel rotation:
      // Known jog numbers (33, 34, 35, 36) OR relative centered 64-values (63, 65, 62, 66...)
      const isKnownJogNumber = number === 33 || number === 34 || number === 35 || number === 36;
      const isRelativeCentered = values.some(v => v === 64 || v === 65 || v === 63) && minValue >= 40 && maxValue <= 88;
      const isSmallStepDelta = values.every(v => v <= 10 || v >= 118);

      if (isKnownJogNumber || isRelativeCentered || isSmallStepDelta) {
        ctrl.kind = 'jog_wheel';
        ctrl.isRelative = true;
        ctrl.controlType = 'jog';
        ctrl.mode = 'continuous';
        return;
      }

      // Wide range: fader (long continuous sweep reaching 0 and 127)
      const range = maxValue - minValue;
      if (range >= 100 && (minValue <= 5 && maxValue >= 120)) {
        // Known crossfader CCs: 8, 10, 64, or explicit middle fader
        if (number === 8 || number === 10 || number === 64) {
          ctrl.kind = 'fader';
          ctrl.controlType = 'fader';
          ctrl.mode = 'continuous';
          return;
        }

        // Channel faders (typically 19, 28, 51)
        if (number === 19 || number === 28 || number === 51) {
          ctrl.kind = 'fader';
          ctrl.controlType = 'fader';
          ctrl.mode = 'continuous';
          return;
        }

        // Tempo / Pitch slider (typically 0, 16, 32)
        if (number === 0 || number === 16 || number === 32) {
          ctrl.kind = 'fader';
          ctrl.controlType = 'pitch';
          ctrl.mode = 'continuous';
          return;
        }

        ctrl.kind = 'fader';
        ctrl.controlType = 'fader';
        ctrl.mode = 'continuous';
        return;
      }

      // Rotary knob / EQ
      ctrl.kind = 'knob';
      ctrl.controlType = 'knob';
      ctrl.mode = 'continuous';
    }
  }

  /**
   * Infer likely CrossCue action target based on control role and hardware layout patterns.
   */
  inferTarget(ctrl) {
    const deck = ctrl.channel === 2 ? 'B' : 'A';
    ctrl.deck = deck;

    // 1. JOG WHEEL
    if (ctrl.kind === 'jog_wheel') {
      ctrl.suggestedTarget = `JOG ${deck}`;
      ctrl.confidence = 'high';
      ctrl.confidenceReason = `Разпознато относително въртене на платер за Дек ${deck}`;
      ctrl.controlType = 'jog';
      ctrl.mode = 'continuous';
      return;
    }

    // 2. JOG TOUCH SENSOR
    if (ctrl.kind === 'jog_touch') {
      ctrl.suggestedTarget = `JOG TOUCH ${deck}`;
      ctrl.confidence = 'high';
      ctrl.confidenceReason = `Сензор за докосване на платера за Дек ${deck} (Note #${ctrl.number})`;
      ctrl.controlType = 'button';
      ctrl.mode = 'momentary';
      return;
    }

    // 3. FADERS
    if (ctrl.kind === 'fader') {
      // Crossfader check: if on global channel or number 8/10/64
      if (ctrl.number === 8 || ctrl.number === 10 || ctrl.number === 64) {
        ctrl.suggestedTarget = 'CROSSFADER';
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `Типичен кросфейдър CC #${ctrl.number}`;
        ctrl.controlType = 'fader';
        ctrl.mode = 'continuous';
        return;
      }

      // Check existing faders on this deck to avoid duplicates
      const deckFaders = Array.from(this.controls.values()).filter(
        c => c.deck === deck && c.kind === 'fader' && c.id !== ctrl.id
      );

      if (ctrl.number === 32 || ctrl.controlType === 'pitch') {
        ctrl.suggestedTarget = `PITCH ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `Плъзгач за темпо / пич за Дек ${deck} (CC #${ctrl.number})`;
        ctrl.controlType = 'pitch';
        ctrl.mode = 'continuous';
        return;
      }

      if (ctrl.number === 19 || ctrl.number === 51 || deckFaders.length === 0) {
        ctrl.suggestedTarget = `CHANNEL FADER ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `Основен канал фейдър за Дек ${deck}`;
        ctrl.controlType = 'fader';
        ctrl.mode = 'continuous';
        return;
      }

      // If already has Channel Fader, suggest Pitch
      ctrl.suggestedTarget = `PITCH ${deck}`;
      ctrl.confidence = 'medium';
      ctrl.confidenceReason = `Допълнителен вертикален плъзгач за Дек ${deck}`;
      ctrl.controlType = 'pitch';
      ctrl.mode = 'continuous';
      return;
    }

    // 4. KNOBS & POTS (EQ, GAIN, FILTER, MASTER)
    if (ctrl.kind === 'knob') {
      // Master / Cue on global channels
      if (ctrl.channel >= 3 || ctrl.number === 7 || ctrl.number === 9) {
        if (ctrl.number === 7) {
          ctrl.suggestedTarget = 'MASTER';
          ctrl.confidence = 'high';
          ctrl.confidenceReason = 'Master обща сила на звука (CC #7)';
          ctrl.controlType = 'fader';
          ctrl.mode = 'continuous';
          return;
        }
        if (ctrl.number === 9) {
          ctrl.suggestedTarget = 'HEADPHONES';
          ctrl.confidence = 'high';
          ctrl.confidenceReason = 'Слушалки сила на звука';
          ctrl.controlType = 'fader';
          ctrl.mode = 'continuous';
          return;
        }
      }

      // Find how many knobs this deck already has
      const deckKnobs = Array.from(this.controls.values()).filter(
        c => c.deck === deck && c.kind === 'knob' && c.id !== ctrl.id
      );

      const assignedTargets = new Set(deckKnobs.map(c => c.confirmedTarget || c.suggestedTarget));

      if (!assignedTargets.has(`HIGH ${deck}`)) {
        ctrl.suggestedTarget = `HIGH ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `EQ Високи (High) за Дек ${deck}`;
      } else if (!assignedTargets.has(`MID ${deck}`)) {
        ctrl.suggestedTarget = `MID ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `EQ Средни (Mid) за Дек ${deck}`;
      } else if (!assignedTargets.has(`LOW ${deck}`)) {
        ctrl.suggestedTarget = `LOW ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `EQ Ниски (Bass/Low) за Дек ${deck}`;
      } else if (!assignedTargets.has(`FILTER ${deck}`)) {
        ctrl.suggestedTarget = `FILTER ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `Филтър (HPF/LPF) за Дек ${deck}`;
      } else if (!assignedTargets.has(`GAIN ${deck}`)) {
        ctrl.suggestedTarget = `GAIN ${deck}`;
        ctrl.confidence = 'medium';
        ctrl.confidenceReason = `Gain предусилване за Дек ${deck}`;
      } else {
        ctrl.suggestedTarget = 'CUE / MASTER MIX';
        ctrl.confidence = 'low';
        ctrl.confidenceReason = 'Допълнителен потенциометър';
      }
      ctrl.controlType = 'knob';
      ctrl.mode = 'continuous';
      return;
    }

    // 5. BUTTONS & PADS
    if (ctrl.kind === 'pad') {
      const padIndex = (ctrl.number % 8) + 1;
      ctrl.suggestedTarget = `SAMPLER ${deck} PAD ${padIndex}`;
      ctrl.confidence = 'high';
      ctrl.confidenceReason = `Пад ${padIndex} за семплер на Дек ${deck}`;
      ctrl.controlType = 'button';
      ctrl.mode = 'trigger';
      return;
    }

    if (ctrl.kind === 'button') {
      const deckButtons = Array.from(this.controls.values()).filter(
        c => c.deck === deck && c.kind === 'button' && c.id !== ctrl.id
      );
      const assigned = new Set(deckButtons.map(c => c.confirmedTarget || c.suggestedTarget));

      // Sequential typical DJ layout: PLAY, CUE, SYNC, LOOP, VINYL
      if (!assigned.has(`PLAY ${deck}`)) {
        ctrl.suggestedTarget = `PLAY ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `Play/Pause бутон за Дек ${deck}`;
        ctrl.mode = 'toggle';
      } else if (!assigned.has(`CUE ${deck}`)) {
        ctrl.suggestedTarget = `CUE ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `Cue бутон за Дек ${deck}`;
        ctrl.mode = 'momentary';
      } else if (!assigned.has(`SYNC ${deck}`)) {
        ctrl.suggestedTarget = `SYNC ${deck}`;
        ctrl.confidence = 'high';
        ctrl.confidenceReason = `BPM Синхронизация за Дек ${deck}`;
        ctrl.mode = 'trigger';
      } else if (!assigned.has(`LOOP ${deck}`)) {
        ctrl.suggestedTarget = `LOOP ${deck}`;
        ctrl.confidence = 'medium';
        ctrl.confidenceReason = `Loop бутон за Дек ${deck}`;
        ctrl.mode = 'toggle';
      } else if (!assigned.has(`LOAD ${deck}`)) {
        ctrl.suggestedTarget = `LOAD ${deck}`;
        ctrl.confidence = 'medium';
        ctrl.confidenceReason = `Зареждане на трак за Дек ${deck}`;
        ctrl.mode = 'trigger';
      } else if (!assigned.has(`VINYL ${deck}`)) {
        ctrl.suggestedTarget = `VINYL ${deck}`;
        ctrl.confidence = 'medium';
        ctrl.confidenceReason = `Винил режим за Дек ${deck}`;
        ctrl.mode = 'toggle';
      } else {
        ctrl.suggestedTarget = `CUE 1 ${deck}`;
        ctrl.confidence = 'low';
        ctrl.confidenceReason = `Hot Cue за Дек ${deck}`;
        ctrl.mode = 'trigger';
      }
      ctrl.controlType = 'button';
    }
  }

  /**
   * Confirm or change target assignment for a control.
   */
  setTarget(controlId, target) {
    const ctrl = this.controls.get(controlId);
    if (!ctrl) return;
    ctrl.confirmedTarget = target;
    const actionDef = ACTION_MAP[target];
    if (actionDef) {
      ctrl.controlType = actionDef.controlType;
      ctrl.mode = actionDef.mode;
    }
    this.notify();
  }

  /**
   * Confirm all pending high/medium confidence suggestions at once.
   */
  confirmAll() {
    this.controls.forEach(ctrl => {
      if (!ctrl.confirmedTarget && ctrl.suggestedTarget) {
        ctrl.confirmedTarget = ctrl.suggestedTarget;
      }
    });
    this.notify();
  }

  /**
   * Remove a detected control from the scan.
   */
  removeControl(controlId) {
    this.controls.delete(controlId);
    this.notify();
  }

  /**
   * Get suitable alternative targets for dropdown selection.
   */
  getAlternativesFor(ctrl) {
    const deck = ctrl.deck || 'A';
    if (ctrl.kind === 'jog_wheel') {
      return [`JOG ${deck}`, `JOG ${deck === 'A' ? 'B' : 'A'}`];
    }
    if (ctrl.kind === 'jog_touch') {
      return [`JOG TOUCH ${deck}`, `JOG TOUCH ${deck === 'A' ? 'B' : 'A'}`];
    }
    if (ctrl.kind === 'fader') {
      return [
        `CHANNEL FADER ${deck}`,
        `PITCH ${deck}`,
        'CROSSFADER',
        `CHANNEL FADER ${deck === 'A' ? 'B' : 'A'}`,
        `PITCH ${deck === 'A' ? 'B' : 'A'}`,
        'MASTER',
        'HEADPHONES',
        'BOOTH'
      ];
    }
    if (ctrl.kind === 'knob') {
      return [
        `HIGH ${deck}`,
        `MID ${deck}`,
        `LOW ${deck}`,
        `FILTER ${deck}`,
        `GAIN ${deck}`,
        'CUE / MASTER MIX',
        `HIGH ${deck === 'A' ? 'B' : 'A'}`,
        `MID ${deck === 'A' ? 'B' : 'A'}`,
        `LOW ${deck === 'A' ? 'B' : 'A'}`,
        `FILTER ${deck === 'A' ? 'B' : 'A'}`
      ];
    }
    // Buttons & Pads
    return [
      `PLAY ${deck}`,
      `CUE ${deck}`,
      `SYNC ${deck}`,
      `LOAD ${deck}`,
      `LOOP ${deck}`,
      `REPLAY ${deck}`,
      `VINYL ${deck}`,
      `CUE 1 ${deck}`,
      `CUE 2 ${deck}`,
      `PITCH - ${deck}`,
      `PITCH + ${deck}`,
      `SAMPLER ${deck} PAD 1`,
      `SAMPLER ${deck} PAD 2`,
      `SAMPLER ${deck} PAD 3`,
      `SAMPLER ${deck} PAD 4`,
      'AUTO DJ',
      'SHUFFLE'
    ];
  }

  /**
   * Build a standard CROSSCUE profile from all detected & confirmed controls.
   */
  buildProfile(metadata = {}) {
    const entries = [];
    this.controls.forEach(ctrl => {
      const target = ctrl.confirmedTarget || ctrl.suggestedTarget;
      if (!target) return;

      const actionDef = ACTION_MAP[target];
      entries.push(
        createEntry({
          deviceId: ctrl.deviceId || '*',
          deviceName: ctrl.deviceName || metadata.model || this.deviceInfo.name,
          manufacturer: ctrl.manufacturer || metadata.manufacturer || this.deviceInfo.manufacturer,
          channel: ctrl.channel,
          type: ctrl.type,
          number: ctrl.number,
          mode: actionDef?.mode || ctrl.mode || 'toggle',
          target,
          controlType: actionDef?.controlType || ctrl.controlType || 'button',
          status: 'supported'
        })
      );
    });

    return createProfile(
      {
        name: metadata.name || `${this.deviceInfo.name} Auto Map`,
        manufacturer: metadata.manufacturer || this.deviceInfo.manufacturer,
        model: metadata.model || this.deviceInfo.name,
        author: metadata.author || 'CrossCue Auto-Detect',
        description: metadata.description || `Автоматично разпознат профил за ${this.deviceInfo.name}`,
        sourceFormat: 'auto-detected',
        sourceApplication: 'CROSSCUE',
        status: 'tested',
        ...metadata
      },
      entries
    );
  }
}

export const autoDetector = new AutoDetector();