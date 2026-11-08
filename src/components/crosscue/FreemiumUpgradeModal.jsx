import { useState } from 'react';
import { Crown, Clock, Calendar, Check, X, Sparkles, Loader2, Disc3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getAnalyticsContext } from '@/lib/marketing/analyticsContext';
import { PREMIUM_FEATURES } from '@/lib/crosscue/freemium';
import { formatDuration } from '@/lib/crosscue/trialConfig';

export default function FreemiumUpgradeModal({
  open,
  onClose,
  feature = 'general',
  permission,
  onStartTrial,
  language = 'bg'
}) {
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const featureMeta = PREMIUM_FEATURES[feature] || PREMIUM_FEATURES.general;
  const isBg = language === 'bg' || navigator.language?.startsWith('bg');

  const trialUsed = Boolean(
    permission?.trialExpired ||
    (permission?.remainingSeconds !== undefined && permission?.remainingSeconds <= 0 && permission?.trialToken)
  );

  const trialActive = Boolean(
    !permission?.trialExpired &&
    permission?.remainingSeconds > 0 &&
    permission?.trialToken
  );

  const handlePurchase = async (planCode) => {
    if (purchasing) return;
    const isFramed = window.self !== window.top;
    const checkoutTab = isFramed ? window.open('', '_blank') : null;
    if (isFramed && !checkoutTab) {
      setError(isBg ? 'Моля, разрешете изскачащите прозорци (popups) за плащане.' : 'Allow popups to continue to checkout.');
      return;
    }
    if (checkoutTab) checkoutTab.opener = null;

    setPurchasing(planCode);
    setError('');

    try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        const login = `/login?returnTo=${encodeURIComponent(`/portal?checkout=${planCode}`)}`;
        if (checkoutTab) checkoutTab.location.replace(new URL(login, window.location.origin).href);
        else window.location.assign(login);
        return;
      }

      const res = await base44.functions.invoke('createOrder', {
        planCode,
        analytics: getAnalyticsContext()
      });

      const url = res.data?.checkoutUrl;
      if (!url) {
        throw new Error(res.data?.providerError || res.data?.error || (isBg ? 'Плащането временно не е достъпно' : 'Checkout unavailable'));
      }

      if (checkoutTab) checkoutTab.location.replace(url);
      else window.location.assign(url);
    } catch (err) {
      checkoutTab?.close();
      setError(err.response?.data?.error || err.message || (isBg ? 'Грешка при пренасочване' : 'Checkout failed'));
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-[#b9903e] bg-[#171614] p-5 text-[#f5eedb] shadow-[0_10px_35px_rgba(0,0,0,0.85)] sm:p-7">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold tracking-wider text-amber-300 mb-2">
            <Crown size={14} className="text-amber-400" />
            CROSSCUE PREMIUM
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-[#f3e48a]">
            {isBg ? featureMeta.titleBg : featureMeta.titleEn}
          </h2>
          <p className="mt-2 text-sm text-[#c8beaa]">
            {isBg ? featureMeta.descBg : featureMeta.descEn}
          </p>

          {/* Freemium Guarantee Banner */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#4b4434] bg-[#22201b] px-3.5 py-1.5 text-xs text-amber-200/90">
            <Disc3 size={14} className="text-amber-400 flex-shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
            <span>
              {isBg
                ? '🎧 Локалното миксиране на файлове, плочите, EQ и плейлистите са 100% БЕЗПЛАТНИ и неограничени.'
                : '🎧 Local file mixing, vinyl scratching, EQ, and playlists are 100% FREE and unlimited.'}
            </span>
          </div>
        </div>

        {/* 3 Plans / Tiers Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          
          {/* Card 1: 40-Minute Free Trial */}
          <div className="flex flex-col justify-between rounded-xl border border-[#4b4434] bg-[#1e1c18] p-4 shadow-md transition hover:border-amber-600/60">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
                  {isBg ? 'БЕЗПЛАТНО' : 'FREE'}
                </span>
                <Clock size={16} className="text-amber-400" />
              </div>

              <h3 className="mt-3 text-lg font-bold text-stone-100">
                {isBg ? '40 мин. Тест' : '40-Min Trial'}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {isBg ? 'Пълен достъп до всички Premium екстри' : 'Full access to all Premium features'}
              </p>

              <div className="mt-3 text-2xl font-black text-[#f3e48a]">
                0.00 <span className="text-xs font-normal text-stone-400">EUR</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-stone-300">
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? '40 минути реален Premium достъп' : '40 mins of active Premium access'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Без банкова карта' : 'No credit card needed'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Бърза регистрация: DJ име + имейл' : 'Quick signup: DJ name + email'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-[#383429]">
              {trialActive ? (
                <div className="space-y-1.5 text-center">
                  <span className="block text-[11px] text-emerald-400 font-bold">
                    ✓ {isBg ? 'Активен тест' : 'Active trial'}: {formatDuration(permission.remainingSeconds)}
                  </span>
                  <button
                    onClick={onClose}
                    className="w-full rounded-lg bg-emerald-600/80 hover:bg-emerald-600 py-2 text-xs font-bold text-white transition"
                  >
                    {isBg ? 'Продължи към функцията' : 'Continue to feature'}
                  </button>
                </div>
              ) : trialUsed ? (
                <div className="text-center">
                  <span className="inline-block rounded bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-400 w-full border border-stone-700">
                    {isBg ? 'Тестът е използван' : 'Trial used'}
                  </span>
                  <p className="mt-1 text-[10px] text-stone-500">
                    {isBg ? 'Изберете Weekend Pass или Premium' : 'Select Weekend Pass or Premium'}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onStartTrial?.();
                  }}
                  className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-stone-900 transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Sparkles size={13} />
                  {isBg ? 'АКТИВИРАЙ 40 МИН. ТЕСТ' : 'START 40-MIN TRIAL'}
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Weekend Pass */}
          <div className="flex flex-col justify-between rounded-xl border border-amber-500/60 bg-[#22201b] p-4 shadow-lg transition hover:border-amber-400">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-200">
                  {isBg ? 'ЕДНОКРАТНО' : 'ONE-TIME'}
                </span>
                <Calendar size={16} className="text-amber-400" />
              </div>

              <h3 className="mt-3 text-lg font-bold text-stone-100">
                {isBg ? 'Weekend Pass' : 'Weekend Pass'}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {isBg ? '72 часа пълен достъп без абонамент' : '72 hours full access, no subscription'}
              </p>

              <div className="mt-3 text-2xl font-black text-amber-300">
                €4.99 <span className="text-xs font-normal text-stone-400">/ 72h</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-stone-300">
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? '72 часа пълен Premium достъп' : '72h of full Premium access'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Идеален за парти, гиг или събитие' : 'Perfect for a party, gig, or event'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Без автоматично подновяване' : 'No automatic recurring charges'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-[#383429]">
              <button
                type="button"
                onClick={() => handlePurchase('weekend')}
                disabled={Boolean(purchasing)}
                className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-bold text-stone-900 transition flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
              >
                {purchasing === 'weekend' ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{isBg ? 'Зареждане на плащането…' : 'Opening checkout…'}</span>
                  </>
                ) : (
                  <span>{isBg ? 'КУПИ WEEKEND PASS (€4.99)' : 'BUY WEEKEND PASS (€4.99)'}</span>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Monthly Premium */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-amber-400 bg-gradient-to-b from-[#2a2418] to-[#1c1914] p-4 shadow-xl">
            <span className="absolute -top-2.5 right-4 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-950">
              {isBg ? 'ПРЕПОРЪЧАН' : 'POPULAR'}
            </span>

            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
                  {isBg ? 'МЕСЕЧЕН' : 'MONTHLY'}
                </span>
                <Crown size={16} className="text-amber-300" />
              </div>

              <h3 className="mt-3 text-lg font-bold text-stone-100">
                {isBg ? 'Premium План' : 'Premium Monthly'}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {isBg ? 'Неограничен постоянен достъп' : 'Unlimited ongoing professional access'}
              </p>

              <div className="mt-3 text-2xl font-black text-amber-300">
                €12.99 <span className="text-xs font-normal text-stone-400">/ mo</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-stone-200">
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Неограничен Google Drive & Запис' : 'Unlimited Google Drive & Recording'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Всички MIDI мапинг профили' : 'All custom MIDI mapping profiles'}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                  <span>{isBg ? 'Отказване по всяко време' : 'Cancel anytime with 1 click'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t border-[#383429]">
              <button
                type="button"
                onClick={() => handlePurchase('premium')}
                disabled={Boolean(purchasing)}
                className="w-full rounded-lg bg-amber-400 hover:bg-amber-300 py-2.5 text-xs font-extrabold text-stone-950 transition flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
              >
                {purchasing === 'premium' ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{isBg ? 'Зареждане на плащането…' : 'Opening checkout…'}</span>
                  </>
                ) : (
                  <span>{isBg ? 'АБОНИРАЙ СЕ (€12.99/МЕС)' : 'SUBSCRIBE (€12.99/MO)'}</span>
                )}
              </button>
            </div>
          </div>

        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded p-2">
            {error}
          </p>
        )}

        {/* Footer info */}
        <div className="mt-5 flex items-center justify-between border-t border-[#332f25] pt-3 text-[11px] text-[#9d8e72]">
          <span>CROSSCUE Virtual DJ Workstation</span>
          <button onClick={onClose} className="hover:text-amber-300 transition">
            {isBg ? 'Затвори' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}