// Canonical CROSSCUE MIDI action definitions
// Extracted from MidiPanel.jsx controls + runMidi dispatch in CrossCue.jsx
// This is the single source of truth for all CROSSCUE MIDI actions.

export const CONTROL_TYPES = ['button', 'knob', 'fader', 'encoder', 'jog', 'pitch', 'led'];

export const ACTION_MODES = ['toggle', 'momentary', 'trigger', 'continuous', 'jog'];

const deckActions = deck => [
  { id: `PLAY ${deck}`, label: 'Play/Pause', controlType: 'button', mode: 'toggle' },
  { id: `CUE ${deck}`, label: 'Cue', controlType: 'button', mode: 'momentary' },
  { id: `SYNC ${deck}`, label: 'Sync', controlType: 'button', mode: 'trigger' },
  { id: `LOAD ${deck}`, label: 'Load Track', controlType: 'button', mode: 'trigger' },
  { id: `JOG ${deck}`, label: 'Jog Wheel / Scratch', controlType: 'jog', mode: 'continuous' },
  { id: `JOG TOUCH ${deck}`, label: 'Jog Platter Touch', controlType: 'button', mode: 'momentary' },
  { id: `PITCH ${deck}`, label: 'Pitch Fader', controlType: 'pitch', mode: 'continuous' },
  { id: `PITCH - ${deck}`, label: 'Pitch Down', controlType: 'button', mode: 'momentary' },
  { id: `PITCH + ${deck}`, label: 'Pitch Up', controlType: 'button', mode: 'momentary' },
  { id: `GAIN ${deck}`, label: 'Gain', controlType: 'knob', mode: 'continuous' },
  { id: `HIGH ${deck}`, label: 'EQ High', controlType: 'knob', mode: 'continuous' },
  { id: `MID ${deck}`, label: 'EQ Mid', controlType: 'knob', mode: 'continuous' },
  { id: `LOW ${deck}`, label: 'EQ Low', controlType: 'knob', mode: 'continuous' },
  { id: `FILTER ${deck}`, label: 'Filter', controlType: 'knob', mode: 'continuous' },
  { id: `CHANNEL FADER ${deck}`, label: 'Channel Fader', controlType: 'fader', mode: 'continuous' },
  { id: `LOOP ${deck}`, label: 'Loop', controlType: 'button', mode: 'toggle' },
  { id: `REPLAY ${deck}`, label: 'Replay', controlType: 'button', mode: 'toggle' },
  { id: `VINYL ${deck}`, label: 'Vinyl Mode', controlType: 'button', mode: 'toggle' },
  { id: `KEY LOCK ${deck}`, label: 'Key Lock / Master Tempo', controlType: 'button', mode: 'toggle' },
  { id: `CUE 1 ${deck}`, label: 'Hot Cue 1', controlType: 'button', mode: 'trigger' },
  { id: `CUE 2 ${deck}`, label: 'Hot Cue 2', controlType: 'button', mode: 'trigger' },
];

const samplerActions = deck =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `SAMPLER ${deck} PAD ${i + 1}`,
    label: `Pad ${i + 1}`,
    controlType: 'button',
    mode: 'trigger',
  }));

export const ACTION_CATEGORIES = [
  { id: 'deck-a', label: 'Deck A', actions: deckActions('A') },
  { id: 'sampler-a', label: 'Sampler A', actions: samplerActions('A') },
  { id: 'deck-b', label: 'Deck B', actions: deckActions('B') },
  { id: 'sampler-b', label: 'Sampler B', actions: samplerActions('B') },
  {
    id: 'mixer',
    label: 'Mixer',
    actions: [
      { id: 'CROSSFADER', label: 'Crossfader', controlType: 'fader', mode: 'continuous' },
      { id: 'MASTER', label: 'Master Volume', controlType: 'fader', mode: 'continuous' },
      { id: 'HEADPHONES', label: 'Headphone Volume', controlType: 'fader', mode: 'continuous' },
      { id: 'BOOTH', label: 'Booth Volume', controlType: 'fader', mode: 'continuous' },
      { id: 'CUE / MASTER MIX', label: 'Cue/Master Mix', controlType: 'knob', mode: 'continuous' },
    ],
  },
  {
    id: 'auto-dj',
    label: 'Auto DJ',
    actions: [
      { id: 'AUTO DJ', label: 'Auto DJ Toggle', controlType: 'button', mode: 'toggle' },
      { id: 'SHUFFLE', label: 'Shuffle Toggle', controlType: 'button', mode: 'toggle' },
    ],
  },
];

export const ALL_ACTIONS = ACTION_CATEGORIES.flatMap(c => c.actions);
export const ACTION_MAP = Object.fromEntries(ALL_ACTIONS.map(a => [a.id, a]));
export const getAction = id => ACTION_MAP[id];
export const ACTION_IDS = ALL_ACTIONS.map(a => a.id);
export const isValidAction = id => Boolean(ACTION_MAP[id]);