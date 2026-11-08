import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DjAvatar from '@/components/crosscue/DjAvatar';

export default function PortalAvatarEditor({ profile, form, onChange, onUploadingChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Choose an image under 5 MB.');
      return;
    }
    setError('');
    setUploading(true);
    onUploadingChange(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange({ avatar_type: 'upload', avatar_url: file_url });
    } catch {
      setError('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <DjAvatar type={form.avatar_type} seed={profile.avatar_seed || profile.id} url={form.avatar_url} size={64} />
      <div>
        <p className="mb-2 text-xs font-bold tracking-wider">AVATAR</p>
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm disabled:opacity-50">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : 'Change image'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" aria-label="Choose avatar image" />
        {error && <p role="alert" className="mt-1 text-xs">{error}</p>}
      </div>
    </div>
  );
}