// Traktor .TSI Import Adapter
// Parses real Traktor TSI files and converts MIDI mappings to CROSSCUE native entries.
//
// Real TSI files are XML wrappers (<NIXML>) containing a Base64-encoded binary blob
// in the "DeviceIO.Config.Controller" <Entry> Value attribute. The binary blob uses
// ID3v2-like frames (4-byte ID + 4-byte big-endian size) holding device name, MIDI
// note bindings, and Traktor control mappings.
//
// Format reference: https://github.com/ivanz/TraktorMappingFileFormat
//
// Architecture:
//   TSI XML (NIXML) → find Entry → Base64 decode → Binary frame parse → MIDI extract → Native Entry
//
// Status classification:
//   SUPPORTED   — Traktor action has a clear CROSSCUE equivalent
//   UNSUPPORTED — Traktor action has no CROSSCUE equivalent (never invented)
//   UNRESOLVED  — MIDI data present but action/deck could not be safely determined

import { createEntry } from './mappingProfile';
import { ACTION_MAP } from './actions';

// ── Traktor action → CROSSCUE action translation ───────────────
// Only map actions with clear, unambiguous CROSSCUE equivalents.
// Never invent a CROSSCUE action to increase coverage.

const DECK_MAP = { '1': 'A', 'A': 'A', '0': 'A', '2': 'B', 'B': 'B' };

const ACTION_KEYWORDS = [
  { keywords: ['play'], target: 'PLAY {deck}', controlType: 'button', mode: 'toggle' },
  { keywords: ['cue', 'cup'], target: 'CUE {deck}', controlType: 'button', mode: 'momentary' },
  { keywords: ['sync', 'bpm'], target: 'SYNC {deck}', controlType: 'button', mode: 'trigger' },
  { keywords: ['load', 'browser select', 'track load'], target: 'LOAD {deck}', controlType: 'button', mode: 'trigger' },
  { keywords: ['tempo', 'pitch fader', 'pitchfader'], target: 'PITCH {deck}', controlType: 'pitch', mode: 'continuous' },
  { keywords: ['gain', 'trim'], target: 'GAIN {deck}', controlType: 'knob', mode: 'continuous' },
  { keywords: ['eq high', 'eqhigh', 'high eq', 'treble'], target: 'HIGH {deck}', controlType: 'knob', mode: 'continuous' },
  { keywords: ['eq mid', 'eqmid', 'mid eq', 'midfreq'], target: 'MID {deck}', controlType: 'knob', mode: 'continuous' },
  { keywords: ['eq low', 'eqlow', 'low eq', 'bass'], target: 'LOW {deck}', controlType: 'knob', mode: 'continuous' },
  { keywords: ['filter', 'fx filter'], target: 'FILTER {deck}', controlType: 'knob', mode: 'continuous' },
  { keywords: ['volume', 'channel vol', 'channelvol', 'line fader'], target: 'CHANNEL FADER {deck}', controlType: 'fader', mode: 'continuous' },
  { keywords: ['loop', 'loop in', 'loop out', 'loopin', 'loopout'], target: 'LOOP {deck}', controlType: 'button', mode: 'toggle' },
  { keywords: ['crossfader', 'xfader', 'cross fader'], target: 'CROSSFADER', controlType: 'fader', mode: 'continuous' },
  { keywords: ['master', 'main vol', 'mainvol'], target: 'MASTER', controlType: 'fader', mode: 'continuous' },
  { keywords: ['headphone', 'cue vol', 'cuevol', 'monitor'], target: 'HEADPHONES', controlType: 'fader', mode: 'continuous' },
  { keywords: ['booth'], target: 'BOOTH', controlType: 'fader', mode: 'continuous' },
  { keywords: ['auto dj', 'autodj', 'automix'], target: 'AUTO DJ', controlType: 'button', mode: 'toggle' },
  { keywords: ['shuffle', 'random'], target: 'SHUFFLE', controlType: 'button', mode: 'toggle' },
];

