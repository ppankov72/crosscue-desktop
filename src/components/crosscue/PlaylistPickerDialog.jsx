import { useState } from 'react';
import { X, ListPlus, Plus } from 'lucide-react';

// Small modal for picking an existing playlist or creating a new one.
// Used by the Google Drive Browser when adding Drive tracks to a playlist.
export default function PlaylistPickerDialog({ open, onClose, playlists, onPick, onCreate }) {
  const [newName, setNewName] = useState('');
  if (!open) return null;

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="equipment-panel w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#735928] pb-2">
          <span className="deck-label flex items-center gap-2"><ListPlus size={14} /> ADD TO PLAYLIST</span>
          <button className="mini-button" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {playlists.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#a49778]">No playlists yet. Create one below.</p>
          ) : (
            playlists.map(p => (
              <button
                key={p.id}
                className="library-row w-full text-left"
                onClick={() => { onPick(p.id); onClose(); }}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-[#383429] pt-2">
          <div className="flex gap-1">
            <input
              className="source-input flex-1"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New playlist name"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className="mini-button" onClick={handleCreate} disabled={!newName.trim()}>
              <Plus size={13} /> CREATE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}