import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, Trash2, Eye, EyeOff, Upload, FileText, HelpCircle, ArrowLeft, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { docsTranslations } from '@/lib/landing/docsTranslations';
import ContentRichTextEditor from '@/components/admin/ContentRichTextEditor';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'bg', label: 'BG' },
];

const emptyArticle = { id: null, canonical_key: '', category: '', category_title: '', category_icon: 'BookOpen', language: 'en', title: '', body: '', sort_order: 0, status: 'draft' };
const emptyFaq = { id: null, canonical_key: '', language: 'en', category: '', question: '', answer: '', sort_order: 0, status: 'draft' };

export default function AdminContent() {
  const [tab, setTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [filterLang, setFilterLang] = useState('en');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('adminGetContent', {});
      setArticles(res.data.articles || []);
      setFaqs(res.data.faqs || []);
    } catch (e) {
      setError(e.response?.status === 403 ? 'forbidden' : 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const saveArticle = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('adminSaveDocArticle', editing);
      await fetchContent();
      setEditing(null);
    } catch (e) { alert('Save failed: ' + (e.message || 'error')); }
    finally { setSaving(false); }
  };

  const deleteArticle = async (id) => {
    if (!confirm('Delete this article permanently?')) return;
    try {
      await base44.functions.invoke('adminDeleteDocArticle', { id });
      await fetchContent();
      if (editing?.id === id) setEditing(null);
    } catch (e) { alert('Delete failed: ' + (e.message || 'error')); }
  };

  const saveFaq = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('adminSaveFaqEntry', editing);
      await fetchContent();
      setEditing(null);
    } catch (e) { alert('Save failed: ' + (e.message || 'error')); }
    finally { setSaving(false); }
  };

  const deleteFaq = async (id) => {
    if (!confirm('Delete this FAQ entry permanently?')) return;
    try {
      await base44.functions.invoke('adminDeleteFaqEntry', { id });
      await fetchContent();
      if (editing?.id === id) setEditing(null);
    } catch (e) { alert('Delete failed: ' + (e.message || 'error')); }
  };

  const buildMigrationPayload = () => {
    const articlesPayload = [];
    const faqsPayload = [];
    for (const [lang, t] of Object.entries(docsTranslations)) {
      for (const cat of (t.categories || [])) {
        const isFaq = cat.id === 'faq';
        cat.sections.forEach((sec, i) => {
          const record = {
            canonical_key: `${cat.id}-${i}`,
            category: cat.id,
            category_title: cat.title,
            category_icon: cat.icon || 'BookOpen',
            language: lang,
            title: sec.title,
            body: sec.body,
            sort_order: i,
          };
          if (isFaq) {
            faqsPayload.push({ ...record, question: sec.title, answer: sec.body });
          } else {
            articlesPayload.push(record);
          }
        });
      }
    }
    return { articlesPayload, faqsPayload };
  };

  const previewMigration = async () => {
    setPreviewing(true);
    try {
      const { articlesPayload, faqsPayload } = buildMigrationPayload();
      const res = await base44.functions.invoke('previewDocMigration', { articles: articlesPayload, faqs: faqsPayload });
      setMigrationPreview(res.data);
    } catch (e) {
      alert('Preview failed: ' + (e.message || 'error'));
    } finally {
      setPreviewing(false);
    }
  };

  const confirmMigration = async () => {
    setMigrating(true);
    try {
      const { articlesPayload, faqsPayload } = buildMigrationPayload();
      const res = await base44.functions.invoke('adminMigrateDocs', { articles: articlesPayload, faqs: faqsPayload });
      alert(`Migration complete: ${res.data.articlesCreated} articles created, ${res.data.articlesSkipped||0} skipped (existing preserved), ${res.data.faqsCreated} FAQ created, ${res.data.faqsSkipped||0} skipped (existing preserved).`);
      setMigrationPreview(null);
      await fetchContent();
    } catch (e) {
      alert('Migration failed: ' + (e.message || 'error'));
    } finally {
      setMigrating(false);
    }
  };

  const exportContent = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      articles: articles.map(a => ({
        canonical_key: a.canonical_key,
        category: a.category,
        category_title: a.category_title,
        category_icon: a.category_icon,
        language: a.language,
        title: a.title,
        body: a.body,
        sort_order: a.sort_order,
        status: a.status,
      })),
      faqs: faqs.map(f => ({
        canonical_key: f.canonical_key,
        language: f.language,
        category: f.category,
        question: f.question,
        answer: f.answer,
        sort_order: f.sort_order,
        status: f.status,
      })),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crosscue-docs-faq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-stone-400" /></div>;
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <FileText className="h-12 w-12 text-stone-400" />
        <p className="text-lg font-bold text-stone-900">Access Denied</p>
        <p className="text-stone-500">Content management is admin-only.</p>
        <a href="/admin" className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">Back to Control Room</a>
      </div>
    );
  }

  const filteredArticles = articles.filter(a => a.language === filterLang);
  const filteredFaqs = faqs.filter(f => f.language === filterLang);

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">Content Management</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={previewMigration} disabled={previewing || migrating} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
              <Upload size={14} /> {previewing ? 'Previewing...' : 'Migrate Static Content'}
            </button>
            <button onClick={exportContent} disabled={articles.length === 0 && faqs.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50">
              <Download size={14} /> Export / Backup
            </button>
            <button onClick={fetchContent} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <a href="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
              <ArrowLeft size={14} /> Control Room
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button onClick={() => { setTab('articles'); setEditing(null); }} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${tab === 'articles' ? 'bg-amber-100 text-amber-800' : 'text-stone-600 hover:bg-stone-100'}`}>
            <FileText size={16} /> Articles ({articles.length})
          </button>
          <button onClick={() => { setTab('faqs'); setEditing(null); }} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${tab === 'faqs' ? 'bg-amber-100 text-amber-800' : 'text-stone-600 hover:bg-stone-100'}`}>
            <HelpCircle size={16} /> FAQ ({faqs.length})
          </button>
        </div>

        {/* Language filter */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500">Language:</span>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setFilterLang(l.code)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${filterLang === l.code ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* List */}
          <div className="space-y-2">
            <button
              onClick={() => setEditing(tab === 'articles' ? { ...emptyArticle, language: filterLang } : { ...emptyFaq, language: filterLang })}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
            >
              <Plus size={16} /> New {tab === 'articles' ? 'Article' : 'FAQ Entry'}
            </button>
            <div className="max-h-[600px] space-y-1 overflow-y-auto">
              {(tab === 'articles' ? filteredArticles : filteredFaqs).map(item => (
                <div key={item.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${editing?.id === item.id ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
                  <button onClick={() => setEditing(item)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-bold text-stone-900">{tab === 'articles' ? item.title : item.question}</p>
                    <p className="truncate text-xs text-stone-500">{item.canonical_key} · {item.status}</p>
                  </button>
                  <button onClick={() => deleteArticle(item.id)} className="ml-2 rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(tab === 'articles' ? filteredArticles : filteredFaqs).length === 0 && (
                <p className="py-8 text-center text-sm text-stone-400">No {tab === 'articles' ? 'articles' : 'FAQ entries'} for this language yet.</p>
              )}
            </div>
          </div>

          {/* Editor */}
          <div>
            {editing ? (
              <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
                {tab === 'articles' ? (
                  <ArticleEditor editing={editing} setEditing={setEditing} onSave={saveArticle} saving={saving} />
                ) : (
                  <FaqEditor editing={editing} setEditing={setEditing} onSave={saveFaq} saving={saving} />
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white">
                <p className="text-stone-400">Select an item to edit, or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Migration Preview Modal */}
      {migrationPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              <h2 className="text-lg font-bold text-stone-900">Migration Preview</h2>
            </div>
            <p className="mb-4 text-sm text-stone-600">
              Review the summary below. Only missing content will be imported. Existing records are preserved (admin edits are never overwritten).
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-stone-200 p-3">
                <h3 className="text-sm font-bold text-stone-700">Articles</h3>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-green-700">To import: <b>{migrationPreview.articlesToImport}</b></span>
                  <span className="text-stone-500">Already existing: <b>{migrationPreview.articlesExisting}</b></span>
                </div>
                <p className="mt-1 text-xs text-stone-400">Total in static source: {migrationPreview.totalArticles}</p>
              </div>
              <div className="rounded-lg border border-stone-200 p-3">
                <h3 className="text-sm font-bold text-stone-700">FAQ Entries</h3>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-green-700">To import: <b>{migrationPreview.faqsToImport}</b></span>
                  <span className="text-stone-500">Already existing: <b>{migrationPreview.faqsExisting}</b></span>
                </div>
                <p className="mt-1 text-xs text-stone-400">Total in static source: {migrationPreview.totalFaqs}</p>
              </div>
              {migrationPreview.articlesToImport === 0 && migrationPreview.faqsToImport === 0 && (
                <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">All content is already imported. Nothing to do.</p>
              )}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={confirmMigration}
                disabled={migrating || (migrationPreview.articlesToImport === 0 && migrationPreview.faqsToImport === 0)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <Upload size={16} /> {migrating ? 'Migrating...' : 'Confirm Migration'}
              </button>
              <button onClick={() => setMigrationPreview(null)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleEditor({ editing, setEditing, onSave, saving }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-stone-500">Canonical Key</label>
          <input value={editing.canonical_key} onChange={e => setEditing({ ...editing, canonical_key: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="e.g. getting-started-overview" />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Category</label>
          <input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="e.g. getting-started" />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Category Title</label>
          <input value={editing.category_title} onChange={e => setEditing({ ...editing, category_title: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Category Icon</label>
          <input value={editing.category_icon} onChange={e => setEditing({ ...editing, category_icon: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="BookOpen" />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Language</label>
          <select value={editing.language} onChange={e => setEditing({ ...editing, language: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Sort Order</label>
          <input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-stone-500">Title</label>
        <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-bold text-stone-500">Body (Rich Text)</label>
        <div className="mt-1">
          <ContentRichTextEditor value={editing.body} onChange={val => setEditing({ ...editing, body: val })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-stone-500">Status</label>
        <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Article'}
        </button>
        <span className="text-xs text-stone-400">{editing.status === 'published' ? <span className="inline-flex items-center gap-1 text-green-600"><Eye size={12} /> Publicly visible</span> : <span className="inline-flex items-center gap-1 text-stone-500"><EyeOff size={12} /> Not public</span>}</span>
      </div>
    </>
  );
}

function FaqEditor({ editing, setEditing, onSave, saving }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-stone-500">Canonical Key</label>
          <input value={editing.canonical_key} onChange={e => setEditing({ ...editing, canonical_key: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="e.g. faq-how-to-load" />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Language</label>
          <select value={editing.language} onChange={e => setEditing({ ...editing, language: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Category</label>
          <input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500">Sort Order</label>
          <input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-stone-500">Question</label>
        <input value={editing.question} onChange={e => setEditing({ ...editing, question: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs font-bold text-stone-500">Answer (Rich Text)</label>
        <div className="mt-1">
          <ContentRichTextEditor value={editing.answer} onChange={val => setEditing({ ...editing, answer: val })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-stone-500">Status</label>
        <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
          <Save size={16} /> {saving ? 'Saving...' : 'Save FAQ'}
        </button>
      </div>
    </>
  );
}