import { useState } from 'react';
import { Disc3, Loader2, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTrialI18n } from '@/lib/landing/i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Free-trial onboarding gate for anonymous visitors.
// Collects email + DJ nickname + optional avatar, creates a server-side
// TrialProfile (40-min trial), and sends a welcome email.
export default function TrialOnboarding({ onComplete, onSignIn, onClose }) {
  const { t } = useTrialI18n();
  const tr = t.trial.onboarding;
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarName, setAvatarName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAvatar = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tr.errAvatar); return; }
    if (file.size > 4 * 1024 * 1024) { setError(tr.errAvatarSize); return; }
    setUploading(true);
    setError('');
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(res.file_url);
      setAvatarName(file.name);
    } catch {
      setError(tr.errAvatarUpload);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email.trim())) { setError(tr.errEmail); return; }
    if (!nickname.trim()) { setError(tr.errNickname); return; }
    if (submitting) return; // double-click guard
    setSubmitting(true);
    try {
      const installationId = localStorage.getItem('crosscue-installation-id') || '';
      const res = await base44.functions.invoke('createTrialProfile', {
        email: email.trim(),
        djNickname: nickname.trim(),
        avatarUrl,
        installationId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        language: navigator.language || '',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      });
      const data = res.data;
      if (data?.error) { setError(data.error); setSubmitting(false); return; }
      if (data?.trialToken) {
        localStorage.setItem('crosscue-trial-token', data.trialToken);
        localStorage.setItem('crosscue-trial-nickname', data.djNickname || nickname.trim());
        if (data.avatarUrl) localStorage.setItem('crosscue-trial-avatar', data.avatarUrl);
        onComplete?.(data);
      } else {
        setError(data?.error || tr.errGeneric);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || tr.errGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
            <Disc3 size={28} className="text-amber-400" />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-100">{tr.welcome}</h1>
          <p className="mt-2 text-sm text-stone-400">{tr.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">{tr.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={120}
              autoFocus
              placeholder={tr.emailPlaceholder}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">{tr.djName}</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={60}
              placeholder={tr.djNamePlaceholder}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2.5 text-sm text-stone-100 outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">
              {tr.avatar} <span className="text-stone-500">{tr.avatarOptional}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2.5 text-sm text-stone-300 hover:bg-stone-700">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span className="truncate">{avatarName || tr.avatarPlaceholder}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={e => handleAvatar(e.target.files?.[0])}
                className="hidden"
              />
              {avatarUrl && <X size={14} className="ml-auto" onClick={e => { e.preventDefault(); setAvatarUrl(''); setAvatarName(''); }} />}
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Disc3 size={16} />}
            {tr.startMixing}
          </button>

          <p className="text-center text-xs text-stone-500">
            {tr.explanation}
          </p>
        </form>

        {onSignIn && (
          <p className="mt-4 text-center text-xs text-stone-500">
            {tr.hasAccount}{' '}
            <button onClick={onSignIn} className="font-medium text-amber-400 hover:underline">{tr.signIn}</button>
          </p>
        )}
      </div>
    </div>
  );
}