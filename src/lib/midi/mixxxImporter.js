// Mixxx Controller Preset Importer
// Parses Mixxx .xml preset files and converts MIDI mappings to CROSSCUE native entries.
//
// Mixxx format: <MixxxControllerPreset> with <controller> > <controls> > <control>
// Each <control> has: <group>, <key>, <description>, <status> (hex), <midino> (hex), <options>
//
// Architecture:
//   Mixxx XML → parse <control> elements → decode MIDI status → translate action → Native Entry

import { createEntry } from './mappingProfile';

// ── Hex parsing ────────────────────────────────────────────────
const parseHex = str => {
  if (!str) return null;
  const t = str.trim();
  if (t.startsWith('0x') || t.startsWith('0X')) return parseInt(t.slice(2), 16);
  return parseInt(t, 16);
};

// Decode MIDI status byte → { type, channel }
// 0x90-0x9F = Note On, 0xB0-0xBF = Control Change
// MIDI channels are 1-indexed in CROSSCUE (low nibble 0 → channel 1)
const decodeStatus = status => {
  if (status === null || isNaN(status)) return null;
  const high = status & 0xF0;
  const channel = (status & 0x0F) + 1;
  if (high === 0x80 || high === 0x90) return { type: 'noteon', channel };
  if (high === 0xB0) return { type: 'cc', channel };
  return null;
};

// Map Mixxx group to deck letter
const deckFromGroup = group => {
  if (!group) return '';
  if (group.includes('Channel1')) return 'A';
  if (group.includes('Channel2')) return 'B';
  return '';
};

// ── Mixxx key → CROSSCUE action translation ────────────────────
// Returns { target, mode, controlType } for supported actions, null for unsupported.
const translateMixxxAction = (key, group, description, midino) => {
  const deck = deckFromGroup(group);
  const k = (key || '').toLowerCase();
  const desc = (description || '').toLowerCase();

  // Skip 14-bit LSB parts (key contains 'lsb')
  if (k.includes('lsb')) return { skip: true };

  // Hotcues: midino 0-7 → CUE 1-8
  if (k.includes('hotcuenactivate')) {
    const n = midino + 1;
    if (n >= 1 && n <= 8) return { target: `CUE ${n} ${deck}`, mode: 'momentary', controlType: 'button' };
    return null;
  }

  // EQ: distinguish by description (Low/Mid/High)
  if (k === 'ddj200.eq' || (group.includes('equalizer') && k.includes('parameter'))) {
    if (desc.includes('low')) return { target: `LOW ${deck}`, mode: 'continuous', controlType: 'knob' };
    if (desc.includes('mid')) return { target: `MID ${deck}`, mode: 'continuous', controlType: 'knob' };
    if (desc.includes('high')) return { target: `HIGH ${deck}`, mode: 'continuous', controlType: 'knob' };
    return null;
  }

  // Play
  if (k.includes('play')) return { target: `PLAY ${deck}`, mode: 'toggle', controlType: 'button' };

  // Cue (default cue button)
  if (k.includes('cuedefault')) return { target: `CUE ${deck}`, mode: 'momentary', controlType: 'button' };

  // Sync
  if (k.includes('syncenabled') || (k.includes('sync') && !k.includes('clear'))) {
    return { target: `SYNC ${deck}`, mode: 'trigger', controlType: 'button' };
  }

  // Pitch / Rate (MSB CC 0, Hardware CC 32, or standard rate)
  if (k.includes('ratemsb') || k.includes('ratehardware') || k === 'rate') return { target: `PITCH ${deck}`, mode: 'continuous', controlType: 'pitch' };

  // Volume / Channel Fader
  if (k === 'ddj200.volumealt' || k.includes('volumemsb') || (k.includes('volume') && !k.includes('lsb'))) {
    return { target: `CHANNEL FADER ${deck}`, mode: 'continuous', controlType: 'fader' };
  }

  // Crossfader
  if (k === 'crossfader') return { target: 'CROSSFADER', mode: 'continuous', controlType: 'fader' };

  // Filter / Quick Effect Super Knob
  if (k.includes('super1')) return { target: `FILTER ${deck}`, mode: 'continuous', controlType: 'knob' };

  // AutoDJ enable
  if (k === 'enabled' && group.includes('AutoDJ')) return { target: 'AUTO DJ', mode: 'toggle', controlType: 'button' };

  // ── Explicitly unsupported (no CROSSCUE equivalent) ──
  if (k.includes('jog') || k.includes('scratch') || k.includes('touch') || k.includes('seek')) return null;
  if (k.includes('shift')) return null;
  if (k.includes('pfl') || k.includes('headmix')) return null;
  if (k.includes('toggledeck') || k.includes('togglefourdeckmode')) return null;
  if (k.includes('cueset') || k.includes('cuegotoandstop')) return null;
  if (k.includes('hotcuenclear')) return null;
  if (k.includes('bpm_tap') || k === 'tap') return null;
  if (k.includes('fade_now')) return null;

  return null; // unresolved — no match
};

