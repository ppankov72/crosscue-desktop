// CROSSCUE Native Mapping Format — profile structure, library management, import/export
// This is the canonical stored/runtime format for controller mappings.
// External formats (TSI, etc.) are converted to this format via import adapters.

import { ACTION_MAP } from './actions';
import { getOfficialProfiles } from './officialMappings';

export const FORMAT_VERSION = 1;
export const LIBRARY_KEY = 'crosscue.mappingLibrary.v1';
export const OLD_MAPPINGS_KEY = 'crosscue.midiMappings.v1';

export const genId = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ── Entry creation ──────────────────────────────────────────────
export const createEntry = (data = {}) => ({
  id: data.id || genId('entry'),
  deviceId: data.deviceId ?? '*',
  deviceName: data.deviceName || '',
  manufacturer: data.manufacturer || '',
  channel: data.channel ?? 1,
  type: data.type || 'noteon', // noteon | noteoff | cc
  number: data.number ?? 0,
  mode: data.mode || 'toggle', // toggle | momentary | trigger | continuous
  target: data.target || '',
  controlType: data.controlType || 'button',
  min: data.min ?? 0,
  max: data.max ?? 127,
  invert: data.invert || false,
  relative: data.relative || false,
  modifier: data.modifier || null,
  ledFeedback: data.ledFeedback || null,
  sourceAction: data.sourceAction || '',
  sourceDeck: data.sourceDeck || '',
  status: data.status || 'supported', // supported | unsupported | unresolved
});

// ── Profile creation ────────────────────────────────────────────
export const createProfile = (metadata = {}, entries = []) => ({
  id: metadata.id || genId('profile'),
  formatVersion: FORMAT_VERSION,
  metadata: {
    manufacturer: metadata.manufacturer || '',
    model: metadata.model || '',
    name: metadata.name || 'Untitled Mapping',
    author: metadata.author || '',
    version: metadata.version || '1.0',
    description: metadata.description || '',
    sourceFormat: metadata.sourceFormat || 'manual',
    sourceApplication: metadata.sourceApplication || 'CROSSCUE',
    crosscueVersion: metadata.crosscueVersion || '1.0',
    status: metadata.status || 'experimental', // tested | experimental
    createdAt: metadata.createdAt || new Date().toISOString(),
    updatedAt: metadata.updatedAt || new Date().toISOString(),
    ...metadata,
  },
  entries: entries.map(e => (e.id ? e : createEntry(e))),
});

// ── Patch user-customized profile (e.g. Pioneer DDJ-200_edit) with verified hardware fixes ──
const patchCustomProfiles = profiles => {
  if (!Array.isArray(profiles)) return [];
  return profiles.map(p => {
    // If it's the user's DDJ-200 edit profile or contains DDJ-200 in name/model
    const isDdj200 =
      p.id === 'Pioneer DDJ-200_edit' ||
      p.metadata?.name?.includes('DDJ-200') ||
      p.metadata?.model?.includes('DDJ-200');
    if (!isDdj200) return p;

    let entries = p.entries || [];
    // 1. Remove incorrect PITCH A / B mappings, rogue VINYL mappings on jog controls, and corrupted JOG mappings with notes
    entries = entries.filter(
      e => !(
        (e.target === 'PITCH A' && (e.type === 'noteoff' || (e.channel === 2 && e.type === 'noteon'))) ||
        ((e.target === 'VINYL A' || e.target === 'VINYL B') && (e.number === 33 || e.number === 54)) ||
        ((e.target === 'JOG A' || e.target === 'JOG B') && (e.type === 'noteon' || e.type === 'noteoff' || e.number === 54))
      )
    );

    // 2. Ensure PITCH A has CC 32 on Channel 1
    const hasPitchAcc32 = entries.some(
      e => e.target === 'PITCH A' && e.channel === 1 && e.type === 'cc' && e.number === 32
    );
    if (!hasPitchAcc32) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 1,
          type: 'cc',
          number: 32,
          mode: 'continuous',
          target: 'PITCH A',
          controlType: 'pitch',
          status: 'supported',
        })
      );
    }

    // 3. Ensure PITCH B has CC 32 on Channel 2
    const hasPitchBcc32 = entries.some(
      e => e.target === 'PITCH B' && e.channel === 2 && e.type === 'cc' && e.number === 32
    );
    if (!hasPitchBcc32) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 2,
          type: 'cc',
          number: 32,
          mode: 'continuous',
          target: 'PITCH B',
          controlType: 'pitch',
          status: 'supported',
        })
      );
    }

    // 4. Ensure Volume CC 51 is present for both channels
    const hasVolAcc51 = entries.some(
      e => e.target === 'CHANNEL FADER A' && e.channel === 1 && e.type === 'cc' && e.number === 51
    );
    if (!hasVolAcc51) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 1,
          type: 'cc',
          number: 51,
          mode: 'continuous',
          target: 'CHANNEL FADER A',
          controlType: 'fader',
          status: 'supported',
        })
      );
    }
    const hasVolBcc51 = entries.some(
      e => e.target === 'CHANNEL FADER B' && e.channel === 2 && e.type === 'cc' && e.number === 51
    );
    if (!hasVolBcc51) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 2,
          type: 'cc',
          number: 51,
          mode: 'continuous',
          target: 'CHANNEL FADER B',
          controlType: 'fader',
          status: 'supported',
        })
      );
    }

    // 5. Ensure JOG A / JOG B entries exist for DDJ-200 CC 33 & 34
    if (!entries.some(e => e.target === 'JOG A' && e.type === 'cc' && e.number === 33)) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 1,
          type: 'cc',
          number: 33,
          mode: 'continuous',
          target: 'JOG A',
          controlType: 'jog',
          status: 'supported',
        }),
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 1,
          type: 'cc',
          number: 34,
          mode: 'continuous',
          target: 'JOG A',
          controlType: 'jog',
          status: 'supported',
        })
      );
    }
    if (!entries.some(e => e.target === 'JOG B' && e.type === 'cc' && e.number === 33)) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 2,
          type: 'cc',
          number: 33,
          mode: 'continuous',
          target: 'JOG B',
          controlType: 'jog',
          status: 'supported',
        }),
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 2,
          type: 'cc',
          number: 34,
          mode: 'continuous',
          target: 'JOG B',
          controlType: 'jog',
          status: 'supported',
        })
      );
    }

    // 6. Ensure JOG TOUCH A & JOG TOUCH B entries exist for touch sensor Note 54
    if (!entries.some(e => e.target === 'JOG TOUCH A' && e.number === 54)) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 1,
          type: 'noteon',
          number: 54,
          mode: 'momentary',
          target: 'JOG TOUCH A',
          controlType: 'button',
          status: 'supported',
        })
      );
    }
    if (!entries.some(e => e.target === 'JOG TOUCH B' && e.number === 54)) {
      entries.push(
        createEntry({
          deviceId: '*',
          deviceName: p.metadata?.name || 'Pioneer DDJ-200',
          channel: 2,
          type: 'noteon',
          number: 54,
          mode: 'momentary',
          target: 'JOG TOUCH B',
          controlType: 'button',
          status: 'supported',
        })
      );
    }

    return {
      ...p,
      entries,
    };
  });
};

