// Custom chassis section — user-uploaded image or custom colors on DECK PANELS ONLY.
// Mixer and library stay in the selected theme.
import { useState } from 'react';
import { Upload, X, Palette, Image as ImageIcon, Ban } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function CustomChassisSection({ customChassis, onUpdate }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const mode = customChassis?.mode || 'none';
  const colors = customChassis?.colors || ['#1a1a2e', '#16213e'];
  const imageUri = customChassis?.imageUri || null;

  const setMode = m => onUpdate({ customChassis: { ...customChassis, mode: m } });

  const setColor = (index, value) => {
    const next = [...colors];
    next[index] = value;
    onUpdate({ customChassis: { ...customChassis, colors: next } });
  };

  const handleUpload = async file => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 5 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      onUpdate({ customChassis: { ...customChassis, mode: 'image', imageUri: file_uri, imageUrl: null } });
      toast({ title: 'Image uploaded', description: 'Custom chassis image applied to deck panels.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message || 'Could not upload image.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onUpdate({ customChassis: { ...customChassis, mode: 'none', imageUri: null, imageUrl: null } });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#a49778]">Custom chassis applies to <b className="text-[#d5ad58]">deck panels only</b> (Deck A &amp; Deck B). Mixer and library stay in the selected theme.</p>

      {/* Mode selector */}
      <div className="flex gap-1">
        <button onClick={() => setMode('none')} className={`mini-button flex-1 ${mode === 'none' ? 'vinyl-active' : ''}`}><Ban size={12} /> NONE</button>
        <button onClick={() => setMode('colors')} className={`mini-button flex-1 ${mode === 'colors' ? 'vinyl-active' : ''}`}><Palette size={12} /> COLORS</button>
        <button onClick={() => setMode('image')} className={`mini-button flex-1 ${mode === 'image' ? 'vinyl-active' : ''}`}><ImageIcon size={12} /> IMAGE</button>
      </div>

      {/* Colors mode */}
      {mode === 'colors' && (
        <div className="space-y-2 rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] p-3">
          <p className="text-xs font-bold text-[#d5ad58]">DECK PANEL COLORS</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[#bbb]">
              Primary
              <input type="color" value={colors[0] || '#1a1a2e'} onChange={e => setColor(0, e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-[#555] bg-transparent" />
            </label>
            <label className="flex items-center gap-2 text-xs text-[#bbb]">
              Accent
              <input type="color" value={colors[1] || '#16213e'} onChange={e => setColor(1, e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-[#555] bg-transparent" />
            </label>
          </div>
          <div className="h-12 rounded-lg" style={{ background: `linear-gradient(135deg, ${colors[0] || '#1a1a2e'} 0%, ${colors[1] || '#16213e'} 100%)` }} />
        </div>
      )}

      {/* Image mode */}
      {mode === 'image' && (
        <div className="space-y-2 rounded-lg border border-[#3a3a3a] bg-[#1a1a1a] p-3">
          <p className="text-xs font-bold text-[#d5ad58]">DECK PANEL IMAGE</p>
          {imageUri ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate text-xs text-[#888]">{imageUri.slice(0, 40)}…</div>
              <button onClick={removeImage} className="mini-button"><X size={12} /> REMOVE</button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#444] p-6 hover:border-[#666]">
              {uploading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#555] border-t-[#d5ad58]" />
              ) : (
                <>
                  <Upload size={24} className="text-[#888]" />
                  <span className="text-xs text-[#aaa]">Click to upload image (max 5 MB)</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files?.[0])} disabled={uploading} />
            </label>
          )}
          <p className="text-[10px] text-[#777]">A dark overlay is applied automatically for control contrast. The image is stored privately — no public URL, so access follows your app's permissions.</p>
        </div>
      )}
    </div>
  );
}