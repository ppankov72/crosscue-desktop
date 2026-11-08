// Backward-compatible bridge between the old flat midiMappings API and the new
// Mapping Library Store. CrossCue.jsx continues to use loadMidiMappings /
// saveMidiMappings / matchesMapping without changes — they now read/write
// through the active profile in the library.

import { mappingLibraryStore } from './mappingLibraryStore';

export const MIDI_MAPPINGS_KEY = 'crosscue.midiMappings.v1';

// Load runtime mappings from the active profile (with migration from old format)
export const loadMidiMappings = () => mappingLibraryStore.getRuntimeMappings();

// Save runtime mappings to the active profile (auto-creates one if none active)
export const saveMidiMappings = mappings => mappingLibraryStore.updateRuntime(() => mappings);

// Subscribe to mapping changes (new — for CrossCue.jsx to react to profile activation)
export const subscribeToMidiMappings = listener =>
  mappingLibraryStore.subscribe(() => listener(mappingLibraryStore.getRuntimeMappings()));

export const defaultMode = type => (type === 'cc' ? 'continuous' : 'toggle');

// Match a MIDI message to a mapping entry.
// Supports deviceId wildcard '*' for imported mappings that don't know the specific device.
export const matchesMapping = (mapping, message) =>
  (mapping.deviceId === '*' || mapping.deviceId === message.device.id) &&
  mapping.channel === message.channel &&
  (mapping.type === message.type ||
    (mapping.mode === 'momentary' && mapping.type === 'noteon' && message.type === 'noteoff')) &&
  mapping.number === message.number;