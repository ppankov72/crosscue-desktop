import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Upload, RotateCcw, Plus, Copy, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MultiLangInput, { CMS_LANGS } from '@/components/cms/MultiLangInput';

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero' },
  { value: 'liveDemo', label: 'Live Demo' },
  { value: 'why', label: 'Why' },
  { value: 'features', label: 'Features' },
  { value: 'demoTracks', label: 'Demo Tracks' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'community', label: 'Community' },
  { value: 'docs', label: 'Docs' },
  { value: 'text', label: 'Text Content' },
  { value: 'cta', label: 'CTA' },
  { value: 'image', label: 'Image + Text' },
];

export default function CmsPageEditor() {
  const [pages, setPages] = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [pageDetail, setPageDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchPages = useCallback(() => {
    setLoading(true);
    base44.functions.invoke('adminCmsPage', { action: 'list' })
      .then(res => {
        setPages(res.data?.pages || []);
        if (!selectedSlug && res.data?.pages?.length) setSelectedSlug(res.data.pages[0].slug);
      })
      .finally(() => setLoading(false));
  }, [selectedSlug]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const fetchDetail = useCallback(() => {
    if (!selectedSlug) return;
    base44.functions.invoke('adminCmsPage', { action: 'get', slug: selectedSlug })
      .then(res => { setPageDetail(res.data?.page || null); setDirty(false); });
  }, [selectedSlug]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const updateDraft = (updater) => {
    if (!pageDetail) return;
    const newDraft = { ...(pageDetail.draft_content || { sections: [] }) };
    updater(newDraft);
    setPageDetail({ ...pageDetail, draft_content: newDraft });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('adminCmsPage', {
        action: 'save',
        slug: selectedSlug,
        draft_content: pageDetail.draft_content,
        page_meta: {
          title: pageDetail.title,
          nav_visible: pageDetail.nav_visible,
          footer_visible: pageDetail.footer_visible,
          display_order: pageDetail.display_order,
        },
      });
      setDirty(false);
      fetchPages();
    } catch (err) { alert('Save failed: ' + (err.message || 'error')); }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!confirm('Publish this page? The draft will go live immediately.')) return;
    setPublishing(true);
    try {
      await base44.functions.invoke('adminCmsPage', { action: 'publish', slug: selectedSlug });
      fetchDetail();
      fetchPages();
    } catch (err) { alert('Publish failed: ' + (err.message || 'error')); }
    setPublishing(false);
  };

  const handleRollback = async () => {
    if (!confirm('Restore the previous published version?')) return;
    setRollingBack(true);
    try {
      await base44.functions.invoke('adminCmsPage', { action: 'rollback', slug: selectedSlug });
      fetchDetail();
      fetchPages();
    } catch (err) { alert('Rollback failed: ' + (err.message || 'error')); }
    setRollingBack(false);
  };

  // Section operations
  const moveSection = (idx, dir) => {
    updateDraft(draft => {
      const sections = [...(draft.sections || [])];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= sections.length) return;
      [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
      sections.forEach((s, i) => s.order = i);
      draft.sections = sections;
    });
  };

  const toggleSection = (idx) => {
    updateDraft(draft => {
      draft.sections[idx].enabled = !draft.sections[idx].enabled;
    });
  };

  const duplicateSection = (idx) => {
    updateDraft(draft => {
      const sections = [...(draft.sections || [])];
      const copy = JSON.parse(JSON.stringify(sections[idx]));
      copy.id = `${copy.id}-copy-${Date.now()}`;
      copy.order = sections.length;
      sections.push(copy);
      draft.sections = sections;
    });
  };

  const deleteSection = (idx) => {
    if (!confirm('Delete this section?')) return;
    updateDraft(draft => {
      draft.sections = (draft.sections || []).filter((_, i) => i !== idx);
      draft.sections.forEach((s, i) => s.order = i);
    });
  };

  const addSection = (type) => {
    updateDraft(draft => {
      const sections = [...(draft.sections || [])];
      sections.push({
        id: `${type}-${Date.now()}`,
        type,
        enabled: true,
        order: sections.length,
        elements: { heading: { en: '', de: '', es: '', bg: '' }, body: { en: '', de: '', es: '', bg: '' } },
        styles: {},
      });
      draft.sections = sections;
    });
  };

  const updateElement = (sectionIdx, elementKey, value) => {
    updateDraft(draft => {
      if (!draft.sections[sectionIdx].elements) draft.sections[sectionIdx].elements = {};
      draft.sections[sectionIdx].elements[elementKey] = value;
    });
  };

  const updateSectionStyle = (sectionIdx, styleKey, value) => {
    updateDraft(draft => {
      if (!draft.sections[sectionIdx].styles) draft.sections[sectionIdx].styles = {};
      draft.sections[sectionIdx].styles[styleKey] = value;
    });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Page list */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Pages</h3>
        {pages.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedSlug(p.slug)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${selectedSlug === p.slug ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-stone-900">{p.title}</p>
              <p className="truncate text-xs text-stone-500">{p.slug}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {p.has_published && <span className="h-2 w-2 rounded-full bg-green-500" title="Published" />}
              {p.has_draft && p.has_published && <span className="h-2 w-2 rounded-full bg-amber-400" title="Unpublished draft" />}
            </div>
          </button>
        ))}
      </div>

      {/* Page editor */}
      <div>
        {!pageDetail ? (
          <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white">
            <p className="text-stone-400">Select a page to edit.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-500">Title</label>
                  <input value={pageDetail.title || ''} onChange={e => { setPageDetail({ ...pageDetail, title: e.target.value }); setDirty(true); }} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800" />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500">Slug</label>
                  <input value={pageDetail.slug || ''} readOnly className="mt-1 w-full rounded border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm text-stone-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500">Display Order</label>
                  <input type="number" value={pageDetail.display_order || 0} onChange={e => { setPageDetail({ ...pageDetail, display_order: Number(e.target.value) }); setDirty(true); }} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800" />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={pageDetail.nav_visible || false} onChange={e => { setPageDetail({ ...pageDetail, nav_visible: e.target.checked }); setDirty(true); }} />
                    Nav visible
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={pageDetail.footer_visible || false} onChange={e => { setPageDetail({ ...pageDetail, footer_visible: e.target.checked }); setDirty(true); }} />
                    Footer visible
                  </label>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Sections</h3>
                <select onChange={e => { if (e.target.value) { addSection(e.target.value); e.target.value = ''; } }} className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-700">
                  <option value="">+ Add section...</option>
                  {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                {(pageDetail.draft_content?.sections || []).map((section, idx) => (
                  <div key={section.id} className={`rounded-lg border p-3 ${section.enabled === false ? 'border-stone-200 bg-stone-50 opacity-60' : 'border-stone-200 bg-white'}`}>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-bold text-stone-800">{section.type} — {section.id}</span>
                      <button onClick={() => toggleSection(idx)} className="rounded p-1 text-stone-400 hover:bg-stone-100" title={section.enabled === false ? 'Show' : 'Hide'}>
                        {section.enabled === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30"><ChevronUp size={14} /></button>
                      <button onClick={() => moveSection(idx, 1)} disabled={idx === (pageDetail.draft_content?.sections || []).length - 1} className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30"><ChevronDown size={14} /></button>
                      <button onClick={() => duplicateSection(idx)} className="rounded p-1 text-stone-400 hover:bg-stone-100"><Copy size={14} /></button>
                      <button onClick={() => deleteSection(idx)} className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>

                    {section.enabled !== false && (
                      <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                        {/* Elements */}
                        {section.elements && Object.entries(section.elements).map(([key, val]) => (
                          <MultiLangInput
                            key={key}
                            label={key}
                            value={val}
                            onChange={v => updateElement(idx, key, v)}
                            type={key === 'subtitle' || key === 'body' || key === 'description' ? 'textarea' : 'input'}
                          />
                        ))}

                        {/* Style controls */}
                        <details className="text-sm">
                          <summary className="cursor-pointer text-xs font-bold text-stone-500">Section Styles</summary>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-stone-400">Background</label>
                              <input type="color" value={section.styles?.backgroundColor || '#ffffff'} onChange={e => updateSectionStyle(idx, 'backgroundColor', e.target.value)} className="block w-full h-8 rounded border border-stone-200" />
                            </div>
                            <div>
                              <label className="text-xs text-stone-400">Text Color</label>
                              <input type="color" value={section.styles?.textColor || '#44403c'} onChange={e => updateSectionStyle(idx, 'textColor', e.target.value)} className="block w-full h-8 rounded border border-stone-200" />
                            </div>
                            <div>
                              <label className="text-xs text-stone-400">Heading Color</label>
                              <input type="color" value={section.styles?.headingColor || '#1c1917'} onChange={e => updateSectionStyle(idx, 'headingColor', e.target.value)} className="block w-full h-8 rounded border border-stone-200" />
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
                {(!pageDetail.draft_content?.sections || pageDetail.draft_content.sections.length === 0) && (
                  <p className="py-4 text-center text-sm text-stone-400">No sections. Add one above.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={!dirty || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button onClick={handlePublish} disabled={publishing} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
                <Upload size={14} /> {publishing ? 'Publishing...' : 'Publish'}
              </button>
              <button onClick={handleRollback} disabled={!pageDetail.previous_published_content || rollingBack} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                <RotateCcw size={14} /> {rollingBack ? 'Restoring...' : 'Rollback'}
              </button>
              {dirty && <span className="text-xs font-medium text-amber-600">● Unsaved changes</span>}
              {pageDetail.published_at && !dirty && <span className="text-xs text-stone-400">Published: {new Date(pageDetail.published_at).toLocaleString()}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}