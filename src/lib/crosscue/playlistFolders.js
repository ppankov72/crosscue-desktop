// Playlist Folders Management Utility for CrossCue
// Allows grouping playlists into folders in local storage without altering audio files.

export const STORAGE_KEY_FOLDERS = 'crosscue-playlist-folders';
const FALLBACK_KEY = 'decksmith-playlist-folders';

export const isSystemPlaylist = (playlist) => {
  if (!playlist) return false;
  return (
    playlist.id === 'playlist-samples' ||
    playlist.id === 'playlist-demo-tracks' ||
    playlist.name === 'Samples' ||
    playlist.name === 'Demo Tracks'
  );
};

export const loadFolders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLDERS) ?? localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[PlaylistFolders] Failed to load folders from localStorage:', err);
    return [];
  }
};

export const saveFolders = (folders) => {
  try {
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
  } catch (err) {
    console.error('[PlaylistFolders] Failed to save folders to localStorage:', err);
  }
};

export const createFolder = (name, folders) => {
  const trimmed = (name || '').trim();
  if (!trimmed) return { folders, newFolder: null };
  const newFolder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    collapsed: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [...folders, newFolder];
  saveFolders(updated);
  return { folders: updated, newFolder };
};

export const renameFolder = (folders, folderId, newName) => {
  const trimmed = (newName || '').trim();
  if (!trimmed) return folders;
  const updated = folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f));
  saveFolders(updated);
  return updated;
};

export const toggleFolderCollapse = (folders, folderId) => {
  const updated = folders.map((f) =>
    f.id === folderId ? { ...f, collapsed: !f.collapsed } : f
  );
  saveFolders(updated);
  return updated;
};

export const deleteFolder = (folders, folderId, playlists) => {
  const updatedFolders = folders.filter((f) => f.id !== folderId);
  saveFolders(updatedFolders);

  // Return playlists from the deleted folder to root (folderId: null)
  const updatedPlaylists = playlists.map((p) =>
    p.folderId === folderId ? { ...p, folderId: null } : p
  );

  return { folders: updatedFolders, playlists: updatedPlaylists };
};

export const movePlaylistToFolder = (playlists, playlistId, targetFolderId) => {
  const cleanFolderId = targetFolderId === 'root' || !targetFolderId ? null : targetFolderId;
  return playlists.map((p) =>
    p.id === playlistId ? { ...p, folderId: cleanFolderId } : p
  );
};

export const batchMovePlaylistsToFolder = (playlists, playlistIds, targetFolderId) => {
  const cleanFolderId = targetFolderId === 'root' || !targetFolderId ? null : targetFolderId;
  const idSet = new Set(playlistIds);
  return playlists.map((p) =>
    idSet.has(p.id) ? { ...p, folderId: cleanFolderId } : p
  );
};