// ── Library load/save with migration ───────────────────────────
export const loadLibrary = () => {
  // Always merge the latest official profiles (shipped with the app)
  // into the stored library, so new official mappings appear for all users.
  const official = getOfficialProfiles();
  try {
    const stored = JSON.parse(localStorage.getItem(LIBRARY_KEY) || 'null');
    if (stored && stored.my) {
      // Patch user custom profiles (such as Pioneer DDJ-200_edit)
      const patchedMy = patchCustomProfiles(stored.my);
      const activeId = stored.activeProfileId;
      return {
        ...stored,
        official,
        my: patchedMy,
        activeProfileId:
          activeId && [...official, ...stored.community, ...patchedMy].some(p => p.id === activeId)
            ? activeId
            : null,
      };
    }
  } catch {}
  // No stored library — try migrating from legacy mappings, else start fresh.
  const migrated = migrateFromOldMappings();
  const patchedMy = patchCustomProfiles(migrated.my);
  return { official, community: migrated.community, my: patchedMy, activeProfileId: migrated.activeProfileId };
};

const migrateFromOldMappings = () => {
  try {
    const oldMappings = JSON.parse(localStorage.getItem(OLD_MAPPINGS_KEY) || '[]');
    if (!oldMappings.length)
      return { official: [], community: [], my: [], activeProfileId: null };

    const profile = createProfile(
      {
        name: 'My Custom Mapping',
        sourceFormat: 'manual',
        sourceApplication: 'CROSSCUE',
        status: 'experimental',
        author: 'Me',
      },
      oldMappings.map(m =>
        createEntry({
          deviceId: m.deviceId,
          deviceName: m.deviceName,
          manufacturer: m.manufacturer,
          channel: m.channel,
          type: m.type,
          number: m.number,
          mode: m.mode,
          target: m.target,
          controlType: ACTION_MAP[m.target]?.controlType || 'button',
          status: 'supported',
        })
      )
    );
    return { official: [], community: [], my: [profile], activeProfileId: profile.id };
  } catch {
    return { official: [], community: [], my: [], activeProfileId: null };
  }
};

export const saveLibrary = library => {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch {}
};

// ── Library queries ────────────────────────────────────────────
export const getActiveProfile = library => {
  const id = library.activeProfileId;
  if (!id) return null;
  return (
    [...library.official, ...library.community, ...library.my].find(p => p.id === id) || null
  );
};

export const getRuntimeMappings = library => {
  const profile = getActiveProfile(library);
  if (!profile) return [];
  // Only supported and unresolved entries participate in runtime
  // (unresolved entries may have been manually assigned by the user)
  return profile.entries.filter(e => e.status === 'supported' || e.status === 'unresolved');
};

