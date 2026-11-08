import { computeStats, exportProfile } from '@/lib/midi/mappingProfile';
import { mappingLibraryStore } from '@/lib/midi/mappingLibraryStore';
import { useMidiTranslations } from '@/lib/i18n/midiTranslations';

const STATUS_COLORS = {
  supported: 'text-green-400',
  unsupported: 'text-red-400',
  unresolved: 'text-amber-400',
};

function ProfileCard({ profile, section, isActive, devices, t }) {
  const stats = computeStats(profile?.entries || []);
  const isOfficial = section === 'official';

  const handleActivate = () => {
    if (isActive) mappingLibraryStore.deactivate();
    else mappingLibraryStore.activate(profile.id);
  };

  const handleEdit = () => {
    // Edit is handled by parent via onEdit
    profile._onEdit?.(profile);
  };

  const handleDuplicate = () => mappingLibraryStore.duplicateProfile(profile.id);

  const handleRename = () => {
    const name = window.prompt(t.library.renamePrompt, profile.metadata.name);
    if (name && name.trim())
      mappingLibraryStore.update(profile.id, { metadata: { ...profile.metadata, name: name.trim() } });
  };

  const handleExport = () => {
    const json = exportProfile(profile);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.metadata.name.replace(/\s+/g, '_')}.crosscue-map`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (window.confirm(t.library.deleteConfirm(profile.metadata.name)))
      mappingLibraryStore.delete(profile.id);
  };

  return (
    <div className={`border p-3 ${isActive ? 'border-[#d5ad58] bg-[#2a2418]' : 'border-[#515a63] bg-[#1a1e22]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b className="text-sm text-[#eee1c6] truncate">{profile.metadata.name}</b>
            {isActive && <span className="rounded bg-[#d5ad58] px-1.5 py-0.5 text-[10px] font-bold text-black">ACTIVE</span>}
          </div>
          <p className="mt-0.5 text-xs text-[#a49778]">
            {profile.metadata.manufacturer || 'Unknown'} · {profile.metadata.model || 'Unknown'} · v{profile.metadata.version}
          </p>
          <p className="text-xs text-[#a49778]">
            {t.library.author} {profile.metadata.author || 'Unknown'} · {t.library.source} {profile.metadata.sourceFormat}
          </p>
          <p className="text-xs">
            <span className={profile.metadata.status === 'tested' ? 'text-green-400' : 'text-amber-400'}>
              {profile.metadata.status}
            </span>
            {' · '}{t.library.coverage} {stats.coverage}%
          </p>
          <p className="text-xs">
            <span className={STATUS_COLORS.supported}>{stats.supported} {t.library.supported}</span>
            {' · '}
            <span className={STATUS_COLORS.unsupported}>{stats.unsupported} {t.library.unsupported}</span>
            {' · '}
            <span className={STATUS_COLORS.unresolved}>{stats.unresolved} {t.library.unresolved}</span>
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button className="mini-button" onClick={handleActivate}>
          {isActive ? t.library.deactivateBtn : t.library.activateBtn}
        </button>
        <button className="mini-button" onClick={handleEdit} disabled={isOfficial}>
          {isOfficial ? t.library.viewBtn : t.library.viewEditBtn}
        </button>
        <button className="mini-button" onClick={handleDuplicate}>{t.library.duplicateBtn}</button>
        <button className="mini-button" onClick={handleRename} disabled={isOfficial}>{t.library.renameBtn}</button>
        <button className="mini-button" onClick={handleExport}>{t.library.exportBtn}</button>
        {!isOfficial && <button className="mini-button text-red-400" onClick={handleDelete}>{t.library.deleteBtn}</button>}
      </div>
      {isOfficial && (
        <p className="mt-1 text-[10px] text-[#a49778]">{t.library.officialNotice}</p>
      )}
    </div>
  );
}

// Suggest a profile for a connected device (by name similarity — user must confirm)
const suggestProfile = (deviceName, profiles) => {
  if (!deviceName) return null;
  const lower = deviceName.toLowerCase();
  for (const p of profiles) {
    const model = (p.metadata.model || '').toLowerCase();
    if (model && lower.includes(model)) return p;
  }
  return null;
};

export default function MappingLibrary({ library, devices, onEdit, language }) {
  const { t } = useMidiTranslations(language);
  const sections = [
    { id: 'official', label: t.library.tabOfficial, profiles: library.official },
    { id: 'community', label: t.library.tabCommunity, profiles: library.community },
    { id: 'my', label: t.library.tabMy, profiles: library.my },
  ];

  // Device suggestion
  const connectedName = devices[0]?.name || '';
  const allProfiles = [...library.official, ...library.community, ...library.my];
  const suggested = connectedName ? suggestProfile(connectedName, allProfiles) : null;
  const suggestedActive = suggested && library.activeProfileId === suggested.id;

  return (
    <div className="space-y-4">
      {suggested && !suggestedActive && (
        <div className="border border-[#d5ad58] bg-[#2a2418] p-2 text-xs">
          <b className="text-[#d5ad58]">{t.library.suggestedMapping}</b> "{suggested.metadata.name}" {t.library.matchesYour} "{connectedName}".
          <button
            className="mini-button ml-2"
            onClick={() => mappingLibraryStore.activate(suggested.id)}
          >
            {t.library.activateBtn}
          </button>
        </div>
      )}
      {sections.map(sec => (
        <div key={sec.id}>
          <b className="deck-label">{sec.label}</b>
          {!sec.profiles.length ? (
            <p className="mt-1 text-xs text-[#a49778]">
              {sec.id === 'official' ? t.library.noOfficial : sec.id === 'community' ? t.library.noCommunity : t.library.noMy}
            </p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sec.profiles.map(p => (
                <ProfileCard
                  key={p.id}
                  profile={{ ...p, _onEdit: onEdit }}
                  section={sec.id}
                  isActive={library.activeProfileId === p.id}
                  devices={devices}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}