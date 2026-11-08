import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getAnalyticsContext } from '@/lib/marketing/analyticsContext';
import { useTrialI18n } from '@/lib/landing/i18n';

export default function TrialCheckout() {
  const { t } = useTrialI18n();
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState('');
  const purchase = async planCode => {
    if (purchasing) return;
    // Reserve the checkout tab during the click, before any asynchronous auth/checkout call.
    const framed = window.self !== window.top;
    const tab = framed ? window.open('', '_blank') : null;
    if (framed && !tab) { setError('Allow popups to continue to checkout.'); return; }
    if (tab) tab.opener = null;
    setPurchasing(planCode);
    setError('');
    try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        const login = `/login?returnTo=${encodeURIComponent(`/portal?checkout=${planCode}`)}`;
        if (tab) tab.location.replace(new URL(login, window.location.origin).href);
        else window.location.assign(login);
        return;
      }
      const res = await base44.functions.invoke('createOrder', { planCode,analytics:getAnalyticsContext() });
      const url = res.data?.checkoutUrl;
      if (!url) throw new Error(res.data?.providerError || res.data?.error || 'Checkout unavailable');
      if (tab) tab.location.replace(url);
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      setError(err.response?.data?.error || err.message || 'Checkout failed');
      setPurchasing(null);
    }
  };
  return <div className="mt-6 space-y-3">
    {['weekend','premium'].map(code => <button key={code} type="button" onClick={() => purchase(code)} disabled={!!purchasing} className="w-full rounded-xl border border-amber-500 bg-stone-800 p-4 text-left transition-colors hover:bg-stone-700 disabled:opacity-50">
      <span className="block font-bold text-stone-100">{code === 'weekend' ? t.trial.expired.weekendPass : t.trial.expired.premium}</span>
      <span className="text-sm text-stone-300">{purchasing === code ? 'Opening checkout…' : code === 'weekend' ? t.trial.expired.weekendDesc : t.trial.expired.premiumDesc}</span>
    </button>)}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}