export const allProfiles = library => [
  ...library.official.map(p => ({ ...p, _section: 'official' })),
  ...library.community.map(p => ({ ...p, _section: 'community' })),
  ...library.my.map(p => ({ ...p, _section: 'my' })),
];

// ── Library operations ─────────────────────────────────────────
export const activateProfile = (library, profileId) => ({
  ...library,
  activeProfileId: profileId,
});

export const deactivateProfile = library => ({
  ...library,
  activeProfileId: null,
});

export const addProfile = (library, section, profile) => ({
  ...library,
  [section]: [...library[section], profile],
});

export const updateProfile = (library, profileId, data) => {
  const update = profiles =>
    profiles.map(p =>
      p.id === profileId
        ? {
            ...p,
            ...data,
            metadata: {
              ...p.metadata,
              ...(data.metadata || {}),
              updatedAt: new Date().toISOString(),
            },
            entries: data.entries || p.entries,
          }
        : p
    );
  return {
    ...library,
    official: update(library.official),
    community: update(library.community),
    my: update(library.my),
  };
};

export const deleteProfile = (library, profileId) => {
  const filter = profiles => profiles.filter(p => p.id !== profileId);
  return {
    ...library,
    official: filter(library.official),
    community: filter(library.community),
    my: filter(library.my),
    activeProfileId: library.activeProfileId === profileId ? null : library.activeProfileId,
  };
};

export const duplicateProfile = (library, profileId) => {
  const original = allProfiles(library).find(p => p.id === profileId);
  if (!original) return library;
  const copy = {
    ...original,
    id: genId('profile'),
    metadata: {
      ...original.metadata,
      name: `${original.metadata.name} (Copy)`,
      author: 'Me',
      sourceFormat: 'crosscue-native',
      sourceApplication: 'CROSSCUE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    entries: original.entries.map(e => ({ ...e, id: genId('entry') })),
  };
  return { ...library, my: [...library.my, copy] };
};

// ── Runtime mapping update (backward compat for CrossCue.jsx) ──
export const updateRuntimeMappings = (library, updater) => {
  const profile = getActiveProfile(library);
  if (!profile) return library;
  const next = typeof updater === 'function' ? updater(profile.entries) : updater;
  // Normalize entries from legacy MIDI Learn (which don't have status/controlType)
  const normalized = next.map(e =>
    e.status
      ? e
      : { ...e, status: 'supported', controlType: ACTION_MAP[e.target]?.controlType || 'button' }
  );
  return updateProfile(library, profile.id, { entries: normalized });
};

// ── Export / Import native format ───────────────────────────────
export const exportProfile = profile => {
  const { id, _section, ...rest } = profile;
  return JSON.stringify(
    {
      format: 'crosscue-native',
      formatVersion: FORMAT_VERSION,
      metadata: rest.metadata,
      entries: rest.entries.map(({ id: _entryId, ...entryRest }) => entryRest),
    },
    null,
    2
  );
};

export const importNativeMapping = jsonString => {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('File is not valid JSON');
  }
  if (data.format !== 'crosscue-native' && !Array.isArray(data.entries))
    throw new Error('Файлът не е валиден CROSSCUE MIDI профил или не съдържа мапинг записи.');
  if (data.formatVersion && data.formatVersion > FORMAT_VERSION)
    throw new Error(`Неподдържана версия на формата ${data.formatVersion} (макс. ${FORMAT_VERSION})`);

  const entries = (data.entries || []).map(e =>
    createEntry({ ...e, status: e.status || 'supported' })
  );
  const metadata = data.metadata || {
    name: data.name || 'Imported Profile',
    author: data.author || 'Imported',
    model: data.model || '',
    sourceFormat: 'crosscue-native'
  };
  const profile = createProfile(
    { ...metadata, sourceFormat: 'crosscue-native' },
    entries
  );
  const stats = computeStats(entries);
  return {
    profile,
    preview: {
      ...stats,
      stats,
      entries,
    },
  };
};

// ── Conflict detection ──────────────────────────────────────────
export const detectConflicts = entries => {
  const conflicts = [];
  const seen = new Map();
  for (const entry of entries) {
    if (entry.status === 'unsupported') continue;
    const key = `${entry.deviceId}|${entry.channel}|${entry.type}|${entry.number}`;
    const existing = seen.get(key);
    if (existing && existing.target !== entry.target) {
      conflicts.push({ entry1: existing, entry2: entry });
    } else if (!existing) {
      seen.set(key, entry);
    }
  }
  return conflicts;
};

// ── Stats ───────────────────────────────────────────────────────
export const computeStats = (entries = []) => {
  const list = Array.isArray(entries) ? entries : [];
  const total = list.length;
  const supported = list.filter(e => e && e.status === 'supported').length;
  const unsupported = list.filter(e => e && e.status === 'unsupported').length;
  const unresolved = list.filter(e => e && e.status === 'unresolved').length;
  const coverage = total > 0 ? Math.round((supported / total) * 100) : 0;
  return { total, supported, unsupported, unresolved, coverage };
};