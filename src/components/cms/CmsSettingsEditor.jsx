import { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, Upload, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MultiLangInput, { CMS_LANGS } from '@/components/cms/MultiLangInput';

export default function CmsSettingsEditor({ settingKey, title }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetch_ = useCallback(() => {
    setLoading(true);
    base44.functions.invoke('adminCmsSettings', { action: 'get' })
      .then(res => {
        const s = res.data?.settings?.[settingKey];
        setData(s || null);
        setDraft(s?.draft ? JSON.parse(JSON.stringify(s.draft)) : null);
        setDirty(false);
      })
      .finally(() => setLoading(false));
  }, [settingKey]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const update = (updater) => {
    setDraft(prev => {
      const next = { ...(prev || {}) };
      updater(next);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('adminCmsSettings', { action: 'save', key: settingKey, value: draft });
      setDirty(false);
      fetch_();
    } catch (err) { alert('Save failed: ' + (err.message || 'error')); }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!confirm(`Publish ${title}? Changes will go live immediately.`)) return;
    setPublishing(true);
    try {
      await base44.functions.invoke('adminCmsSettings', { action: 'publish', key: settingKey });
      fetch_();
    } catch (err) { alert('Publish failed: ' + (err.message || 'error')); }
    setPublishing(false);
  };

  const handleRollback = async () => {
    if (!confirm('Restore the previous published version?')) return;
    setRollingBack(true);
    try {
      await base44.functions.invoke('adminCmsSettings', { action: 'rollback', key: settingKey });
      fetch_();
    } catch (err) { alert('Rollback failed: ' + (err.message || 'error')); }
    setRollingBack(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  if (settingKey === 'navigation') {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-500">Brand Text</label>
            <input value={draft?.brandText || ''} onChange={e => update(d => { d.brandText = e.target.value; })} className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800" />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500">Logo URL</label>
            <input value={draft?.logoUrl || ''} onChange={e => update(d => { d.logoUrl = e.target.value; })} placeholder="Leave empty for text logo" className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm text-stone-800" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-stone-500">Navigation Items</label>
              <button onClick={() => update(d => { d.items = [...(d.items || []), { id: `nav-${Date.now()}`, label: { en: '', de: '', es: '', bg: '' }, url: '#', enabled: true, order: d.items?.length || 0 }]; })} className="inline-flex items-center gap-1 rounded border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50">
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {(draft?.items || []).map((item, idx) => (
                <div key={item.id || idx} className="rounded-lg border border-stone-200 p-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={item.enabled !== false} onChange={e => update(d => { d.items[idx].enabled = e.target.checked; })} />
                    <input value={item.url || ''} onChange={e => update(d => { d.items[idx].url = e.target.value; })} placeholder="URL (#features, /studio, https://...)" className="flex-1 rounded border border-stone-200 px-2 py-1 text-xs text-stone-800" />
                    <button onClick={() => update(d => { d.items = d.items.filter((_, i) => i !== idx); })} className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                  <div className="mt-2">
                    <MultiLangInput label="Label" value={item.label} onChange={v => update(d => { d.items[idx].label = v; })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ActionButtons onSave={handleSave} onPublish={handlePublish} onRollback={handleRollback} dirty={dirty} saving={saving} publishing={publishing} rollingBack={rollingBack} hasPrevious={Boolean(data?.previous)} />
      </div>
    );
  }

  if (settingKey === 'footer') {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
          <MultiLangInput label="Tagline" value={draft?.tagline} onChange={v => update(d => { d.tagline = v; })} />
          <MultiLangInput label="Subtitle" value={draft?.subtitle} onChange={v => update(d => { d.subtitle = v; })} type="textarea" />
          <MultiLangInput label="Rights" value={draft?.rights} onChange={v => update(d => { d.rights = v; })} />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-stone-500">Columns</label>
              <button onClick={() => update(d => { d.columns = [...(d.columns || []), { id: `col-${Date.now()}`, title: { en: '', de: '', es: '', bg: '' }, links: [] }]; })} className="inline-flex items-center gap-1 rounded border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50">
                <Plus size={12} /> Add Column
              </button>
            </div>
            <div className="space-y-3">
              {(draft?.columns || []).map((col, ci) => (
                <div key={col.id || ci} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex items-center justify-between">
                    <MultiLangInput label="Column Title" value={col.title} onChange={v => update(d => { d.columns[ci].title = v; })} />
                    <button onClick={() => update(d => { d.columns = d.columns.filter((_, i) => i !== ci); })} className="ml-2 rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {(col.links || []).map((link, li) => (
                      <div key={li} className="flex items-center gap-1">
                        <input value={link.url || ''} onChange={e => update(d => { d.columns[ci].links[li].url = e.target.value; })} placeholder="URL" className="w-32 rounded border border-stone-200 px-1 py-0.5 text-xs text-stone-800" />
                        <div className="flex-1">
                          <MultiLangInput value={link.label} onChange={v => update(d => { d.columns[ci].links[li].label = v; })} />
                        </div>
                        <button onClick={() => update(d => { d.columns[ci].links = d.columns[ci].links.filter((_, i) => i !== li); })} className="rounded p-1 text-stone-400 hover:bg-red-50"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    <button onClick={() => update(d => { d.columns[ci].links = [...(d.columns[ci].links || []), { label: { en: '', de: '', es: '', bg: '' }, url: '#' }]; })} className="text-xs text-amber-600 hover:underline">+ Add link</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-stone-500">Legal Links</label>
            <div className="space-y-1">
              {(draft?.legal || []).map((link, li) => (
                <div key={li} className="flex items-center gap-1">
                  <input value={link.url || ''} onChange={e => update(d => { d.legal[li].url = e.target.value; })} placeholder="URL" className="w-32 rounded border border-stone-200 px-1 py-0.5 text-xs text-stone-800" />
                  <div className="flex-1">
                    <MultiLangInput value={link.label} onChange={v => update(d => { d.legal[li].label = v; })} />
                  </div>
                  <button onClick={() => update(d => { d.legal = d.legal.filter((_, i) => i !== li); })} className="rounded p-1 text-stone-400 hover:bg-red-50"><Trash2 size={10} /></button>
                </div>
              ))}
              <button onClick={() => update(d => { d.legal = [...(d.legal || []), { label: { en: '', de: '', es: '', bg: '' }, url: '/' }]; })} className="text-xs text-amber-600 hover:underline">+ Add legal link</button>
            </div>
          </div>
        </div>
        <ActionButtons onSave={handleSave} onPublish={handlePublish} onRollback={handleRollback} dirty={dirty} saving={saving} publishing={publishing} rollingBack={rollingBack} hasPrevious={Boolean(data?.previous)} />
      </div>
    );
  }

  if (settingKey === 'theme') {
    return (
      <div className="max-w-2xl space-y-4">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Colors</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {['background', 'contentBg', 'primary', 'secondary', 'accent', 'text', 'heading', 'muted', 'border'].map(key => (
                <div key={key}>
                  <label className="text-xs text-stone-400">{key}</label>
                  <input type="color" value={draft?.colors?.[key] || '#ffffff'} onChange={e => update(d => { if (!d.colors) d.colors = {}; d.colors[key] = e.target.value; })} className="block w-full h-8 rounded border border-stone-200" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Typography</h3>
            <div className="space-y-3">
              {['body', 'heading', 'navigation', 'button', 'footer'].map(role => (
                <div key={role} className="rounded-lg border border-stone-200 p-3">
                  <p className="mb-2 text-sm font-bold text-stone-700 capitalize">{role}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="text-xs text-stone-400">Font Family</label>
                      <select value={draft?.typography?.[role]?.family || ''} onChange={e => update(d => { if (!d.typography) d.typography = {}; if (!d.typography[role]) d.typography[role] = {}; d.typography[role].family = e.target.value; })} className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-800">
                        <option value="">Default (inherit)</option>
                        <option value="ui-sans-serif, system-ui, sans-serif">Sans-serif</option>
                        <option value="ui-serif, Georgia, serif">Serif</option>
                        <option value="ui-monospace, monospace">Monospace</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-400">Size</label>
                      <input value={draft?.typography?.[role]?.size || ''} onChange={e => update(d => { if (!d.typography) d.typography = {}; if (!d.typography[role]) d.typography[role] = {}; d.typography[role].size = e.target.value; })} placeholder="e.g. 16px, 1.25rem" className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-800" />
                    </div>
                    <div>
                      <label className="text-xs text-stone-400">Weight</label>
                      <select value={draft?.typography?.[role]?.weight || ''} onChange={e => update(d => { if (!d.typography) d.typography = {}; if (!d.typography[role]) d.typography[role] = {}; d.typography[role].weight = e.target.value; })} className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-800">
                        <option value="">Default</option>
                        <option value="300">Light</option>
                        <option value="400">Regular</option>
                        <option value="500">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extra Bold</option>
                      </select>
                    </div>
                    {(role === 'body' || role === 'heading') && (
                      <>
                        <div>
                          <label className="text-xs text-stone-400">Line Height</label>
                          <input value={draft?.typography?.[role]?.lineHeight || ''} onChange={e => update(d => { if (!d.typography) d.typography = {}; if (!d.typography[role]) d.typography[role] = {}; d.typography[role].lineHeight = e.target.value; })} placeholder="e.g. 1.5" className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-800" />
                        </div>
                        {role === 'heading' && (
                          <>
                            <div>
                              <label className="text-xs text-stone-400">Letter Spacing</label>
                              <input value={draft?.typography?.[role]?.letterSpacing || ''} onChange={e => update(d => { if (!d.typography) d.typography = {}; if (!d.typography[role]) d.typography[role] = {}; d.typography[role].letterSpacing = e.target.value; })} placeholder="e.g. 0.05em" className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-800" />
                            </div>
                            <div>
                              <label className="text-xs text-stone-400">Text Transform</label>
                              <select value={draft?.typography?.[role]?.textTransform || ''} onChange={e => update(d => { if (!d.typography) d.typography = {}; if (!d.typography[role]) d.typography[role] = {}; d.typography[role].textTransform = e.target.value; })} className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-800">
                                <option value="">Default</option>
                                <option value="uppercase">UPPERCASE</option>
                                <option value="capitalize">Capitalize</option>
                                <option value="lowercase">lowercase</option>
                              </select>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ActionButtons onSave={handleSave} onPublish={handlePublish} onRollback={handleRollback} dirty={dirty} saving={saving} publishing={publishing} rollingBack={rollingBack} hasPrevious={Boolean(data?.previous)} />
      </div>
    );
  }

  return null;
}

function ActionButtons({ onSave, onPublish, onRollback, dirty, saving, publishing, rollingBack, hasPrevious }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onSave} disabled={!dirty || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
        <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
      </button>
      <button onClick={onPublish} disabled={publishing} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
        <Upload size={14} /> {publishing ? 'Publishing...' : 'Publish'}
      </button>
      <button onClick={onRollback} disabled={!hasPrevious || rollingBack} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
        <RotateCcw size={14} /> {rollingBack ? 'Restoring...' : 'Rollback'}
      </button>
      {dirty && <span className="text-xs font-medium text-amber-600">● Unsaved changes</span>}
    </div>
  );
}