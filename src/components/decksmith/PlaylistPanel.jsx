import { useRef, useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Plus,
  Music,
  FolderInput,
} from 'lucide-react';
import LibraryTrackList, { filterTracks } from './LibraryTrackList';
import SelectionActions from './SelectionActions';
import {
  loadFolders,
  saveFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  toggleFolderCollapse,
  movePlaylistToFolder,
  batchMovePlaylistsToFolder,
  isSystemPlaylist,
} from '@/lib/crosscue/playlistFolders';

const audioAccept =
  'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac,.mp3,.wav,.ogg,.m4a,.aac,.flac';

export default function PlaylistPanel({
  playlists,
  setPlaylists,
  tracks,
  selected,
  setSelected,
  onAdd,
  onLoad,
  favorites,
  onFavorite,
  onAddFiles,
  onReconnect,
  onRemoveFile,
  onAuto,
  onSongInfo,
  onEditSong,
  onRereadTags,
  onResetEdits,
  query,
  mode,
  onAssignSampler,
}) {
  const [folders, setFolders] = useState(() => loadFolders());
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [targetFolderForNew, setTargetFolderForNew] = useState('root');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [draggingAudio, setDraggingAudio] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [draggedPlaylistId, setDraggedPlaylistId] = useState(null);
  const [folderDragOverId, setFolderDragOverId] = useState(null);

  const picker = useRef();
  const current = playlists.find((playlist) => playlist.id === selected);
  const isSamples = (playlist) => isSystemPlaylist(playlist);
  const listed = filterTracks(
    (current?.trackIds || [])
      .map((id) => tracks.find((track) => track.id === id))
      .filter(Boolean),
    query,
    mode
  );

  // Sync folders to localStorage
  useEffect(() => {
    saveFolders(folders);
  }, [folders]);

  // Playlist creation
  const handleCreatePlaylist = (folderId = targetFolderForNew) => {
    const value = newPlaylistName.trim();
    if (!value) return;
    const cleanFolderId = folderId === 'root' || !folderId ? null : folderId;
    const playlist = {
      id: `playlist-${Date.now()}`,
      name: value,
      trackIds: [],
      folderId: cleanFolderId,
    };
    setPlaylists([...playlists, playlist]);
    setSelected(playlist.id);
    setNewPlaylistName('');
  };

  // Folder creation
  const handleCreateFolder = () => {
    const value = newFolderName.trim();
    if (!value) return;
    const { folders: nextFolders, newFolder } = createFolder(value, folders);
    setFolders(nextFolders);
    if (newFolder) {
      setTargetFolderForNew(newFolder.id);
    }
    setNewFolderName('');
    setShowFolderInput(false);
  };

  // Folder rename
  const handleRenameFolder = (folderId, oldName) => {
    const value = window.prompt('Ново име на папка / Folder name:', oldName);
    if (value && value.trim() && value.trim() !== oldName) {
      setFolders(renameFolder(folders, folderId, value.trim()));
    }
  };

  // Folder delete
  const handleDeleteFolder = (folderId, folderName) => {
    const count = playlists.filter((p) => p.folderId === folderId).length;
    const message = count > 0
      ? `Изтриване на папка "${folderName}"? ${count} плейлиста ще се преместят в основния списък (Root).`
      : `Изтриване на папка "${folderName}"?`;
    if (!window.confirm(message)) return;

    const { folders: nextFolders, playlists: nextPlaylists } = deleteFolder(
      folders,
      folderId,
      playlists
    );
    setFolders(nextFolders);
    setPlaylists(nextPlaylists);
  };

  // Folder collapse toggle
  const handleToggleCollapse = (folderId) => {
    setFolders(toggleFolderCollapse(folders, folderId));
  };

  // Move single playlist
  const handleMovePlaylist = (playlistId, targetFolderId) => {
    const updated = movePlaylistToFolder(playlists, playlistId, targetFolderId);
    setPlaylists(updated);
  };

  // Batch move playlists
  const handleBatchMove = (targetFolderId) => {
    if (!selectedPlaylists.length || !targetFolderId) return;
    const updated = batchMovePlaylistsToFolder(playlists, selectedPlaylists, targetFolderId);
    setPlaylists(updated);
    setSelectedPlaylists([]);
  };

  // Rename current playlist
  const handleRenamePlaylist = () => {
    const value = window.prompt('Име на плейлист / Playlist name:', current?.name);
    if (value?.trim()) {
      setPlaylists(
        playlists.map((playlist) =>
          playlist.id === selected ? { ...playlist, name: value.trim() } : playlist
        )
      );
    }
  };

  // Delete playlists
  const deletePlaylists = (ids) => {
    const deletable = ids.filter(
      (id) => !isSamples(playlists.find((playlist) => playlist.id === id))
    );
    if (
      !deletable.length ||
      !window.confirm(
        `Delete ${deletable.length} playlist${
          deletable.length === 1 ? '' : 's'
        }? Tracks will remain in the Music Library.`
      )
    )
      return;
    setPlaylists(playlists.filter((playlist) => !deletable.includes(playlist.id)));
    if (deletable.includes(selected)) setSelected('');
    setSelectedPlaylists([]);
  };

  // Add files to current playlist
  const addFiles = (files) => {
    const added = onAddFiles(files);
    setPlaylists((items) =>
      items.map((playlist) =>
        playlist.id === selected
          ? {
              ...playlist,
              trackIds: [
                ...new Set([...playlist.trackIds, ...added.map((track) => track.id)]),
              ],
            }
          : playlist
      )
    );
  };

  // Remove tracks from playlist
  const removeTracks = (ids) => {
    if (
      !ids.length ||
      !window.confirm(
        `Remove ${ids.length} selected track${ids.length === 1 ? '' : 's'} from this playlist?`
      )
    )
      return;
    setPlaylists((items) =>
      items.map((playlist) =>
        playlist.id === selected
          ? {
              ...playlist,
              trackIds: playlist.trackIds.filter((id) => !ids.includes(id)),
            }
          : playlist
      )
    );
    setSelectedTracks([]);
  };

  const toggleTrack = (id) =>
    setSelectedTracks((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );

  const selectTracks = (ids, all) =>
    setSelectedTracks(
      all
        ? [...new Set([...selectedTracks, ...ids])]
        : selectedTracks.filter((id) => !ids.includes(id))
    );

  const togglePlaylist = (id) =>
    setSelectedPlaylists((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
    );

  const dropAudio = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingAudio(false);
    if (current) addFiles([...event.dataTransfer.files]);
  };

  // Group playlists by folder
  const rootPlaylists = playlists.filter(
    (p) => !p.folderId || !folders.some((f) => f.id === p.folderId)
  );

  return (
    <div className="mt-2 space-y-3">
      {/* Top Action Bar: Create Playlist & Create Folder */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#383429] pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            className="source-input w-36 text-xs"
            value={newPlaylistName}
            onChange={(event) => setNewPlaylistName(event.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
            placeholder="New playlist name"
          />
          {folders.length > 0 && (
            <select
              className="source-input text-xs py-1"
              value={targetFolderForNew}
              onChange={(e) => setTargetFolderForNew(e.target.value)}
              title="Папка за новия плейлист"
            >
              <option value="root">📁 Root (без папка)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="mini-button text-amber-300 border-amber-600/70"
            onClick={() => handleCreatePlaylist()}
            disabled={!newPlaylistName.trim()}
          >
            <Plus size={12} /> PLAYLIST
          </button>
        </div>

        {/* Create Folder button & drawer */}
        <div className="flex items-center gap-1.5">
          {showFolderInput ? (
            <div className="flex items-center gap-1">
              <input
                className="source-input w-36 text-xs border-amber-500/80"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Folder name"
                autoFocus
              />
              <button
                className="mini-button vinyl-active text-xs"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                ADD
              </button>
              <button
                className="mini-button text-xs"
                onClick={() => {
                  setShowFolderInput(false);
                  setNewFolderName('');
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="mini-button text-stone-200 border-[#625a49] hover:text-amber-200"
              onClick={() => setShowFolderInput(true)}
              title="Създай нова папка за плейлисти"
            >
              <FolderPlus size={13} className="text-amber-400" /> + FOLDER
            </button>
          )}

          {/* Batch move dropdown if multiple playlists selected */}
          {selectedPlaylists.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#a49778]">
                {selectedPlaylists.length} sel:
              </span>
              <select
                className="source-input text-[11px] py-1 border-amber-500/80"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleBatchMove(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  MOVE TO FOLDER...
                </option>
                <option value="root">📁 Root (без папка)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Folders & Playlists Organization Tree */}
      <div className="rounded border border-[#383429] bg-[#141413] p-2 space-y-2">
        {/* Custom Folders Section */}
        {folders.map((folder) => {
          const folderPlaylists = playlists.filter((p) => p.folderId === folder.id);
          const isOver = folderDragOverId === folder.id;

          return (
            <div
              key={folder.id}
              className={`rounded border transition-colors ${
                isOver
                  ? 'border-amber-400 bg-amber-950/20'
                  : 'border-[#2d2a23] bg-[#1a1917]/70'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setFolderDragOverId(folder.id);
              }}
              onDragLeave={() => setFolderDragOverId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setFolderDragOverId(null);
                if (draggedPlaylistId) {
                  handleMovePlaylist(draggedPlaylistId, folder.id);
                  setDraggedPlaylistId(null);
                }
              }}
            >
              {/* Folder header */}
              <div className="flex items-center justify-between px-2 py-1.5 text-xs text-[#eee1c6] select-none">
                <div
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={() => handleToggleCollapse(folder.id)}
                >
                  <button
                    className="text-[#a49778] hover:text-[#eee1c6]"
                    aria-label="Toggle folder"
                  >
                    {folder.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {folder.collapsed ? (
                    <Folder size={14} className="text-amber-500" />
                  ) : (
                    <FolderOpen size={14} className="text-amber-400" />
                  )}
                  <span className="font-bold tracking-wide text-amber-200">
                    {folder.name}
                  </span>
                  <span className="text-[10px] text-[#8e8267]">
                    ({folderPlaylists.length})
                  </span>
                </div>

                {/* Folder actions */}
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 text-[#8e8267] hover:text-amber-300 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameFolder(folder.id, folder.name);
                    }}
                    title="Преименувай папка"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    className="p-1 text-[#8e8267] hover:text-red-400 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder.id, folder.name);
                    }}
                    title="Изтрий папка (плейлистите се връщат в Root)"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Folder Playlists (expanded) */}
              {!folder.collapsed && (
                <div className="border-t border-[#29261f] px-3 py-2">
                  {folderPlaylists.length === 0 ? (
                    <p className="text-[11px] text-[#786e58] italic py-1">
                      Папката е празна. Плъзнете плейлист тук или използвайте бутона за преместване.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {folderPlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          draggable
                          onDragStart={() => setDraggedPlaylistId(playlist.id)}
                          onDragEnd={() => setDraggedPlaylistId(null)}
                          className="flex items-center gap-1 text-[11px] text-[#d9ceb7] bg-[#22201b] border border-[#3f3a2f] rounded px-1.5 py-0.5"
                        >
                          <input
                            aria-label={'Select ' + playlist.name}
                            type="checkbox"
                            checked={selectedPlaylists.includes(playlist.id)}
                            onChange={() => togglePlaylist(playlist.id)}
                          />
                          <button
                            className={
                              selected === playlist.id
                                ? 'mini-button vinyl-active'
                                : 'mini-button border-0 bg-transparent shadow-none'
                            }
                            onClick={() => {
                              setSelected(playlist.id);
                              setSelectedTracks([]);
                            }}
                          >
                            <Music size={11} className="mr-1 text-amber-500/80 inline" />
                            {playlist.name}
                            <span className="ml-1 text-[9px] text-[#a49778]">
                              ({playlist.trackIds.length})
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Root / Unfiled Playlists */}
        <div
          className={`rounded border transition-colors ${
            folderDragOverId === 'root'
              ? 'border-amber-400 bg-amber-950/20'
              : 'border-[#2d2a23] bg-[#1a1917]/70'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setFolderDragOverId('root');
          }}
          onDragLeave={() => setFolderDragOverId(null)}
          onDrop={(e) => {
            e.preventDefault();
            setFolderDragOverId(null);
            if (draggedPlaylistId) {
              handleMovePlaylist(draggedPlaylistId, null);
              setDraggedPlaylistId(null);
            }
          }}
        >
          <div className="flex items-center justify-between px-2 py-1.5 text-xs text-[#a49778]">
            <span className="font-bold tracking-wider flex items-center gap-1.5 text-stone-300">
              <Folder size={13} className="text-stone-400" />
              {folders.length > 0 ? 'ROOT / ОБЩИ ПЛЕЙЛИСТИ' : 'ВСИЧКИ ПЛЕЙЛИСТИ'}
              <span className="text-[10px] text-[#8e8267]">({rootPlaylists.length})</span>
            </span>
          </div>

          <div className="border-t border-[#29261f] px-3 py-2">
            {rootPlaylists.length === 0 ? (
              <p className="text-[11px] text-[#786e58] italic py-1">Няма общи плейлисти.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {rootPlaylists.map((playlist) => {
                  const system = isSamples(playlist);
                  return (
                    <div
                      key={playlist.id}
                      draggable={!system}
                      onDragStart={() => setDraggedPlaylistId(playlist.id)}
                      onDragEnd={() => setDraggedPlaylistId(null)}
                      className="flex items-center gap-1 text-[11px] text-[#d9ceb7] bg-[#22201b] border border-[#3f3a2f] rounded px-1.5 py-0.5"
                    >
                      <input
                        aria-label={'Select ' + playlist.name}
                        type="checkbox"
                        checked={selectedPlaylists.includes(playlist.id)}
                        onChange={() => togglePlaylist(playlist.id)}
                      />
                      <button
                        className={
                          selected === playlist.id
                            ? 'mini-button vinyl-active'
                            : 'mini-button border-0 bg-transparent shadow-none'
                        }
                        onClick={() => {
                          setSelected(playlist.id);
                          setSelectedTracks([]);
                        }}
                      >
                        <Music size={11} className="mr-1 text-amber-500/80 inline" />
                        {playlist.name}
                        {system && (
                          <span
                            className="ml-1 text-[8px] bg-[#3a3327] px-1 rounded text-amber-300"
                            title="Системен защитен плейлист"
                          >
                            SYSTEM
                          </span>
                        )}
                        <span className="ml-1 text-[9px] text-[#a49778]">
                          ({playlist.trackIds.length})
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playlist selection action bar */}
      <SelectionActions
        selected={selectedPlaylists.length}
        total={playlists.length}
        onSelectAll={() => setSelectedPlaylists(playlists.map((playlist) => playlist.id))}
        onClear={() => setSelectedPlaylists([])}
        onDeleteSelected={() => deletePlaylists(selectedPlaylists)}
        onDeleteAll={() => deletePlaylists(playlists.map((playlist) => playlist.id))}
        label="PLAYLISTS"
        allowDelete={
          !selectedPlaylists.some((id) =>
            isSamples(playlists.find((playlist) => playlist.id === id))
          )
        }
      />

      {/* Active Selected Playlist Controls & Metadata */}
      {current && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#383429] pb-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#f3e48a] flex items-center gap-1">
              <Music size={13} className="text-amber-400" />
              {current.name}
            </span>

            {/* Folder relocation selector */}
            <div className="flex items-center gap-1 text-[11px] text-[#a49778] ml-2">
              <FolderInput size={12} className="text-amber-500/70" />
              <span>Папка:</span>
              <select
                className="source-input text-[11px] py-0.5 px-1.5"
                value={current.folderId || 'root'}
                onChange={(e) => handleMovePlaylist(current.id, e.target.value)}
              >
                <option value="root">📁 Root (без папка)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="mini-button" onClick={handleRenamePlaylist}>
              RENAME
            </button>
            {!isSamples(current) && (
              <button
                className="mini-button text-red-300 hover:text-red-200"
                onClick={() => deletePlaylists([current.id])}
              >
                DELETE PLAYLIST
              </button>
            )}
            <button
              className="mini-button text-amber-300 border-amber-600/70"
              onClick={() => picker.current?.click()}
            >
              + ADD TRACKS
            </button>
            <input
              ref={picker}
              className="hidden"
              type="file"
              accept={audioAccept}
              multiple
              onChange={(event) => {
                addFiles([...event.target.files]);
                event.target.value = '';
              }}
            />
          </div>
        </div>
      )}

      {/* Track List inside Selected Playlist */}
      {current ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDraggingAudio(true);
          }}
          onDragLeave={() => setDraggingAudio(false)}
          onDrop={dropAudio}
          className={
            draggingAudio
              ? 'border-2 border-dashed border-[#d5ad58] bg-amber-950/10'
              : 'border border-transparent'
          }
        >
          <LibraryTrackList
            tracks={listed}
            showIndex
            onLoad={onLoad}
            favorites={favorites}
            onFavorite={onFavorite}
            onAdd={onAdd}
            onRemove={(id) => removeTracks([id])}
            onDelete={onRemoveFile}
            onReconnect={onReconnect}
            onAuto={onAuto}
            onRemoveFromPlaylist={(id) => removeTracks([id])}
            onSongInfo={onSongInfo}
            onEditSong={onEditSong}
            onRereadTags={onRereadTags}
            onResetEdits={onResetEdits}
            onAssignSampler={current?.name === 'Samples' ? onAssignSampler : undefined}
            selectedIds={selectedTracks}
            onToggleSelection={toggleTrack}
            onSelectAll={selectTracks}
          />
          <SelectionActions
            selected={selectedTracks.length}
            total={listed.length}
            onSelectAll={() => setSelectedTracks(listed.map((track) => track.id))}
            onClear={() => setSelectedTracks([])}
            onDeleteSelected={() => removeTracks(selectedTracks)}
            onDeleteAll={() => removeTracks(listed.map((track) => track.id))}
          />
        </div>
      ) : (
        <p className="p-4 text-center text-xs text-[#9d8b69]">
          Създайте или изберете плейлист, след което добавете локални файлове или използвайте ADD TO PLAYLIST от музикалната библиотека.
        </p>
      )}
    </div>
  );
}