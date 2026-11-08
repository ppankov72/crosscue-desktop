import { useEffect, useState } from 'react';
import { Disc3, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useTrialI18n } from '@/lib/landing/i18n';

// Post-trial feedback + thank-you / conversion screen for anonymous free trials.
export default function TrialFeedback({ trialToken, nickname, onSubmitted, onUpgrade }) {
  const { toast } = useToast();
  const { t } = useTrialI18n();
  const tr = t.trial.feedback;
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [useAgain, setUseAgain] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    base44.functions.invoke('getPlans', {}).then(res => setPlans(res.data?.plans || [])).catch(() => {});
  }, []);

  const weekend = plans.find(p => p.code === 'weekend');
  const premium = plans.find(p => p.code === 'premium');

  const submit = async () => {
    if (submitting) return;
    if (!score) { toast({ title: tr.errRating, variant: 'destructive' }); return; }
    if (!useAgain) { toast({ title: tr.errChoice, variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('submitTrialFeedback', { trialToken, score, useAgain, comment });
      if (res.data?.ok) { setDone(true); onSubmitted?.(); }
      else toast({ title: res.data?.error || 'Failed to submit', variant: 'destructive' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Failed to submit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 shadow-2xl">
        {!done ? (
          <>
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
                <Disc3 size={28} className="text-amber-400" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-100">{tr.title}</h1>
              <p className="mt-2 text-sm text-stone-400">{tr.subtitle}</p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-stone-300">{tr.rate}</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setScore(n)}
                      className={`h-9 w-7 rounded text-sm font-bold transition-colors ${
                        (hover || score) >= n ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                    >{n}</button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-stone-500"><span>{tr.poor}</span><span>{tr.excellent}</span></div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-stone-300">{tr.wouldUseAgain}</p>
                <div className="flex gap-2">
                  {[
                    { v: 'yes', l: tr.yes },
                    { v: 'maybe', l: tr.maybe },
                    { v: 'no', l: tr.no }
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setUseAgain(opt.v)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                        useAgain === opt.v ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-stone-600 text-stone-300 hover:bg-stone-800'
                      }`}
                    >{opt.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-stone-300">{tr.comment} <span className="text-stone-500">{tr.commentOptional}</span></p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {tr.submit}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-stone-100">{tr.thanksTitle.replace('{nickname}', nickname || 'DJ')}</h1>
            <p className="mt-2 text-sm text-stone-400">{tr.thanksBody}</p>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{tr.continueMixing}</p>
              {weekend && (
                <button
                  onClick={() => onUpgrade?.('weekend')}
                  className="w-full rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-500/20"
                >
                  <div className="text-sm font-bold text-amber-300">{tr.weekendTitle}</div>
                  <div className="text-xs text-stone-400">{weekend.price ? `€${weekend.price}` : ''} · {tr.weekendDesc}</div>
                </button>
              )}
              {premium && (
                <button
                  onClick={() => onUpgrade?.('premium')}
                  className="w-full rounded-lg border border-stone-600 bg-stone-800 px-4 py-3 text-left hover:bg-stone-700"
                >
                  <div className="text-sm font-bold text-stone-100">{tr.premiumTitle}</div>
                  <div className="text-xs text-stone-400">{premium.price ? `€${premium.price}/mo` : ''} · {tr.premiumDesc}</div>
                </button>
              )}
              <button onClick={() => onUpgrade?.('portal')} className="w-full pt-2 text-xs text-stone-500 hover:text-stone-300">
                {tr.portal}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}