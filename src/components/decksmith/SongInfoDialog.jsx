/**
 * SongInfoDialog — read-only VLC-style "Song Info" display.
 *
 * Shows metadata from three independent sources in clearly separated sections:
 *   GENERAL     — library override → embedded tag → filename fallback
 *   TECHNICAL   — embedded metadata (format, codec, duration, etc.)
 *   TAGS        — embedded tags (TAG BPM, TAG KEY, rating, custom tags, raw tags)
 *   CROSSCUE ANALYSIS — acoustic analysis (analyzed BPM, beat grid, etc.)
 *
 * CRITICAL: TAG BPM and ANALYZED BPM are NEVER conflated.
 * They are displayed in separate sections as independent data sources.
 * Metadata NEVER influences acoustic analysis.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Edit3, RefreshCw, RotateCcw } from 'lucide-react';
import { MetadataStore } from '@/lib/crosscue/analysis';
import { displayValue, hasOverride } from '@/lib/crosscue/metadata/precedence';

export default function SongInfoDialog({ track, onClose, onEditSong, onRereadTags, onResetEdits }) {
  const [loading, setLoading] = useState(true);
  const [embedded, setEmbedded] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [artworkUrl, setArtworkUrl] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const artworkRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (artworkRef.current) {
        URL.revokeObjectURL(artworkRef.current);
        artworkRef.current = null;
        setArtworkUrl(null);
      }
      const fp = track.analysisFingerprint;
      if (!fp) {
        setEmbedded(null); setAnalysis(null); setOverrides(null);
        setLoading(false);
        return;
      }
      const [meta, anal, ovr, art] = await Promise.all([
        MetadataStore.getMetadata(fp),
        MetadataStore.getAnalysis(fp),
        MetadataStore.getOverrides(fp),
        MetadataStore.getArtwork(fp),
      ]);
      if (cancelled) return;
      setEmbedded(meta);
      setAnalysis(anal);
      setOverrides(ovr);
      if (art?.blob) {
        const url = URL.createObjectURL(art.blob);
        artworkRef.current = url;
        setArtworkUrl(url);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [track, reloadKey]);

  useEffect(() => {
    return () => {
      if (artworkRef.current) URL.revokeObjectURL(artworkRef.current);
    };
  }, []);

  const handleReread = async () => {
    await onRereadTags?.(track);
    setReloadKey(k => k + 1);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all library edits to embedded tags for this track?')) return;
    await onResetEdits?.(track);
    setReloadKey(k => k + 1);
  };

  const fp = track.analysisFingerprint;
  const fmtDuration = d => d ? `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}` : '—';
  const fmtBitrate = b => b ? `${Math.round(b / 1000)} kbps` : '—';
  const fmtSize = s => s ? `${(s / 1048576).toFixed(1)} MB` : '—';
  const fmtChannels = c => c === 1 ? 'Mono' : c === 2 ? 'Stereo' : c ? `${c}ch` : '—';
  const fmtPct = c => c != null ? `${(c * 100).toFixed(0)}%` : '—';

  const Row = ({ label, value, override }) => (
    <div className="flex gap-2 py-0.5">
      <span className="w-32 shrink-0 text-[#a49778]">{label}</span>
      <span className="flex-1 break-words text-[#e8dec5]">{value || '—'}</span>
      {override && <span className="shrink-0 text-[10px] font-bold text-[#d5ad58]">EDITED</span>}
    </div>
  );

  const SectionTitle = ({ children }) => (
    <h3 className="mb-1 mt-3 border-b border-[#4b4434] pb-1 text-xs font-bold tracking-wider text-[#d5ad58]">{children}</h3>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="equipment-panel max-h-[85vh] w-full max-w-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wider text-[#d5ad58]">SONG INFO</h2>
          <div className="flex gap-1">
            <button className="mini-button" onClick={handleReread} title="Re-read tags from file" disabled={!track.file || !fp}>
              <RefreshCw size={11} /> RE-READ
            </button>
            <button className="mini-button" onClick={handleReset} disabled={!fp}>
              <RotateCcw size={11} /> RESET EDITS
            </button>
            <button className="mini-button" onClick={() => onEditSong?.(track)} disabled={!fp}>
              <Edit3 size={11} /> EDIT
            </button>
            <button className="mini-button" onClick={onClose}>
              <X size={11} /> CLOSE
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[#a49778]">Loading metadata...</div>
        ) : !fp ? (
          <div className="py-8 text-center text-sm text-[#a49778]">
            Track has not been analyzed yet. Song Info requires analysis for full metadata.
            <br />Basic info: {track.name} — {track.artist || 'Unknown'}
          </div>
        ) : (
          <>
            {artworkUrl && (
              <div className="mb-3 flex justify-center">
                <img src={artworkUrl} alt="Artwork" className="max-h-32 rounded border border-[#4b4434]" />
              </div>
            )}

            <SectionTitle>GENERAL</SectionTitle>
            <Row label="Title" value={displayValue('title', overrides, embedded, track)} override={hasOverride('title', overrides)} />
            <Row label="Artist" value={displayValue('artist', overrides, embedded, track)} override={hasOverride('artist', overrides)} />
            <Row label="Album" value={displayValue('album', overrides, embedded, track)} override={hasOverride('album', overrides)} />
            <Row label="Album Artist" value={displayValue('albumArtist', overrides, embedded, track)} override={hasOverride('albumArtist', overrides)} />
            <Row label="Genre" value={displayValue('genre', overrides, embedded, track)} override={hasOverride('genre', overrides)} />
            <Row label="Year" value={displayValue('year', overrides, embedded, track)} override={hasOverride('year', overrides)} />
            <Row label="Track" value={displayValue('track', overrides, embedded, track)} override={hasOverride('track', overrides)} />
            <Row label="Disc" value={displayValue('disc', overrides, embedded, track)} override={hasOverride('disc', overrides)} />
            <Row label="Composer" value={embedded?.tags?.composer} />
            <Row label="Remixer" value={embedded?.tags?.remixer} />
            <Row label="Conductor" value={embedded?.tags?.conductor} />
            <Row label="Publisher" value={embedded?.tags?.publisher} />
            <Row label="Copyright" value={embedded?.tags?.copyright} />
            <Row label="Comment" value={embedded?.tags?.comment} />
            <Row label="ISRC" value={embedded?.tags?.isrc} />
            <Row label="Tag format" value={embedded?.tagFormat ? `${embedded.tagFormat}${embedded.tagVersion ? ' v' + embedded.tagVersion : ''}` : '—'} />

            <SectionTitle>TECHNICAL</SectionTitle>
            <Row label="File name" value={track.fileMeta?.name || track.name} />
            <Row label="File format" value={embedded?.technical?.format} />
            <Row label="Codec" value={embedded?.technical?.codec} />
            <Row label="Duration" value={fmtDuration(embedded?.technical?.duration || track.analysisDuration)} />
            <Row label="Bitrate" value={fmtBitrate(embedded?.technical?.bitrate)} />
            <Row label="Sample rate" value={embedded?.technical?.sampleRate ? `${embedded.technical.sampleRate} Hz` : '—'} />
            <Row label="Channels" value={fmtChannels(embedded?.technical?.channels)} />
            <Row label="File size" value={fmtSize(embedded?.technical?.fileSize || track.fileMeta?.size)} />

            <SectionTitle>TAGS (embedded in file)</SectionTitle>
            <Row label="Tag BPM" value={embedded?.tags?.bpm} />
            <Row label="Tag Key" value={embedded?.tags?.key} />
            <Row label="Rating" value={overrides?.rating != null ? overrides.rating : embedded?.tags?.rating} override={hasOverride('rating', overrides)} />
            {embedded?.customTags?.length > 0 && (
              <div className="mt-1">
                <span className="text-[#a49778]">Custom tags:</span>
                <div className="ml-8 mt-0.5">
                  {embedded.customTags.map((t, i) => (
                    <div key={i} className="text-xs text-[#d1c5ac]">{t.description || t.id}: {t.value}</div>
                  ))}
                </div>
              </div>
            )}

            <SectionTitle>CROSSCUE ANALYSIS (acoustic)</SectionTitle>
            <Row label="Analyzed BPM" value={analysis?.bpm?.value || track.analysisBpm || '—'} />
            <Row label="BPM confidence" value={analysis?.bpm?.confidence != null ? fmtPct(analysis.bpm.confidence) : track.analysisBpmConfidence ? fmtPct(track.analysisBpmConfidence) : '—'} />
            <Row label="Musical Key" value={analysis?.keyAnalysis?.key || '—'} />
            <Row label="Camelot" value={analysis?.keyAnalysis?.camelot || '—'} />
            <Row label="Open Key" value={analysis?.keyAnalysis?.openKey || '—'} />
            <Row label="Key confidence" value={analysis?.keyAnalysis?.confidence != null ? fmtPct(analysis.keyAnalysis.confidence) : '—'} />
            <Row label="Alternative" value={analysis?.keyAnalysis?.alternative?.key || '—'} />
            <Row label="Alt. confidence" value={analysis?.keyAnalysis?.alternative?.confidence != null ? fmtPct(analysis.keyAnalysis.alternative.confidence) : '—'} />
            <Row label="Beat-grid first beat" value={analysis?.beatGrid?.firstBeat ? `${analysis.beatGrid.firstBeat}s` : '—'} />
            <Row label="Beat interval" value={analysis?.beatGrid?.beatInterval ? `${analysis.beatGrid.beatInterval}s` : '—'} />
            <Row label="Beat-grid confidence" value={analysis?.beatGrid?.confidence != null ? fmtPct(analysis.beatGrid.confidence) : '—'} />
            <Row label="Downbeat" value={analysis?.beatGrid?.downbeat != null ? (analysis.beatGrid.downbeat !== null ? `Beat ${analysis.beatGrid.downbeat + 1}` : 'Provisional') : '—'} />
            <Row label="Downbeat confidence" value={analysis?.beatGrid?.downbeatConfidence != null ? fmtPct(analysis.beatGrid.downbeatConfidence) : '—'} />

            {embedded?.rawTags?.length > 0 && (
              <div className="mt-3">
                <button className="mini-button" onClick={() => setShowAdvanced(s => !s)}>
                  {showAdvanced ? 'Hide' : 'Show'} Advanced / Raw Tags ({embedded.rawTags.length})
                </button>
                {showAdvanced && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-[#4b4434] p-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#a49778]">
                          <th className="text-left pr-2">Frame</th>
                          <th className="text-left pr-2">Description</th>
                          <th className="text-left pr-2">Value</th>
                          <th className="text-right">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {embedded.rawTags.map((t, i) => (
                          <tr key={i} className="text-[#d1c5ac]">
                            <td className="pr-2 font-bold">{t.frame}</td>
                            <td className="pr-2">{t.description}</td>
                            <td className="pr-2 break-all">{t.value}</td>
                            <td className="text-right">{t.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}