const UNSUPPORTED_KEYWORDS = [
  'fx', 'effect', 'effects unit', 'dry wet',
  'key', 'keylock', 'key lock',
  'browse', 'browser', 'tree', 'playlist',
  'modifier', 'mod',
  'sample', 'sample slot', 'step sequencer',
  'remix', 'remix deck',
  'recorder', 'record',
  'loop recorder',
  'tick', 'phase',
  'zoom', 'waveform',
  'view', 'layout',
  'midi page', 'page',
  'direct throttle', 'jog wheel', 'jogwheel',
  'seek', 'scratch',
  'beatgrid', 'beat grid',
  'quantize',
  'tap',
  'freeze',
  'flux',
  'reverse',
  'start/stop',
  'swing',
  'macro',
];

// ── Binary reading utilities ──────────────────────────────────

// Unsigned 32-bit big-endian read. Using multiplication avoids the signed
// integer overflow that `<< 24` causes when the high byte >= 0x80 —
// the #1 reason large TSI files produced 0 entries (the scan saw a
// negative frame size and bailed immediately).
const readUInt32BE = (data, offset) =>
  (data[offset] * 0x1000000) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];

const readFrameId = (data, offset) =>
  String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);

const readWideString = (data, offset) => {
  const len = readUInt32BE(data, offset);
  if (len > 10000) return { str: '', nextOffset: offset + 4 };
  let str = '';
  for (let i = 0; i < len; i++) {
    const charCode = (data[offset + 4 + i * 2] << 8) | data[offset + 5 + i * 2];
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return { str, nextOffset: offset + 4 + len * 2 };
};

const isFrameId = (data, offset, end) =>
  offset + 4 <= end &&
  data[offset] >= 0x41 && data[offset] <= 0x5A && // A-Z
  data[offset + 1] >= 0x41 && data[offset + 1] <= 0x5A &&
  data[offset + 2] >= 0x41 && data[offset + 2] <= 0x5A &&
  data[offset + 3] >= 0x41 && data[offset + 3] <= 0x5A;

// ── Parse MIDI note string ────────────────────────────────────
// Traktor MIDI note strings: "Note.60", "CC.7", "Ch.1.Note.60", etc.
const parseMidiNoteString = (noteStr) => {
  if (!noteStr) return null;
  const lower = noteStr.toLowerCase().replace(/\s+/g, '');
  let channel = null;
  let number = null;
  let type = null;

  // Channel: "ch.X" or "channel.X"
  const chMatch = lower.match(/ch(?:annel)?\.?(\d+)/);
  if (chMatch) channel = parseInt(chMatch[1], 10);

  // Note: "note.X" or "noteX"
  const noteMatch = lower.match(/note\.?(\d+)/);
  if (noteMatch) {
    number = parseInt(noteMatch[1], 10);
    type = 'noteon';
  }

  // CC: "cc.X" or "controller.X" (but not "ch.")
  if (number === null) {
    const ccMatch = lower.match(/(?:^|[^h])cc\.?(\d+)/) || lower.match(/controller\.?(\d+)/);
    if (ccMatch) {
      number = parseInt(ccMatch[1], 10);
      type = 'cc';
    }
  }

  // Pitch bend
  if (number === null && lower.includes('pitch')) {
    number = 0;
    type = 'cc';
  }

  // Program change — skip
  if (number === null && lower.includes('prog')) return null;

  // Bare number — assume note
  if (number === null) {
    const bareMatch = lower.match(/(\d+)/);
    if (bareMatch) {
      number = parseInt(bareMatch[1], 10);
      type = 'noteon';
    }
  }

  if (number === null || type === null) return null;
  if (number < 0 || number > 127) return null;
  return { channel: channel || 1, number, type };
};

// ── Parse binary TSI data ─────────────────────────────────────
// Walks ID3v2-like frames and extracts device name, MIDI note bindings,
// and Traktor control mappings.
const parseBinaryTsi = (data) => {
  const result = {
    deviceName: '',
    mappingComment: '',
    midiBindings: new Map(),   // bindingId → { noteStr, channel, number, type }
    midiDefinitions: new Map(), // noteStr → { channel, controlType }
    mappings: [],              // { bindingId, type, controlId }
  };

  const scanFrames = (offset, end) => {
    while (offset + 8 <= end) {
      const id = readFrameId(data, offset);
      const size = readUInt32BE(data, offset + 4);
      const contentStart = offset + 8;
      const contentEnd = contentStart + size;

      if (contentEnd > end) break;

      try {
        if (id === 'DEVI') {
          // Device: NameLength (int), Name (wchar_t[]), then DeviceData (sub-frames)
          const { str, nextOffset } = readWideString(data, contentStart);
          if (str && !result.deviceName) result.deviceName = str;
          scanFrames(nextOffset, contentEnd);
        } else if (id === 'DDIC') {
          // MappingFileComment: CommentLength, Comment
          const { str } = readWideString(data, contentStart);
          if (str) result.mappingComment = str;
        } else if (id === 'DCDT') {
          // MidiDefinition: MidiNoteLength, MidiNote, then Unknown1, Unknown2, Velocity, etc.
          const { str, nextOffset } = readWideString(data, contentStart);
          const parsed = parseMidiNoteString(str);
          // Try to read channel from Unknown1 (first DWORD after note string)
          let defChannel = null;
          if (nextOffset + 4 <= contentEnd) {
            const u1 = readUInt32BE(data, nextOffset);
            if (u1 >= 1 && u1 <= 16) defChannel = u1;
          }
          if (parsed) {
            result.midiDefinitions.set(str, {
              channel: defChannel || parsed.channel,
              number: parsed.number,
              type: parsed.type,
            });
          }
        } else if (id === 'DCBM') {
          // Could be MidiNoteBindingList (count + sub-frames) or MidiNoteBinding (Id + note)
          const firstInt = readUInt32BE(data, contentStart);
          const nextOffset = contentStart + 4;
          // If next bytes are a frame ID ("DCBM"), this is a binding list
          if (isFrameId(data, nextOffset, contentEnd) && readFrameId(data, nextOffset) === 'DCBM') {
            // MidiNoteBindingList: firstInt = count, then sub-frames
            scanFrames(nextOffset, contentEnd);
          } else {
            // MidiNoteBinding: firstInt = Id, then MidiNoteLength + MidiNote
            const bindingId = firstInt;
            const { str } = readWideString(data, nextOffset);
            const parsed = parseMidiNoteString(str);
            if (parsed) {
              // Try to get channel from DCDT definition (linked by note string)
              const def = result.midiDefinitions.get(str);
              result.midiBindings.set(bindingId, {
                noteStr: str,
                channel: def?.channel || parsed.channel,
                number: parsed.number,
                type: parsed.type,
              });
            }
          }
        } else if (id === 'CMAS') {
          // MappingsList: NumberOfMappings (int), then CMAI sub-frames
          scanFrames(contentStart + 4, contentEnd);
        } else if (id === 'CMAI') {
          // Mapping: MidiNoteBindingId (int), Type (int: In=0, Out=1), TraktorControlId (int), Settings...
          if (contentStart + 12 <= contentEnd) {
            const bindingId = readUInt32BE(data, contentStart);
            const type = readUInt32BE(data, contentStart + 4);
            const controlId = readUInt32BE(data, contentStart + 8);
            result.mappings.push({ bindingId, type, controlId });
          }
        } else {
          // Unknown container frame — scan its content for sub-frames
          scanFrames(contentStart, contentEnd);
        }
      } catch { /* skip malformed frame */ }

      offset = contentEnd;
    }
  };

  scanFrames(0, data.length);
  return result;
};

// ── Heuristic MIDI note scan (fallback) ──────────────────────────
// When the frame-based parser finds 0 mappings (e.g. a TSI variant with
// an unfamiliar frame layout), scan the raw binary for UTF-16LE MIDI note
// strings like "Note.60", "CC.7", "Ch.1.Note.60" and create unresolved
// entries from them. This guarantees the user sees *something* to work with.
const heuristicScanMidiNotes = (data, deviceName) => {
  const entries = [];
  const seen = new Set();

  // Build a regex that matches UTF-16LE encoded MIDI note patterns.
  // We scan for "Note.X" and "CC.X" as wide strings.
  const asciiToUtf16 = (s) => s.split('').map(c => c + '\x00').join('');
  const notePattern = new RegExp(asciiToUtf16('Note\\.(\\d{1,3})'), 'g');
  const ccPattern = new RegExp(asciiToUtf16('(?:^|[^h])CC\\.(\\d{1,3})'), 'g');

  // Convert relevant portion to a string for regex (limit to avoid memory issues)
  const maxScan = Math.min(data.length, 5_000_000);
  let binaryStr = '';
  for (let i = 0; i < maxScan; i++) binaryStr += String.fromCharCode(data[i]);

  let match;
  while ((match = notePattern.exec(binaryStr)) !== null) {
    const number = parseInt(match[1], 10);
    if (number < 0 || number > 127) continue;
    const key = `note-${number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(createEntry({
      deviceId: '*', deviceName, channel: 1, type: 'noteon', number,
      mode: 'toggle', target: '', controlType: 'button',
      sourceAction: 'Note (heuristic scan)', status: 'unresolved',
    }));
  }

  while ((match = ccPattern.exec(binaryStr)) !== null) {
    const number = parseInt(match[1], 10);
    if (number < 0 || number > 127) continue;
    const key = `cc-${number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(createEntry({
      deviceId: '*', deviceName, channel: 1, type: 'cc', number,
      mode: 'continuous', target: '', controlType: 'knob',
      sourceAction: 'CC (heuristic scan)', status: 'unresolved',
    }));
  }

  return entries;
};

// ── Translate a parsed mapping to a CROSSCUE entry ─────────────
const translateParsedMapping = (mapping, binding, deviceName) => {
  if (!binding) return null;

  // Determine mode and controlType from MIDI type
  const isCC = binding.type === 'cc';
  const mode = isCC ? 'continuous' : 'toggle';
  const controlType = isCC ? 'knob' : 'button';

  // TraktorControlId is numeric — without a lookup table we can't determine
  // the action name, so mark as UNRESOLVED for manual assignment.
  return createEntry({
    deviceId: '*',
    deviceName,
    channel: binding.channel,
    type: binding.type,
    number: binding.number,
    mode,
    target: '',
    controlType,
    sourceAction: `Traktor Control #${mapping.controlId}`,
    sourceDeck: '',
    status: 'unresolved',
  });
};

// ── Legacy XML parser (for non-binary TSI files) ───────────────
// Fixed walkElements to handle Document nodes (nodeType 9).

const walkElements = (root, fn) => {
  const start = root.nodeType === 9 ? root.documentElement : root;
  const stack = [start];
  while (stack.length) {
    const el = stack.pop();
    if (!el || el.nodeType !== 1) continue;
    fn(el);
    for (let i = el.children.length - 1; i >= 0; i--) stack.push(el.children[i]);
  }
};

const getChildValue = (parent, name) => {
  const standard = parent.querySelector(`:scope > ${name}`);
  if (standard) return standard.textContent.trim();
  for (const child of parent.children) {
    if (child.getAttribute('n') === name) return child.textContent.trim();
  }
  return null;
};

const parseMidiType = (text, numeric) => {
  if (!isNaN(numeric) && numeric !== null) {
    if (numeric === 1) return 'noteon';
    if (numeric === 2) return 'cc';
  }
  const t = String(text).toLowerCase();
  if (t.includes('note')) return 'noteon';
  if (t.includes('cc') || t.includes('control') || t.includes('controller')) return 'cc';
  return null;
};

const extractMidiAssignment = (el) => {
  let channel = null, number = null, type = null;
  walkElements(el, e => {
    const n = e.getAttribute('n');
    const tag = e.tagName;
    if (n === 'Channel' || tag === 'Channel') {
      const v = parseInt(e.textContent.trim(), 10);
      if (!isNaN(v)) channel = v;
    } else if (n === 'Note' || n === 'CC' || n === 'Controller' || tag === 'Note' || tag === 'CC') {
      const v = parseInt(e.textContent.trim(), 10);
      if (!isNaN(v)) number = v;
    } else if (n === 'Type' || n === 'MessageType' || tag === 'Type') {
      const raw = e.textContent.trim();
      const t = parseMidiType(raw.toLowerCase(), parseInt(raw, 10));
      if (t) type = t;
    }
  });
  if (channel === null || number === null || type === null) return null;
  return { channel: channel + 1, number, type };
};

const extractAction = (el) => {
  let actionName = '', deck = '';
  const outEl = el.querySelector('Out, Output, TraktorAction') ||
    [...el.children].find(c => c.getAttribute('n') === 'Out' || c.getAttribute('n') === 'TraktorAction');
  if (outEl) {
    actionName = getChildValue(outEl, 'Name') || getChildValue(outEl, 'Action') || '';
    deck = getChildValue(outEl, 'Deck') || getChildValue(outEl, 'DeckId') || '';
    if (!actionName) {
      walkElements(outEl, e => {
        if (actionName) return;
        const n = e.getAttribute('n');
        if (n === 'Name' || n === 'Action' || e.tagName === 'Name') {
          const text = e.textContent.trim();
          if (text && text.length > 1 && text.length < 100) actionName = text;
        }
      });
    }
  }
  if (!actionName) {
    walkElements(el, e => {
      if (actionName) return;
      const n = e.getAttribute('n');
      if (n === 'Name' || n === 'Action' || e.tagName === 'Name') {
        const text = e.textContent.trim();
        if (text && text.length > 1 && text.length < 100 && !/^[0-9]+$/.test(text) && !text.includes('Midi')) {
          actionName = text;
        }
      }
    });
  }
  if (!deck) {
    walkElements(el, e => {
      if (deck) return;
      const n = e.getAttribute('n');
      if (n === 'Deck' || n === 'DeckId' || e.tagName === 'Deck') deck = e.textContent.trim();
    });
  }
  return { actionName, deck };
};

const translateLegacyEntry = (raw, deviceName) => {
  const { channel, number, type, actionName, deck } = raw;
  const actionLower = (actionName || '').toLowerCase();
  const deckId = DECK_MAP[String(deck)] || '';

  for (const kw of ACTION_KEYWORDS) {
    if (kw.keywords.some(k => actionLower.includes(k))) {
      const target = kw.target.replace('{deck}', deckId || 'A');
      if (ACTION_MAP[target]) {
        return createEntry({
          deviceId: '*', deviceName, channel, type, number,
          mode: kw.mode, target, controlType: kw.controlType,
          sourceAction: actionName, sourceDeck: deck, status: 'supported',
        });
      }
    }
  }

  const isUnsupported = UNSUPPORTED_KEYWORDS.some(kw => actionLower.includes(kw));
  return createEntry({
    deviceId: '*', deviceName, channel, type, number,
    mode: type === 'cc' ? 'continuous' : 'toggle',
    target: '', controlType: type === 'cc' ? 'knob' : 'button',
    sourceAction: actionName, sourceDeck: deck,
    status: isUnsupported ? 'unsupported' : 'unresolved',
  });
};

const parseLegacyXml = (doc) => {
  let deviceName = '';
  walkElements(doc, el => {
    if (deviceName) return;
    const n = el.getAttribute('n');
    if (n === 'DeviceMapping' || n === 'Device' || el.tagName === 'DeviceMapping') {
      const name = getChildValue(el, 'Name');
      if (name) deviceName = name;
    }
  });

  const rawMappings = [];
  walkElements(doc, el => {
    const n = el.getAttribute('n');
    const isMapping = n === 'Mapping' || n === 'Map' || el.tagName === 'Mapping' || el.tagName === 'Map';
    if (!isMapping) return;

    let midi = null;
    const inEl = [...el.children].find(c => c.getAttribute('n') === 'In' || c.tagName === 'In');
    if (inEl) {
      const midiEl = inEl.querySelector('MidiAssignment') ||
        [...inEl.children].find(c => c.getAttribute('n') === 'MidiAssignment');
      midi = extractMidiAssignment(midiEl || inEl);
    }
    if (!midi) midi = extractMidiAssignment(el);
    if (!midi) return;

    const { actionName, deck } = extractAction(el);
    rawMappings.push({ ...midi, actionName, deck });
  });

  if (!rawMappings.length) {
    return { deviceName, entries: [], stats: { total: 0, supported: 0, unsupported: 0, unresolved: 0, coverage: 0 } };
  }

  const entries = rawMappings.map(m => translateLegacyEntry(m, deviceName));
  return buildResult(deviceName, entries);
};

// ── Build result object ────────────────────────────────────────
const buildResult = (deviceName, entries) => {
  const supported = entries.filter(e => e.status === 'supported').length;
  const unsupported = entries.filter(e => e.status === 'unsupported').length;
  const unresolved = entries.filter(e => e.status === 'unresolved').length;
  const total = entries.length;
  const coverage = total > 0 ? Math.round((supported / total) * 100) : 0;
  return { deviceName, entries, stats: { total, supported, unsupported, unresolved, coverage } };
};

// ── Main import function ────────────────────────────────────────
export function importTsi(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Invalid XML: TSI file is malformed or corrupted');

  // ── Real TSI: NIXML format with Base64 binary blob ──────────
  // <NIXML><TraktorSettings><Entry Name="DeviceIO.Config.Controller" Value="BASE64..."/>
  const entries = doc.querySelectorAll('Entry');
  let base64Data = null;
  // Look for the controller config entry by exact name, then fall back to
  // any Entry whose Value is a long base64 string (some TSI variants use
  // different entry names like "DeviceIO.Config.MIDI").
  for (const entry of entries) {
    const name = entry.getAttribute('Name') || '';
    if (name === 'DeviceIO.Config.Controller' || name.startsWith('DeviceIO.Config')) {
      base64Data = entry.getAttribute('Value');
      if (base64Data && base64Data.length > 100) break;
    }
  }
  if (!base64Data) {
    for (const entry of entries) {
      const val = entry.getAttribute('Value') || '';
      if (val.length > 500 && /^[A-Za-z0-9+/=\s]+$/.test(val)) {
        base64Data = val;
        break;
      }
    }
  }

  if (base64Data) {
    // Decode Base64 → binary → parse frames
    const cleanB64 = base64Data.replace(/\s/g, '');
    const binaryString = atob(cleanB64);
    const data = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) data[i] = binaryString.charCodeAt(i);

    const parsed = parseBinaryTsi(data);
    const deviceName = parsed.deviceName || parsed.mappingComment || 'Unknown Device';

    let crossEntries = [];
    for (const mapping of parsed.mappings) {
      // Only process In mappings (Type=0); skip Out/LED mappings (Type=1)
      if (mapping.type !== 0) continue;
      const binding = parsed.midiBindings.get(mapping.bindingId);
      const entry = translateParsedMapping(mapping, binding, deviceName);
      if (entry) crossEntries.push(entry);
    }

    // Fallback: if frame parsing found 0 entries, try heuristic MIDI note scan
    if (crossEntries.length === 0) {
      crossEntries = heuristicScanMidiNotes(data, deviceName);
    }

    return buildResult(deviceName, crossEntries);
  }

  // ── Legacy: plain XML with <e n="Mapping"> elements ─────────
  return parseLegacyXml(doc);
}

// ── Detect file format ─────────────────────────────────────────
export const detectFormat = (filename, content) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tsi')) return 'traktor-tsi';
  if (lower.endsWith('.crosscue-map') || lower.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      if (data.format === 'crosscue-native' || Array.isArray(data.entries)) return 'crosscue-native';
      return 'unknown-json';
    } catch { return 'unknown'; }
  }
  const trimmed = content.trimStart();
  if (trimmed.includes('<MixxxControllerPreset')) return 'mixxx';
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'traktor-tsi';
  return 'unknown';
};