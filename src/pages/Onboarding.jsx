import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Disc3, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// First-time onboarding for newly registered CROSSCUE users.
// Collects only: DJ display name + profile visibility.
// Reuses existing DjProfile architecture (getMyProfile / updateMyProfile).
// If user already has a non-demo profile, skips onboarding.
export default function Onboarding() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [visibility, setVisibility] = useState('private');

  // Load existing profile (getMyProfile auto-creates a demo profile if none exists)
  useEffect(() => {
    base44.functions.invoke('getMyProfile', {})
      .then(res => {
        if (res.data?.profile) {
          const p = res.data.profile;
          setProfile(p);
          setDisplayName(p.display_name || '');
          setVisibility(p.visibility || 'private');
          // If already customized (not demo), redirect to studio
          if (!p.is_demo) {
            navigate('/studio', { replace: true });
          }
        }
      })
      .catch(e => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('Please enter a DJ display name');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('updateMyProfile', {
        display_name: displayName.trim(),
        visibility
      });
      if (res.data?.ok) {
        navigate('/studio', { replace: true });
      } else {
        setError(res.data?.error || 'Failed to save profile');
      }
    } catch (e) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/studio', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-md px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900">
            <Disc3 size={28} className="text-amber-500" />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Welcome to CROSSCUE
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Let's set up your DJ identity. You can change everything later.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* DJ Display Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              DJ Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder="e.g. DJ Nova"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
            <p className="mt-1 text-xs text-stone-400">
              This name appears on your decks and public profile.
            </p>
          </div>

          {/* Profile Visibility */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Profile Visibility
            </label>
            <div className="space-y-2">
              {[
                { value: 'public', label: 'Public', desc: 'Anyone can find your DJ profile' },
                { value: 'unlisted', label: 'Unlisted', desc: 'Only with the direct link' },
                { value: 'private', label: 'Private', desc: 'Only you can see your profile' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                    visibility === opt.value
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={e => setVisibility(e.target.value)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div>
                    <span className="font-medium text-stone-800">{opt.label}</span>
                    <span className="block text-xs text-stone-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Complete Setup
            </button>
          </div>
        </form>

        {/* Post-onboarding links */}
        <p className="mt-6 text-center text-xs text-stone-400">
          After setup, you can{' '}
          <Link to="/studio" className="font-medium text-amber-700 hover:underline">open CROSSCUE</Link>
          {' '}or{' '}
          <Link to="/portal" className="font-medium text-amber-700 hover:underline">go to your Portal</Link>
        </p>
      </div>
    </div>
  );
}