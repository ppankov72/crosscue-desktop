import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/landing/i18n';
import { base44 } from '@/api/base44Client';

const PLAN_CODES = ['trial', 'weekend', 'premium'];

export default function Pricing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => { base44.auth.isAuthenticated().then(setAuthenticated); }, []);

  const handlePurchase = async (planCode) => {
    if (!authenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(`/portal?checkout=${planCode}`)}`);
      return;
    }
    const isFramed = window.self !== window.top;
    const checkoutTab = isFramed ? window.open('', '_blank') : null;
    if (isFramed && !checkoutTab) {
      setError('Allow popups to continue to checkout.');
      return;
    }
    if (checkoutTab) checkoutTab.opener = null;

    setPurchasing(planCode);
    setError(null);
    try {
      const res = await base44.functions.invoke('createOrder', { planCode });
      const checkoutUrl = res.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error(res.data?.providerError || res.data?.error || 'checkout_unavailable');
      if (checkoutTab) {
        checkoutTab.location.replace(checkoutUrl);
      } else {
        window.location.assign(checkoutUrl);
      }
    } catch (e) {
      checkoutTab?.close();
      setError(e.response?.data?.error || e.message || 'checkout_failed');
      setPurchasing(null);
    }
  };

  return (
    <section id="pricing" className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-4xl font-bold text-stone-900">{t.pricing.title}</h2>
        <p className="mt-3 text-center text-lg text-stone-500">{t.pricing.subtitle}</p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {t.pricing.plans.map((plan, i) => {
            const planCode = PLAN_CODES[i];
            const isPaid = planCode === 'weekend' || planCode === 'premium';
            return (
            <div key={i} className={`relative rounded-2xl border-2 p-8 ${i === 1 ? 'border-amber-500 bg-amber-50 shadow-xl' : 'border-stone-200 bg-stone-50'}`}>
              {i === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-white">{t.pricing.popular}</span>}
              <h3 className="text-2xl font-bold text-stone-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-stone-500">{plan.desc}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-stone-900">{plan.price}</span>
                <p className="mt-1 text-sm font-medium text-stone-500">{plan.period}</p>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-stone-700">
                    <Check size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
                    {f}
                  </li>
                ))}
              </ul>
              {isPaid ? (
                <button onClick={() => handlePurchase(planCode)} disabled={purchasing === planCode} className={`mt-8 block w-full rounded-xl py-3 text-center font-bold transition disabled:opacity-50 ${i === 1 ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-stone-800 text-white hover:bg-stone-900'}`}>
                  {purchasing === planCode ? 'Redirecting…' : plan.cta}
                </button>
              ) : (
                <Link to="/studio" className={`mt-8 block rounded-xl py-3 text-center font-bold transition ${i === 1 ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-stone-800 text-white hover:bg-stone-900'}`}>{plan.cta}</Link>
              )}
            </div>
            );
          })}
        </div>
        {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}