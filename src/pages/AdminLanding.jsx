import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout, ArrowLeft, Loader2, Shield, Save, Eye, EyeOff, FileJson, RefreshCw, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { translations } from '@/lib/landing/translations';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'bg', label: 'BG' },
];

const SECTIONS = [
  { id: 'hero', label: 'Hero', fields: ['tagline', 'subtitle', 'tryDemo', 'launch'] },
  { id: 'why', label: 'Why', fields: ['title', 'subtitle'] },
  { id: 'features', label: 'Features', fields: ['title', 'subtitle'] },
  { id: 'tracks', label: 'Tracks', fields: ['title', 'subtitle', 'badge', 'button'] },
  { id: 'pricing', label: 'Pricing', fields: ['title', 'subtitle', 'popular'] },
  { id: 'downloads', label: 'Downloads', fields: ['title', 'subtitle', 'launchNow', 'comingSoon'] },
  { id: 'community', label: 'Community', fields: ['title', 'subtitle', 'feedTitle', 'feedSubtitle'] },
  { id: 'footer', label: 'Footer', fields: ['tagline', 'subtitle', 'rights', 'sections'] },
  { id: 'seo', label: 'SEO / Meta', fields: ['title', 'description', 'ogImage'] },
];

export default function AdminLanding() {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterLang, setFilterLang] = useState('en');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [publishResult, setPublishResult] = useState(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('adminGetLandingContent', { language: filterLang });
      setSections(res.data.sections || {});
    } catch (e) {
      setError(e.response?.status === 403 ? 'forbidden' : 'error');
    } finally {
      setLoading(false);
    }
  }, [filterLang]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const getSectionData = (sectionId) => sections[sectionId] || { draft: null, published: null, archivedCount: 0 };

  const seedFromCurrent = (sectionId) => {
    const t = translations[filterLang] || translations.en;
    let seedData = {};
    if (sectionId === 'seo') {
      seedData = { title: 'CROSSCUE — Vintage Virtual Turntables', description: t.hero?.subtitle || '', ogImage: '' };
    } else if (sectionId === 'footer') {
      const f = t.footer;
      if (!f) return;
      seedData = { tagline: f.tagline, subtitle: f.subtitle, rights: f.rights, sections: f.sections };
    } else {
      const tkey = sectionId === 'tracks' ? 'demoTracks' : sectionId;
      const section = t[tkey];
      if (!section) return;
      seedData = { ...section };
    }
    setEditing({
      section: sectionId,
      language: filterLang,
      content: JSON.stringify(seedData, null, 2),
      id: null,
    });
  };

  const editDraft = (sectionId) => {
    const data = getSectionData(sectionId);
    if (data.draft) {
      setEditing({
        section: sectionId,
        language: filterLang,
        content: data.draft.content,
        id: data.draft.id,
      });
    } else {
      seedFromCurrent(sectionId);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('adminSaveLandingContent', {
        id: editing.id || null,
        section: editing.section,
        language: editing.language,
        content: editing.content,
      });
      await fetchContent();
      setEditing(null);
    } catch (e) {
      alert('Save failed: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (sectionId) => {
    const data = getSectionData(sectionId);
    if (!data.draft) return;
    if (!confirm(`Publish "${SECTIONS.find(s => s.id === sectionId)?.label}" for ${filterLang.toUpperCase()}? This will replace the current public version.`)) return;
    setPublishing(sectionId);
    setPublishResult(null);
    try {
      const res = await base44.functions.invoke('adminPublishLandingContent', {
        id: data.draft.id,
        section: sectionId,
        language: filterLang,
      });
      setPublishResult({ section: sectionId, ok: true, archivedCount: res.data?.archivedCount || 0 });
      await fetchContent();
    } catch (e) {
      setPublishResult({ section: sectionId, ok: false, error: e.message || 'error' });
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <Shield className="h-12 w-12 text-stone-400" />
        <p className="text-lg font-bold text-stone-900">Access Denied</p>
        <p className="text-stone-500">Landing page management is admin-only.</p>
        <Link to="/admin" className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">Back to Control Room</Link>
      </div>
    );
  }

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Layout size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">Landing Page Management</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-4 border-r border-stone-200 pr-4">
              <Link to="/admin" className="text-sm font-medium text-stone-500 hover:text-amber-700">Overview</Link>
              <Link to="/admin/content" className="text-sm font-medium text-stone-500 hover:text-amber-700">Content</Link>
              <Link to="/admin/landing" className="text-sm font-bold text-stone-900">Landing</Link>
              <Link to="/admin/commerce" className="text-sm font-medium text-stone-500 hover:text-amber-700">Commerce</Link>
            </nav>
            <button onClick={fetchContent} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
              <ArrowLeft size={14} /> Control Room
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">⚠ Draft / Publish Workflow</p>
          <p className="mt-1 text-sm text-amber-700">
            Edit content as a Draft — it does NOT affect the public landing page. When ready, click <b>Publish</b> to make it live.
            The previous published version is archived (not deleted). Drafts and Published versions coexist independently.
          </p>
        </div>

        {/* Language filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500">Language:</span>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setFilterLang(l.code); setEditing(null); setPublishResult(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${filterLang === l.code ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Section grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(sec => {
            const data = getSectionData(sec.id);
            const hasDraft = Boolean(data.draft);
            const hasPublished = Boolean(data.published);
            return (
              <div key={sec.id} className={`rounded-xl border p-4 ${hasDraft || hasPublished ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">{sec.label}</h3>
                  <div className="flex gap-1.5">
                    {hasDraft && <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700">Draft</span>}
                    {hasPublished && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Published</span>}
                    {!hasDraft && !hasPublished && <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">Default</span>}
                  </div>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {hasDraft ? 'Draft ready' : hasPublished ? 'Published (no draft)' : 'Using static default'}
                  {data.archivedCount > 0 && ` · ${data.archivedCount} archived`}
                </p>
                {publishResult?.section === sec.id && (
                  <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${publishResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {publishResult.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {publishResult.ok ? `Published (archived ${publishResult.archivedCount} old)` : `Failed: ${publishResult.error}`}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => editDraft(sec.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    <Eye size={12} /> {hasDraft ? 'Edit Draft' : 'Create Draft'}
                  </button>
                  {hasDraft && (
                    <button
                      onClick={() => publishDraft(sec.id)}
                      disabled={publishing === sec.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-600 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      <Upload size={12} /> {publishing === sec.id ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Editor modal — Draft only */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Edit Draft: {SECTIONS.find(s => s.id === editing.section)?.label}</h2>
                  <p className="text-xs text-stone-500">Drafts do not affect the public page. Use Publish to make live.</p>
                </div>
                <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-600"><EyeOff size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-500">Content (JSON)</label>
                  <textarea
                    value={editing.content}
                    onChange={e => setEditing({ ...editing, content: e.target.value })}
                    className="mt-1 h-64 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-xs text-stone-800"
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}