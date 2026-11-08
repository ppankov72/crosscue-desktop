// Local music directory registry — localStorage-based.
// Stores known folder metadata (name, track count, track IDs, last scanned).
// Does NOT store absolute filesystem paths (browsers don't expose them).
// "REMOVE FROM CROSSCUE" removes the folder from the registry only — never deletes files.

const STORAGE_KEY = 'crosscue-known-folders';

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function write(folders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

function generateId() {
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const KnownFoldersStore = {
  list() {
    return read();
  },

  add(folder) {
    const folders = read();
    // Match by name to update existing folder
    const existing = folders.find(f => f.name === folder.name);
    if (existing) {
      Object.assign(existing, {
        ...folder,
        id: existing.id,
        lastScanned: new Date().toISOString(),
      });
      write(folders);
      return existing;
    }
    const entry = {
      id: folder.id || generateId(),
      name: folder.name,
      trackCount: folder.trackCount || 0,
      trackIds: folder.trackIds || [],
      lastScanned: new Date().toISOString(),
      recursive: folder.recursive ?? true,
    };
    folders.push(entry);
    write(folders);
    return entry;
  },

  update(id, data) {
    const folders = read();
    const folder = folders.find(f => f.id === id);
    if (folder) {
      Object.assign(folder, data, { lastScanned: new Date().toISOString() });
      write(folders);
    }
    return folder;
  },

  remove(id) {
    const folders = read();
    const filtered = folders.filter(f => f.id !== id);
    write(filtered);
    return folders.length !== filtered.length;
  },

  // Remove track ID from all folders (when a track is deleted from library)
  removeTrackFromAll(trackId) {
    const folders = read();
    let changed = false;
    for (const folder of folders) {
      if (folder.trackIds?.includes(trackId)) {
        folder.trackIds = folder.trackIds.filter(id => id !== trackId);
        folder.trackCount = folder.trackIds.length;
        changed = true;
      }
    }
    if (changed) write(folders);
  },

  clear() {
    write([]);
  },
};