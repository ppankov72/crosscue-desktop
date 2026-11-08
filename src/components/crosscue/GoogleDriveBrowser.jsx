import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { HardDrive, RefreshCw, Loader2, FolderOpen, X, Library, ListPlus, Check } from 'lucide-react';
import PlaylistPickerDialog from './PlaylistPickerDialog';

const CONNECTOR_ID = '6a9f409efe7b680bb256241d';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function GoogleDriveBrowser({
  open,
  onClose,
  onLoadToDeck,
  onAddToLibrary,
  onAddToPlaylist,
  onCreatePlaylist,
  playlists,
  existingDriveFileIds,
  error: externalError,
  trialToken,
  isAnonymous,
}) {
  const [authed, setAuthed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingTrack, setLoadingTrack] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTracks, setPickerTracks] = useState([]);

  const fetchTracks = useCallback(async (pageToken) => {
    try {
      const res = await base44.functions.invoke('listGoogleDriveTracks', { pageToken, trial_token: isAnonymous ? trialToken : undefined });
      if (pageToken) {
        setTracks(prev => [...prev, ...res.data.tracks]);
      } else {
        setTracks(res.data.tracks);
      }
      setNextPageToken(res.data.nextPageToken);
      setConnected(true);
      setError(null);
    } catch (err) {
      const data = err.response?.data || err;
      if (data.notConnected) {
        setConnected(false);
        setTracks([]);
      } else {
        setError(data.error || err.message || 'Failed to load tracks');
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    if (isAnonymous) {
      // Anonymous trial user — fetch tracks directly; fetchTracks handles notConnected.
      fetchTracks().finally(() => setLoading(false));
    } else {
      base44.auth.isAuthenticated().then(async (isAuthed) => {
        setAuthed(isAuthed);
        if (isAuthed) {
          await fetchTracks();
        }
        setLoading(false);
      });
    }
  }, [open, fetchTracks, isAnonymous]);

  const handleConnect = async () => {
    try {
      let url;
      if (isAnonymous) {
        // Anonymous trial user — custom OAuth flow (tokens stored by trial_token).
        const res = await base44.functions.invoke('initiateDriveOAuth', { trial_token: trialToken });
        url = res.data.url;
      } else {
        // Authenticated CROSSCUE user — APP_USER connector flow.
        url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      }
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchTracks();
        }
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to start Google Drive connection');
    }
  };

  const handleDisconnect = async () => {
    try {
      if (isAnonymous) {
        await base44.functions.invoke('disconnectDriveOAuth', { trial_token: trialToken });
      } else {
        await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      }
      setConnected(false);
      setTracks([]);
      setNextPageToken(null);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const handleLoadTrack = async (track, deckId) => {
    setLoadingTrack(track.id);
    setError(null);
    try {
      const res = await base44.functions.invoke('getGoogleDriveFile', { fileId: track.id, trial_token: isAnonymous ? trialToken : undefined });
      const { base64Content, fileName, mimeType } = res.data;

      // Decode base64 to Blob
      const byteChars = atob(base64Content);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });

      onLoadToDeck(deckId, file, track);
    } catch (err) {
      const data = err.response?.data || err;
      setError(data.error || err.message || 'Failed to load track');
    } finally {
      setLoadingTrack(null);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchTracks(nextPageToken);
    setLoadingMore(false);
  };

  // --- Library / Playlist actions ---

  const isInLibrary = (track) => existingDriveFileIds?.has(track.id);

  const handleAddToLibrary = (track) => {
    onAddToLibrary?.([track]);
  };

  const handleAddSelectedToLibrary = () => {
    const selected = tracks.filter(t => selectedIds.has(t.id));
    if (selected.length) onAddToLibrary?.(selected);
  };

  const handleAddToPlaylist = (track) => {
    setPickerTracks([track]);
    setPickerOpen(true);
  };

  const handleAddSelectedToPlaylist = () => {
    const selected = tracks.filter(t => selectedIds.has(t.id));
    if (selected.length) {
      setPickerTracks(selected);
      setPickerOpen(true);
    }
  };

  const handlePickerPick = (playlistId) => {
    onAddToPlaylist?.(pickerTracks, playlistId);
    setPickerTracks([]);
  };

  const handlePickerCreate = (name) => {
    onCreatePlaylist?.(name, pickerTracks);
    setPickerTracks([]);
  };

  // --- Multi-select ---

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = tracks.length > 0 && tracks.every(t => selectedIds.has(t.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(tracks.map(t => t.id)));
  };

  if (!open) return null;

  const displayError = externalError || error;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div
          className="equipment-panel flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#735928] pb-2">
            <span className="deck-label flex items-center gap-2">
              <HardDrive size={16} /> GOOGLE DRIVE
            </span>
            <button className="mini-button" onClick={onClose}><X size={13} /> CLOSE</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#d5ad58]" size={24} />
            </div>
          ) : !connected ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-sm text-[#a49778]">Connect your Google Drive to browse and load audio files</p>
              {isAnonymous && (
                <p className="mb-4 text-xs text-[#a49778]">Your Google account is a storage provider only — it does not replace your DJ identity or trial session.</p>
              )}
              <button className="metal-button" onClick={handleConnect}>
                <FolderOpen size={14} /> CONNECT GOOGLE DRIVE
              </button>
              {displayError && <p className="mt-4 text-sm text-[#ff2800]">{displayError}</p>}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#a49778]">
                  {tracks.length} track{tracks.length !== 1 ? 's' : ''} found
                  {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
                </span>
                <div className="flex gap-1">
                  <button className="mini-button" onClick={() => { setSelectedIds(new Set()); fetchTracks(); }}>
                    <RefreshCw size={13} /> REFRESH
                  </button>
                  <button className="mini-button" onClick={handleDisconnect}>DISCONNECT</button>
                </div>
              </div>

              {displayError && <p className="py-2 text-sm text-[#ff2800]">{displayError}</p>}

              {selectedIds.size > 0 && (
                <div className="flex flex-wrap gap-1 border-b border-[#383429] pb-2">
                  <button className="mini-button" onClick={handleAddSelectedToLibrary}>
                    <Library size={12} /> ADD SELECTED TO LIBRARY
                  </button>
                  <button className="mini-button" onClick={handleAddSelectedToPlaylist}>
                    <ListPlus size={12} /> ADD SELECTED TO PLAYLIST
                  </button>
                  <button className="mini-button" onClick={() => setSelectedIds(new Set())}>CLEAR</button>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto">
                {tracks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#a49778]">
                    No audio files found in your Google Drive
                  </p>
                ) : (
                  <>
                    <div className="library-row flex items-center gap-2 border-b border-[#383429]">
                      <input
                        aria-label="Select all tracks"
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="shrink-0"
                      />
                      <span className="flex-1 text-xs font-bold tracking-wider text-[#a49778]">SELECT ALL</span>
                    </div>
                    {tracks.map(track => {
                      const inLib = isInLibrary(track);
                      return (
                        <div key={track.id} className="library-row flex items-center gap-2">
                          <input
                            aria-label={'Select ' + track.name}
                            type="checkbox"
                            checked={selectedIds.has(track.id)}
                            onChange={() => toggleSelect(track.id)}
                            className="shrink-0"
                          />
                          <span className="flex-1 truncate text-sm font-medium">{track.name}</span>
                          <span className="whitespace-nowrap text-xs text-[#a49778]">{formatSize(track.size)}</span>
                          {inLib && (
                            <span className="flex shrink-0 items-center gap-0.5 text-[9px] font-bold text-[#d5ad58]">
                              <Check size={10} /> IN LIBRARY
                            </span>
                          )}
                          <div className="flex shrink-0 gap-1">
                            <button
                              className="mini-button"
                              disabled={inLib}
                              onClick={() => handleAddToLibrary(track)}
                              title={inLib ? 'Already in Library' : 'Add to Library'}
                            >
                              <Library size={11} /> +LIB
                            </button>
                            <button
                              className="mini-button"
                              onClick={() => handleAddToPlaylist(track)}
                              title="Add to Playlist"
                            >
                              <ListPlus size={11} /> +LIST
                            </button>
                            <button
                              className="mini-button"
                              disabled={loadingTrack === track.id}
                              onClick={() => handleLoadTrack(track, 'A')}
                              title="Load to Deck A"
                            >
                              {loadingTrack === track.id ? <Loader2 size={11} className="animate-spin" /> : 'A'}
                            </button>
                            <button
                              className="mini-button"
                              disabled={loadingTrack === track.id}
                              onClick={() => handleLoadTrack(track, 'B')}
                              title="Load to Deck B"
                            >
                              {loadingTrack === track.id ? <Loader2 size={11} className="animate-spin" /> : 'B'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {nextPageToken && (
                <div className="border-t border-[#383429] py-2 text-center">
                  <button className="mini-button" disabled={loadingMore} onClick={handleLoadMore}>
                    {loadingMore ? <Loader2 size={13} className="animate-spin" /> : 'LOAD MORE'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <PlaylistPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        playlists={playlists || []}
        onPick={handlePickerPick}
        onCreate={handlePickerCreate}
      />
    </>
  );
}