import useDjProfile from '@/hooks/useDjProfile';
import { Loader2, Globe, EyeOff, Link2 } from 'lucide-react';

// Privacy settings — profile visibility control.
export default function PrivacySettings() {
  const { profile, loading, updateProfile } = useDjProfile();

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-stone-500" /></div>;
  }

  if (!profile) {
    return <p className="text-sm text-stone-500">No profile found.</p>;
  }

  const setVisibility = async (visibility) => {
    await updateProfile({ visibility });
  };

  const options = [
    {
      value: 'public',
      icon: Globe,
      label: 'Public',
      desc: 'Your profile is visible to everyone and appears in public lists.',
      color: 'text-green-400'
    },
    {
      value: 'unlisted',
      icon: Link2,
      label: 'Unlisted',
      desc: 'Accessible via direct link only. Not in public lists or search.',
      color: 'text-blue-400'
    },
    {
      value: 'private',
      icon: EyeOff,
      label: 'Private',
      desc: 'Only you and authorized admins can view your profile.',
      color: 'text-red-400'
    }
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-400">
        Control who can see your DJ profile. This is enforced server-side.
      </p>
      {options.map(opt => {
        const Icon = opt.icon;
        const isActive = profile.visibility === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setVisibility(opt.value)}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              isActive
                ? 'border-amber-600 bg-amber-900/20'
                : 'border-stone-700 bg-stone-900 hover:bg-stone-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} className={opt.color} />
              <div className="flex-1">
                <div className="font-bold text-stone-200">{opt.label}</div>
                <div className="text-xs text-stone-500">{opt.desc}</div>
              </div>
              {isActive && (
                <div className="h-5 w-5 rounded-full bg-amber-600 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        );
      })}
      {profile.visibility !== 'private' && (
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3 text-xs text-stone-500">
          Your public URL: <span className="text-amber-500">{window.location.origin}/dj/{profile.slug}</span>
        </div>
      )}
    </div>
  );
}