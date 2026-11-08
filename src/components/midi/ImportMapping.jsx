import { useState, useRef } from 'react';
import { importTsi, detectFormat } from '@/lib/midi/tsiImporter';
import { importMixxx } from '@/lib/midi/mixxxImporter';
import { importNativeMapping, createProfile, computeStats, detectConflicts } from '@/lib/midi/mappingProfile';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import ActionBrowser from './ActionBrowser';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

const STATUS_BADGE = {
  supported: { label: 'SUPPORTED', cls: 'text-green-400' },
  unsupported: { label: 'UNSUPPORTED', cls: 'text-red-400' },
  unresolved: { label: 'UNRESOLVED', cls: 'text-amber-400' },
};

const PAGE_SIZE = 50;

export default function ImportMapping({ onSave, language }) {
  const { t } = useMidiTranslations(language);
  const [preview, setPreview] = useState(null); // { deviceName, entries, stats, format }
  const [error, setError] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [mappingName, setMappingName] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [page, setPage] = useState(0);
  const fileRef = useRef(null);

  const handleFile = async file => {
    setError(null);
    setPreview(null);
    setParsing(true);
    if (!file) { setParsing(false); return; }

    let content;
    try {
      content = await file.text();
    } catch {
      setError('Could not read file.');
      setParsing(false);
      return;
    }

    // Yield to the browser so the "Parsing..." indicator renders before the
    // (potentially heavy) synchronous parse blocks the main thread.
    await new Promise(r => setTimeout(r, 50));

    const format = detectFormat(file.name, content);
    try {
      if (format === 'traktor-tsi') {
        const result = importTsi(content);
        setPreview({ ...result, format: 'Traktor TSI' });
        setMappingName(result.deviceName ? `${result.deviceName} (TSI Import)` : 'Traktor Import');
        setConflicts(detectConflicts(result.entries));
      } else if (format === 'mixxx') {
        const result = importMixxx(content);
        setPreview({ ...result, format: 'Mixxx Preset' });
        setMappingName(result.deviceName ? `${result.deviceName} (Mixxx Import)` : 'Mixxx Import');
        setConflicts(detectConflicts(result.entries));
      } else if (format === 'crosscue-native') {
        const result = importNativeMapping(content);
        const stats = result.preview?.stats || computeStats(result.preview?.entries || []);
        setPreview({
          ...result.preview,
          stats,
          deviceName: result.profile.metadata.model || result.profile.metadata.name || 'CROSSCUE Mapping',
          format: 'CROSSCUE Native',
          profile: result.profile
        });
        setMappingName(result.profile.metadata.name);
        setConflicts(detectConflicts(result.preview.entries));
      } else {
        setError(t.importTab.unsupportedFormat(file.name));
      }
      setPage(0);
    } catch (e) {
      setError(e.message || 'Failed to parse file.');
    }
    setParsing(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const assignAction = (entryId, actionId) => {
    setPreview(prev => {
      const entries = prev.entries.map(e =>
        e.id === entryId ? { ...e, target: actionId, status: 'supported' } : e
      );
      setConflicts(detectConflicts(entries));
      return { ...prev, entries, stats: computeStats(entries) };
    });
    setEditingEntry(null);
  };

  const handleSave = () => {
    if (!preview) return;
    const profile = createProfile(
      {
        name: mappingName || 'Imported Mapping',
        manufacturer: preview.deviceName || '',
        model: preview.deviceName || '',
        sourceFormat: preview.format === 'Traktor TSI' ? 'traktor-tsi' : preview.format === 'Mixxx Preset' ? 'mixxx' : 'crosscue-native',
        sourceApplication: preview.format === 'Traktor TSI' ? 'Traktor' : preview.format === 'Mixxx Preset' ? 'Mixxx' : 'CROSSCUE',
        status: 'experimental',
        author: 'Me',
      },
      preview.entries
    );
    mappingLibraryStore.add('my', profile);
    onSave?.();
  };

  return (
    <div className="space-y-4">
      {/* File drop zone */}
      {!preview && !parsing && (
        <div
          className="border-2 border-dashed border-[#515a63] p-8 text-center"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <p className="text-sm text-[#eee1c6]">{t.importTab.dropTitle}</p>
          <p className="mt-1 text-xs text-[#a49778]">{t.importTab.dropSubtitle}</p>
          <p className="mt-1 text-[10px] text-[#a49778]">{t.importTab.largeFileNotice}</p>
          <button className="metal-button mt-3" onClick={() => fileRef.current?.click()}>
            {t.importTab.selectFileBtn}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".tsi,.xml,.crosscue-map,.json,application/xml,text/xml"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {parsing && (
        <div className="border-2 border-[#515a63] p-8 text-center">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#515a63] border-t-[#d5ad58]"></div>
          <p className="text-sm text-[#eee1c6]">{t.importTab.parsingTitle}</p>
          <p className="mt-1 text-xs text-[#a49778]">{t.importTab.parsingSubtitle}</p>
        </div>
      )}

      {error && <p className="rounded border border-red-500 bg-red-900/30 p-2 text-xs text-red-400">{error}</p>}

      {/* Preview */}
      {preview && (
        <>
          <div className="border border-[#515a63] bg-[#1a1e22] p-3">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-sm text-[#eee1c6]">{preview.deviceName || 'Unknown Device'}</b>
                <p className="text-xs text-[#a49778]">{t.library.source} {preview.format}</p>
              </div>
              <div className="text-right text-xs">
                <p>Detected: <b>{preview.stats?.total ?? preview.entries?.length ?? 0}</b></p>
                <p className="text-green-400">{preview.stats?.supported ?? 0} {t.library.supported}</p>
                <p className="text-red-400">{preview.stats?.unsupported ?? 0} {t.library.unsupported}</p>
                <p className="text-amber-400">{preview.stats?.unresolved ?? 0} {t.library.unresolved}</p>
              </div>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="border border-amber-500 bg-amber-900/20 p-2 text-xs text-amber-400">
              {t.importTab.conflictsDetected(conflicts.length)}
            </div>
          )}

          {/* Preview table — paginated to avoid freezing on large imports */}
          <div className="overflow-x-auto border border-[#515a63]">
            <table className="w-full text-xs">
              <thead className="bg-[#101216]">
                <tr className="text-left text-[#a49778]">
                  <th className="px-2 py-1">{t.importTab.sourceControlCol}</th>
                  <th className="px-2 py-1">{t.importTab.typeCol}</th>
                  <th className="px-2 py-1">{t.importTab.chCol}</th>
                  <th className="px-2 py-1">{t.importTab.noteCcCol}</th>
                  <th className="px-2 py-1">{t.importTab.modeCol}</th>
                  <th className="px-2 py-1">{t.importTab.sourceActionCol}</th>
                  <th className="px-2 py-1">{t.importTab.crosscueActionCol}</th>
                  <th className="px-2 py-1">{t.importTab.deckCol}</th>
                  <th className="px-2 py-1">{t.importTab.statusCol}</th>
                </tr>
              </thead>
              <tbody>
                {preview.entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e, i) => (
                  <tr key={e.id || i} className="border-t border-[#383429]">
                    <td className="px-2 py-1 text-[#d1c5ac]">{e.controlType}</td>
                    <td className="px-2 py-1">{e.type.toUpperCase()}</td>
                    <td className="px-2 py-1">{e.channel}</td>
                    <td className="px-2 py-1">{e.number}</td>
                    <td className="px-2 py-1">{e.mode}</td>
                    <td className="px-2 py-1 text-[#a49778]">{e.sourceAction || '—'}</td>
                    <td className="px-2 py-1">
                      {e.target ? (
                        <span className="text-[#d5ad58]">{e.target}</span>
                      ) : (
                        <button
                          className="mini-button text-xs"
                          onClick={() => setEditingEntry(e.id)}
                        >
                          {t.importTab.assignBtn}
                        </button>
                      )}
                      {editingEntry === e.id && (
                        <div className="mt-1">
                          <ActionBrowser
                            compact
                            language={language}
                            onSelect={actionId => assignAction(e.id, actionId)}
                          />
                          <button className="mini-button mt-1" onClick={() => setEditingEntry(null)}>{t.importTab.cancelBtn}</button>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1">{e.sourceDeck || '—'}</td>
                    <td className={`px-2 py-1 font-bold ${STATUS_BADGE[e.status].cls}`}>
                      {STATUS_BADGE[e.status].label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {preview.entries.length > PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-[#a49778]">
              <span>
                {t.importTab.pageInfo(
                  page + 1,
                  Math.ceil(preview.entries.length / PAGE_SIZE),
                  page * PAGE_SIZE + 1,
                  Math.min((page + 1) * PAGE_SIZE, preview.entries.length),
                  preview.entries.length
                )}
              </span>
              <div className="flex gap-1">
                <button className="mini-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t.importTab.prevBtn}</button>
                <button className="mini-button" disabled={(page + 1) * PAGE_SIZE >= preview.entries.length} onClick={() => setPage(p => p + 1)}>{t.importTab.nextBtn}</button>
              </div>
            </div>
          )}

          {/* Save bar */}
          <div className="flex items-center gap-2">
            <input
              className="source-input flex-1"
              placeholder={t.importTab.mappingNamePlaceholder}
              value={mappingName}
              onChange={e => setMappingName(e.target.value)}
            />
            <button className="metal-button" onClick={handleSave} disabled={!preview.entries.length}>
              {t.importTab.saveMappingBtn}
            </button>
            <button className="mini-button" onClick={() => { setPreview(null); setError(null); }}>
              {t.importTab.cancelBtn}
            </button>
          </div>
        </>
      )}
    </div>
  );
}