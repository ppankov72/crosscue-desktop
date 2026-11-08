import { useState } from 'react';
import { Loader2, Save, Check, Eye, Copy, User, Plus, RefreshCw } from 'lucide-react';
import DjAvatar from '@/components/crosscue/DjAvatar';
import PortalAvatarEditor from '@/components/portal/PortalAvatarEditor';
import { base44 } from '@/api/base44Client';

// Portal DJ Profile — edit display name, bio, avatar, visibility, share link.
export default function PortalDjProfile({ data, t, onRefresh, loading = false }) {
  const profile = data?.profile;
  const account = data?.account;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({});

  if (loading) return <p className="text-stone-500">{t.common.loading}</p>;

  const startEdit = () => {
    setForm({
      display_name: profile?.display_name || account?.full_name || (account?.email ? 'DJ ' + account.email.split('@')[0] : 'DJ'),
      bio: profile?.bio || '',
      country: profile?.country || '',
      city: profile?.city || '',
      genres: profile?.genres || '',
      website: profile?.website || '',
      visibility: profile?.visibility || 'private',
      avatar_type: profile?.avatar_type || 'auto',
      avatar_url: profile?.avatar_url || '',
      social_links: profile?.social_links || '',
      show_country: profile?.show_country || false,
      show_city: profile?.show_city || false,
      show_website: profile?.show_website || false,
      show_social_links: profile?.show_social_links !== false
    });
    setSaveError('');
    setEditing(true);
  };
    
    const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('updateMyProfile', form);
      await onRefresh();
      setEditing(false);
    } catch {
      setSaveError('Could not save the profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!profile?.slug) return;
    const url = `${window.location.origin}/dj/${profile.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Defensive fallback: If request finished but profile is still null, show recoverable empty state
  if (!profile && !editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">{t.profile.title}</h2>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <User size={24} />
          </div>
          <h3 className="text-lg font-bold text-stone-900">{t.profile.title}</h3>
          <p className="mt-1 text-sm text-stone-500">
            {account?.full_name ? `${account.full_name}, ` : ''}{t.common?.noProfileYet || 'Няма намерен DJ профил. Създайте своя профил сега.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              <Plus size={16} /> {t.profile.edit}
            </button>
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                <RefreshCw size={14} /> {t.common.refresh}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!editing && profile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">{t.profile.title}</h2>
          <div className="flex gap-2">
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />} {copied ? t.profile.copied : t.profile.copyLink}
            </button>
            {profile.visibility !== 'private' && (
              <a href={`${window.location.origin}/dj/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
                <Eye size={14} /> {t.profile.openPublic}
              </a>
            )}
            <button onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700">
              {t.profile.edit}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <DjAvatar type={profile.avatar_type} seed={profile.avatar_seed || profile.id} url={profile.avatar_url} size={64} />
            <div>
              <p className="text-xl font-bold text-stone-900">{profile.display_name}</p>
              <p className="text-sm text-stone-500">/{profile.slug}</p>
              <span className="mt-1 inline-block rounded bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-600">{t.profile.visibility}: {t.overview[profile.visibility] || profile.visibility}</span>
            </div>
          </div>
          {profile.bio && <p className="mt-4 text-sm text-stone-600">{profile.bio}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {profile.country && <div><span className="text-stone-400">Country:</span> <span className="text-stone-700">{profile.country}</span></div>}
            {profile.city && <div><span className="text-stone-400">City:</span> <span className="text-stone-700">{profile.city}</span></div>}
            {profile.genres && <div><span className="text-stone-400">Genres:</span> <span className="text-stone-700">{profile.genres}</span></div>}
          </div>
        </div>
      </div>
    );
  }

  const editorProfile = profile || {
    avatar_type: form.avatar_type || 'auto',
    avatar_seed: account?.id || 'default_seed',
    avatar_url: form.avatar_url || ''
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-stone-900">{t.profile.edit}</h2>
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
        <PortalAvatarEditor profile={editorProfile} form={form} onChange={changes => setForm(current => ({ ...current, ...changes }))} onUploadingChange={setUploading} />
        <Field label="Display Name" value={form.display_name} onChange={v => setForm({ ...form, display_name: v })} maxLength={60} />
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wider text-stone-500">BIO</label>
          <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} maxLength={500} rows={3} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Country" value={form.country} onChange={v => setForm({ ...form, country: v })} maxLength={60} />
          <Field label="City" value={form.city} onChange={v => setForm({ ...form, city: v })} maxLength={60} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Genres" value={form.genres} onChange={v => setForm({ ...form, genres: v })} maxLength={200} />
          <Field label="Website" value={form.website} onChange={v => setForm({ ...form, website: v })} maxLength={200} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wider text-stone-500">VISIBILITY</label>
          <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-500">
            <option value="private">{t.overview.private}</option>
            <option value="unlisted">{t.overview.unlisted}</option>
            <option value="public">{t.overview.public}</option>
          </select>
        </div>
        {saveError && <p role="alert" className="text-sm">{saveError}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={() => setEditing(false)} disabled={uploading || saving} className="flex-1 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t.common.cancel}</button>
          <button onClick={handleSave} disabled={saving || uploading} className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-700">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, maxLength }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold tracking-wider text-stone-500">{label.toUpperCase()}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-500" />
    </div>
  );
}