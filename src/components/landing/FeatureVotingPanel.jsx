// Phase G.1 — Feature voting panel with real vote counts and one-vote-per-user enforcement.
import { useState } from 'react';
import { Loader2, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { communityTranslations } from '@/lib/landing/communityTranslations';
import { base44 } from '@/api/base44Client';

export default function FeatureVotingPanel({ features, userVotes, authenticated, onVoteChange }) {
  const { lang } = useI18n();
  const t = (communityTranslations[lang] || communityTranslations.en).voting;
  const [voting, setVoting] = useState(null);
  const [error, setError] = useState(null);

  if (!features || features.length === 0) {
    return <p className="py-6 text-center text-sm text-stone-400">{t.noFeatures}</p>;
  }

  const handleVote = async (featureId, isVoted) => {
    if (!authenticated) { setError(t.loginRequired); return; }
    setError(null);
    setVoting(featureId);
    try {
      const res = await base44.functions.invoke('voteForFeature', {
        feature_request_id: featureId,
        action: isVoted ? 'unvote' : 'vote'
      });
      if (res.data?.ok) {
        onVoteChange(featureId, res.data.voted, res.data.vote_count);
      } else {
        setError(res.data?.error || 'error');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'error');
    }
    setVoting(null);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {features.map(feature => {
        const isVoted = userVotes.includes(feature.id);
        const statusLabel = t.statusLabels[feature.status] || feature.status;
        return (
          <div key={feature.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-stone-900">{feature.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    feature.status === 'released' ? 'bg-green-100 text-green-700' :
                    feature.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                    feature.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    feature.status === 'declined' ? 'bg-stone-100 text-stone-500' :
                    'bg-stone-100 text-stone-600'
                  }`}>{statusLabel}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500 line-clamp-2">{feature.description}</p>
                {feature.admin_response && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    <span className="font-bold">Admin: </span>{feature.admin_response}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleVote(feature.id, isVoted)}
                disabled={voting === feature.id}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition ${
                  isVoted ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-600 hover:border-amber-400 hover:bg-amber-50'
                } disabled:opacity-50`}
              >
                {voting === feature.id ? <Loader2 size={16} className="animate-spin" /> : isVoted ? <ThumbsDown size={16} /> : <ThumbsUp size={16} />}
                <span className="text-lg font-bold">{feature.vote_count}</span>
                <span className="text-xs">{t.votes}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}