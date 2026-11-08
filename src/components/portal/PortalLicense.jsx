import { useState } from 'react';
import { CreditCard, Clock, CheckCircle, XCircle, AlertCircle, FlaskConical, RotateCcw, Plus, Minus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getAnalyticsContext } from '@/lib/marketing/analyticsContext';

// Portal License & Plan — shows current entitlement, status, upgrades.
// Server-side source of truth — Portal does NOT decide entitlement.
// Includes developer test controls for dev/owner users.
export default function PortalLicense({ data, t }) {
  const entitlement = data?.entitlement;
  const trial = data?.trial;
  const developerAccess = data?.developerAccess || false;
  const developmentMode = data?.developmentMode || false;
  const bypassReason = data?.bypassReason || '';

  const [devLoading, setDevLoading] = useState(false);
  const [devMessage, setDevMessage] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);

  const paymentStatus = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('payment') : null;

  const handlePurchase = async (planCode) => {
    if(purchasing)return;
    const framed=window.self!==window.top,tab=framed?window.open('','_blank'):null;
    if(framed&&!tab){setPurchaseError('Allow popups to continue to checkout.');return;}
    if(tab)tab.opener=null;
    setPurchasing(planCode);
    setPurchaseError(null);
    try {
      const res = await base44.functions.invoke('createOrder', { planCode,analytics:getAnalyticsContext() });
      const checkoutUrl = res.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error(res.data?.providerError || 'checkout_unavailable');
      if(tab)tab.location.replace(checkoutUrl);else window.location.assign(checkoutUrl);
    } catch (e) {
      tab?.close();
      setPurchaseError(e.response?.data?.error || e.message || 'checkout_failed');
      setPurchasing(null);
    }
  };

  const type = entitlement?.type || 'none';
  const status = entitlement?.status || 'none';
  const hasActivePaidEntitlement = status === 'active' && (type === 'premium' || type === 'weekend');

  const planInfo = {
    trial: { name: t.license.trial, features: ['Dual decks & crossfader', 'Unlimited local library', 'BPM & Key analysis', 'Auto DJ', 'MIDI mapping', 'Session recording'] },
    weekend: { name: t.license.weekend, features: ['Everything in Trial, unlimited', 'No playback time limit', 'All features unlocked', 'Perfect for a weekend'] },
    premium: { name: t.license.premium, features: ['Everything unlimited', 'No Trial limits', 'Desktop builds (Coming soon)', 'Offline mode', 'Priority support', 'Early access'] }
  };

  const handleDevAction = async (action, params = {}) => {
    setDevLoading(true);
    setDevMessage(null);
    try {
      const res = await base44.functions.invoke('devTestControls', { action, ...params });
      setDevMessage({ type: 'success', text: res.data?.ok ? 'Action completed' : res.data?.error || 'Failed' });
      // Trigger portal refresh
      if (window.location.reload) setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setDevMessage({ type: 'error', text: e.response?.data?.error || e.message || 'Request failed' });
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-stone-900">{t.license.title}</h2>

      {/* Current Plan */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-stone-500">{t.license.currentPlan}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{type !== 'none' ? planInfo[type]?.name : t.license.noEntitlement}</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${
            status === 'active' ? 'bg-green-100 text-green-700' : status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'
          }`}>
            {status === 'active' ? <CheckCircle size={16} /> : status === 'expired' ? <XCircle size={16} /> : <AlertCircle size={16} />}
            {status === 'active' ? t.license.active : status === 'expired' ? t.license.expired : status}
          </div>
        </div>

        {type === 'trial' && trial && (
          <div className="mt-4 flex items-center gap-2 text-sm text-stone-600">
            <Clock size={16} className="text-amber-600" />
            {t.license.remaining}: {Math.floor(trial.playback_remaining_seconds / 60)}m / {Math.floor(trial.trial_limit_seconds / 60)}m
          </div>
        )}
        {entitlement?.expires_at && (type === 'premium' || type === 'weekend') && (
          <div className="mt-4 flex items-center gap-2 text-sm text-stone-600">
            <Clock size={16} className="text-amber-600" />
            {t.license.validUntil}: {new Date(entitlement.expires_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Developer Test Controls */}
      {developerAccess && (
        <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={18} className="text-amber-600" />
            <h3 className="text-sm font-bold tracking-wider text-amber-700">DEVELOPER TEST CONTROLS</h3>
            {developmentMode && <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">DEV MODE</span>}
            {bypassReason && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{bypassReason}</span>}
          </div>
          <p className="mb-3 text-xs text-amber-700">Test entitlements without real payments. Changes are audit-logged.</p>

          <div className="grid gap-2 sm:grid-cols-3">
            <button
              onClick={() => handleDevAction('grant_entitlement', { entitlementType: 'weekend' })}
              disabled={devLoading}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Plus size={14} /> Grant Weekend
            </button>
            <button
              onClick={() => handleDevAction('grant_entitlement', { entitlementType: 'premium' })}
              disabled={devLoading}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              <Plus size={14} /> Grant Premium
            </button>
            <button
              onClick={() => handleDevAction('reset_trial')}
              disabled={devLoading}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              <RotateCcw size={14} /> Reset Trial
            </button>
          </div>

          {entitlement?.manually_granted && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleDevAction('revoke_entitlement', { entitlementId: entitlement.id })}
                disabled={devLoading}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Minus size={12} /> Revoke Current Entitlement
              </button>
            </div>
          )}

          {devMessage && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${devMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {devMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Features */}
      {type !== 'none' && planInfo[type] && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.license.features}</h3>
          <ul className="space-y-1.5">
            {planInfo[type].features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                <CheckCircle size={14} className="text-green-500" /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payment status banners */}
      {paymentStatus === 'success' && hasActivePaidEntitlement && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600 shrink-0" />
          <span>Payment received! Your {type === 'weekend' ? 'Weekend Pass' : 'Premium'} is active.</span>
        </div>
      )}
      {paymentStatus === 'success' && !hasActivePaidEntitlement && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
          <span>Payment received! We're activating your plan. This may take a moment.</span>
        </div>
      )}
      {paymentStatus === 'canceled' && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          Payment was canceled. No charge was made.
        </div>
      )}

      {/* Upgrades */}
      {type !== 'premium' && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-bold tracking-wider text-stone-500">{t.license.upgrades}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {type !== 'weekend' && (
              <UpgradeCard name={t.license.weekend} price="€4.99" period="3 days" cta={t.license.upgradeWeekend} onPurchase={() => handlePurchase('weekend')} loading={purchasing === 'weekend'} disabled={!!purchasing} />
            )}
            <UpgradeCard name={t.license.premium} price="€12.99" period="/ month" cta={t.license.upgradePremium} highlight onPurchase={() => handlePurchase('premium')} loading={purchasing === 'premium'} disabled={!!purchasing} />
          </div>
          {purchaseError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{purchaseError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function UpgradeCard({ name, price, period, cta, highlight, onPurchase, loading, disabled }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}>
      <p className="font-bold text-stone-900">{name}</p>
      <p className="mt-1 text-lg font-bold text-stone-900">{price} <span className="text-sm font-normal text-stone-500">{period}</span></p>
      <button onClick={onPurchase} disabled={disabled || loading} className="mt-3 w-full rounded-lg bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
        {loading ? 'Redirecting…' : cta}
      </button>
    </div>
  );
}