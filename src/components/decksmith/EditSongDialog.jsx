/**
 * EditSongDialog — VLC-style "Edit Song" form.
 *
 * Edits are stored as CrossCue library overrides in IndexedDB (libraryOverrides store).
 * The original audio file is NOT modified — tag writing is reserved for a later phase.
 *
 * Precedence: Library override → Embedded tag → Filename fallback
 * "Reset" removes all overrides and restores from embedded tags.
 *
 * CRITICAL: Edits never influence acoustic analysis. TAG BPM is not editable
 * here (it is an embedded value). ANALYZED BPM is not editable (it is an
 * acoustic result). Only display metadata is editable.
 */

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { MetadataStore } from '@/lib/crosscue/analysis';
import { displayValue } from '@/lib/crosscue/metadata/precedence';

const EDITABLE_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'albumArtist', label: 'Album Artist' },
  { key: 'genre', label: 'Genre' },
  { key: 'year', label: 'Year' },
  { key: 'track', label: 'Track' },
  { key: 'disc', label: 'Disc' },
  { key: 'composer', label: 'Composer' },
  { key: 'remixer', label: 'Remixer' },
  { key: 'comment', label: 'Comment' },
];

export default function EditSongDialog({ track, onClose, onSaved, onResetEdits }) {
  const [loading, setLoading] = useState(true);
  const [embedded, setEmbedded] = useState(null);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({});
  const [rating, setRating] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fp = track.analysisFingerprint;
      if (!fp) { setLoading(false); return; }
      const [meta, ovr] = await Promise.all([
        MetadataStore.getMetadata(fp),
        MetadataStore.getOverrides(fp),
      ]);
      if (cancelled) return;
      setEmbedded(meta);
      setExisting(ovr || {});
      const initial = {};
      for (const f of EDITABLE_FIELDS) {
        initial[f.key] = displayValue(f.key, ovr, meta, track);
      }
      setForm(initial);
      setRating(ovr?.rating != null ? String(ovr.rating) : (meta?.tags?.rating || ''));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [track]);

  const handleSave = async () => {
    setSaving(true);
    const fp = track.analysisFingerprint;
    // Merge with existing overrides — only store fields that differ from embedded
    const merged = { ...(existing || {}), trackFingerprint: fp, updatedAt: new Date().toISOString() };
    for (const f of EDITABLE_FIELDS) {
      const val = form[f.key] || '';
      const embeddedVal = embedded?.tags?.[f.key] || (f.key === 'year' ? embedded?.tags?.date : '') || '';
      if (val !== embeddedVal) {
        merged[f.key] = val;
      } else {
        delete merged[f.key];
      }
    }
    // Rating
    const embeddedRating = embedded?.tags?.rating || '';
    if (rating && String(rating) !== String(embeddedRating)) {
      merged.rating = Number(rating);
    } else {
      delete merged.rating;
    }
    // Persist
    const hasFields = EDITABLE_FIELDS.some(f => merged[f.key] != null) || merged.rating != null;
    if (hasFields) {
      await MetadataStore.putOverrides(fp, merged);
    } else {
      await MetadataStore.deleteOverrides(fp);
    }
    // Update track record for library display
    onSaved?.(track, {
      name: form.title || track.name,
      artist: form.artist || '',
      album: form.album || '',
      genre: form.genre || '',
    });
    setSaving(false);
    onClose();
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all library edits to embedded tags for this track?')) return;
    await onResetEdits?.(track);
    onClose();
  };

  const fp = track.analysisFingerprint;
  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="equipment-panel max-h-[85vh] w-full max-w-lg overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wider text-[#d5ad58]">EDIT SONG</h2>
          <div className="flex gap-1">
            <button className="mini-button" onClick={handleReset} disabled={!fp}>
              <RotateCcw size={11} /> RESET
            </button>
            <button className="mini-button" onClick={onClose}>
              <X size={11} /> CLOSE
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[#a49778]">Loading...</div>
        ) : !fp ? (
          <div className="py-8 text-center text-sm text-[#a49778]">
            Track has not been analyzed yet. Edit Song requires analysis for metadata identity.
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-[#a49778]">
              Edits are stored as CrossCue library overrides. The original file is not modified.
              Precedence: Library override → Embedded tag → Filename fallback.
            </p>
            <div className="space-y-2">
              {EDITABLE_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-xs text-[#a49778]">{f.label}</label>
                  <input
                    type="text"
                    value={form[f.key] || ''}
                    onChange={e => update(f.key, e.target.value)}
                    className="source-input flex-1"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <label className="w-28 shrink-0 text-xs text-[#a49778]">Rating</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="1"
                  value={rating}
                  onChange={e => setRating(e.target.value)}
                  className="source-input w-20"
                />
                <span className="text-xs text-[#a49778]">0-5 stars</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="metal-button" onClick={onClose}>Cancel</button>
              <button className="metal-button vinyl-active" onClick={handleSave} disabled={saving}>
                <Save size={12} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}