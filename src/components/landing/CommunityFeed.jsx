// Community & Product Feedback Hub — voting, bug reports, feature requests and Facebook.
import { useState, useEffect } from 'react';
import { Bug, Lightbulb, Vote, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/landing/i18n';
import { communityTranslations } from '@/lib/landing/communityTranslations';
import { base44 } from '@/api/base44Client';
import BugReportDialog from '@/components/landing/BugReportDialog';
import FeatureRequestDialog from '@/components/landing/FeatureRequestDialog';
import FeatureVotingPanel from '@/components/landing/FeatureVotingPanel';
import FacebookCommunityCard from '@/components/landing/FacebookCommunityCard';

export default function CommunityFeed() {
  const { t, lang } = useI18n();
  const ct = communityTranslations[lang] || communityTranslations.en;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bugOpen, setBugOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);

  const fetchData = () => {
    setLoading(true);
    base44.functions.invoke('getCommunityFeedData', { feature_limit: 20 })
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleVoteChange = (featureId, voted, newCount) => {
    setData(prev => prev ? {
      ...prev,
      features: prev.features.map(f => f.id === featureId ? { ...f, vote_count: newCount } : f),
      user_votes: voted ? [...prev.user_votes, featureId] : prev.user_votes.filter(id => id !== featureId)
    } : prev);
  };

  const features = data?.features || [];
  const userVotes = data?.user_votes || [];
  const authenticated = data?.authenticated || false;

  return (
    <section id="community" className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.community.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.community.subtitle}</p>

        {/* Feature Voting — real data */}
        <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Vote size={18} className="text-amber-600" />
              <h3 className="text-lg font-bold text-stone-900">{ct.voting.title}</h3>
            </div>
            <button onClick={() => setFeatureOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-700">
              <Lightbulb size={14} /> {t.community.items[1].action}
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-stone-400" />
            </div>
          ) : (
            <div className="mt-4">
              <FeatureVotingPanel features={features} userVotes={userVotes} authenticated={authenticated} onVoteChange={handleVoteChange} />
            </div>
          )}
        </div>

        {/* Action cards */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Report a Bug */}
          <button onClick={() => setBugOpen(true)} className="group rounded-2xl border border-stone-200 bg-stone-50 p-6 text-left transition hover:border-amber-400 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition group-hover:bg-amber-500 group-hover:text-white">
              <Bug size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-stone-900">{t.community.items[0].title}</h3>
            <p className="mt-2 text-sm text-stone-600">{t.community.items[0].desc}</p>
            <span className="mt-4 inline-block text-sm font-bold text-amber-700">{t.community.items[0].action} →</span>
          </button>

          {/* Suggest a Feature */}
          <button onClick={() => setFeatureOpen(true)} className="group rounded-2xl border border-stone-200 bg-stone-50 p-6 text-left transition hover:border-amber-400 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition group-hover:bg-amber-500 group-hover:text-white">
              <Lightbulb size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-stone-900">{t.community.items[1].title}</h3>
            <p className="mt-2 text-sm text-stone-600">{t.community.items[1].desc}</p>
            <span className="mt-4 inline-block text-sm font-bold text-amber-700">{t.community.items[1].action} →</span>
          </button>

          {/* Facebook Community */}
          <FacebookCommunityCard />
        </div>

      </div>

      <BugReportDialog open={bugOpen} onClose={() => setBugOpen(false)} />
      <FeatureRequestDialog open={featureOpen} onClose={() => setFeatureOpen(false)} />
    </section>
  );
}