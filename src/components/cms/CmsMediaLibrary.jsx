import { useEffect, useState, useCallback } from 'react';
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CmsMediaLibrary() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = useCallback(() => {
    setLoading(true);
    base44.functions.invoke('adminCmsMedia', { action: 'list' })
      .then(res => setMedia(res.data?.media || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;
      await base44.functions.invoke('adminCmsMedia', {
        action: 'create',
        filename: file.name,
        title: file.name,
        url: fileUrl,
      });
      fetchMedia();
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'error'));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this media item?')) return;
    try {
      await base44.functions.invoke('adminCmsMedia', { action: 'delete', media_id: id });
      fetchMedia();
    } catch (err) {
      alert('Delete failed: ' + (err.message || 'error'));
    }
  };

  const handleUpdateMeta = async (id, field, value) => {
    const item = media.find(m => m.id === id);
    if (!item) return;
    try {
      await base44.functions.invoke('adminCmsMedia', {
        action: 'update',
        media_id: id,
        title: field === 'title' ? value : item.title,
        alt_text: field === 'alt_text' ? value : item.alt_text,
        description: field === 'description' ? value : item.description,
      });
      setMedia(items => items.map(m => m.id === id ? { ...m, [field]: value } : m));
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Media Library</h2>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {media.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
          <ImageIcon size={32} className="mx-auto text-stone-300" />
          <p className="mt-2 text-sm text-stone-400">No media uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map(item => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="aspect-video bg-stone-100">
                <img src={item.url} alt={item.alt_text || item.title} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2 p-3">
                <input
                  value={item.title || ''}
                  onChange={e => handleUpdateMeta(item.id, 'title', e.target.value)}
                  placeholder="Title"
                  className="w-full rounded border border-stone-200 px-2 py-1 text-sm font-bold text-stone-800"
                />
                <input
                  value={item.alt_text || ''}
                  onChange={e => handleUpdateMeta(item.id, 'alt_text', e.target.value)}
                  placeholder="Alt text"
                  className="w-full rounded border border-stone-200 px-2 py-1 text-xs text-stone-600"
                />
                <div className="flex items-center gap-1">
                  <input value={item.url} readOnly className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-400" />
                  <button onClick={() => { navigator.clipboard?.writeText(item.url); }} className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-500 hover:bg-stone-50">Copy</button>
                  <button onClick={() => handleDelete(item.id)} className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}