// ── Main import function ────────────────────────────────────────
export function importMixxx(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid XML: Mixxx preset file is malformed or corrupted');

  const root = doc.documentElement;
  if (root.tagName !== 'MixxxControllerPreset') {
    throw new Error('Not a Mixxx controller preset (root element must be <MixxxControllerPreset>)');
  }

  // Device name from <info><name> or <controller id="...">
  let deviceName = '';
  const infoName = doc.querySelector('info > name');
  if (infoName) deviceName = infoName.textContent.trim();
  if (!deviceName) {
    const controller = doc.querySelector('controller');
    if (controller) deviceName = controller.getAttribute('id') || '';
  }
  if (!deviceName) deviceName = 'Unknown Mixxx Device';

  const controls = doc.querySelectorAll('control');
  const entries = [];

  for (const control of controls) {
    const statusText = control.querySelector('status')?.textContent?.trim() || '';
    const midinoText = control.querySelector('midino')?.textContent?.trim() || '';
    const group = control.querySelector('group')?.textContent?.trim() || '';
    const key = control.querySelector('key')?.textContent?.trim() || '';
    const description = control.querySelector('description')?.textContent?.trim() || '';

    const status = parseHex(statusText);
    const midino = parseHex(midinoText);
    const decoded = decodeStatus(status);

    if (!decoded || midino === null || isNaN(midino)) continue;

    // Skip 14-bit LSB parts (options contain <fourteen-bit-lsb/>)
    const optionsEl = control.querySelector('options');
    if (optionsEl?.querySelector('fourteen-bit-lsb')) continue;

    const translated = translateMixxxAction(key, group, description, midino);

    // Skip LSB controls (translated returns { skip: true })
    if (translated?.skip) continue;

    const deck = deckFromGroup(group);
    const isCC = decoded.type === 'cc';

    if (!translated) {
      // Unsupported — create entry for visibility, user can manually assign
      entries.push(createEntry({
        deviceId: '*',
        deviceName,
        channel: decoded.channel,
        type: decoded.type,
        number: midino,
        mode: isCC ? 'continuous' : 'toggle',
        target: '',
        controlType: isCC ? 'knob' : 'button',
        sourceAction: key,
        sourceDeck: deck,
        status: 'unsupported',
      }));
      continue;
    }

    entries.push(createEntry({
      deviceId: '*',
      deviceName,
      channel: decoded.channel,
      type: decoded.type,
      number: midino,
      mode: translated.mode,
      target: translated.target,
      controlType: translated.controlType,
      sourceAction: key,
      sourceDeck: deck,
      status: 'supported',
    }));
  }

  const supported = entries.filter(e => e.status === 'supported').length;
  const unsupported = entries.filter(e => e.status === 'unsupported').length;
  const unresolved = entries.filter(e => e.status === 'unresolved').length;
  const total = entries.length;
  const coverage = total > 0 ? Math.round((supported / total) * 100) : 0;

  return { deviceName, entries, stats: { total, supported, unsupported, unresolved, coverage } };
}