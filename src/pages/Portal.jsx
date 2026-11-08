import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, User, CreditCard, Rss, ShoppingBag, Monitor, Shield, Settings as SettingsIcon, Menu, X, LogOut, Clock, Users, Mail, Plug, MessageSquare, FileText, Megaphone, BookOpen } from 'lucide-react';
import { usePortalI18n } from '@/lib/portal/i18n';
import '@/components/portal/PortalContrast.css';
import { isAdminLevel } from '@/lib/crosscue/rbac';
import usePortalData from '@/hooks/usePortalData';
import PortalOverview from '@/components/portal/PortalOverview';
import PortalDjProfile from '@/components/portal/PortalDjProfile';
import PortalLicense from '@/components/portal/PortalLicense';
import PortalMyFeed from '@/components/portal/PortalMyFeed';
import PortalOrders from '@/components/portal/PortalOrders';
import PortalDevices from '@/components/portal/PortalDevices';
import PortalSecurity from '@/components/portal/PortalSecurity';
import PortalSettings from '@/components/portal/PortalSettings';
import PortalInstructions from '@/components/portal/PortalInstructions';
import { base44 } from '@/api/base44Client';
import { getAnalyticsContext } from '@/lib/marketing/analyticsContext';

export default function Portal() {
  const { t, lang, changeLang, languages } = usePortalI18n();
  const { data, loading, error, refresh } = usePortalData();
  const [section, setSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Redirect to login if not authenticated (safety net — RequireAuth handles the primary guard)
  useEffect(() => {
    if (error === 'auth_required') {
      window.location.href = `/login?returnTo=${encodeURIComponent('/portal')}`;
    }
  }, [error]);

  // Auto-trigger Stripe checkout when arriving from Landing/Pricing with ?checkout=planCode.
  // Preserves the user's plan choice across the Login/Signup flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutPlan = params.get('checkout');
    if (!checkoutPlan || !['weekend', 'premium'].includes(checkoutPlan)) return;
    // Remove the param from the URL to prevent retries on refresh
    params.delete('checkout');
    const newSearch = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    setCheckoutLoading(true);
    base44.functions.invoke('createOrder', { planCode: checkoutPlan, analytics: getAnalyticsContext() })
      .then(res => {
        const checkoutUrl = res.data?.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          setCheckoutLoading(false);
          console.error('[Portal] Checkout failed:', res.data?.providerError || res.data?.error);
        }
      })
      .catch(err => {
        setCheckoutLoading(false);
        console.error('[Portal] Checkout error:', err.message);
      });
  }, []);

  if (checkoutLoading) {
    return (
      <div className="portal-readable flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-amber-600 mx-auto" />
          <p className="mt-4 text-sm font-medium text-stone-600">Redirecting to secure checkout…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="portal-readable flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-amber-600" />
      </div>
    );
  }

  if (error && error !== 'auth_required') {
    return (
      <div className="portal-readable flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <p className="text-lg font-bold text-stone-900">{t.common.error}</p>
        <button onClick={refresh} className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">{t.common.retry}</button>
        <Link to="/studio" className="text-sm text-stone-500 hover:text-amber-700">{t.common.backToApp}</Link>
      </div>
    );
  }

  const navItems = [
    { key: 'overview', label: t.nav.overview, icon: LayoutDashboard },
    { key: 'profile', label: t.nav.profile, icon: User },
    { key: 'license', label: t.nav.license, icon: CreditCard },
    { key: 'myfeed', label: t.nav.myfeed, icon: Rss },
    { key: 'orders', label: t.nav.orders, icon: ShoppingBag },
    { key: 'devices', label: t.nav.devices, icon: Monitor },
    { key: 'security', label: t.nav.security, icon: Shield },
    { key: 'instructions', label: t.nav?.instructions || (lang === 'bg' ? 'Инструкции (MIDI)' : lang === 'de' ? 'Anleitungen (MIDI)' : lang === 'es' ? 'Instrucciones (MIDI)' : lang === 'fr' ? 'Instructions (MIDI)' : lang === 'it' ? 'Istruzioni (MIDI)' : lang === 'nl' ? 'Instructies (MIDI)' : lang === 'sr' ? 'Uputstva (MIDI)' : lang === 'ru' ? 'Инструкции (MIDI)' : lang === 'ro' ? 'Instrucțiuni (MIDI)' : lang === 'tr' ? 'Talimatlar (MIDI)' : lang === 'el' ? 'Οδηγίες (MIDI)' : 'Instructions (MIDI)'), icon: BookOpen },
    { key: 'settings', label: t.nav.settings, icon: SettingsIcon },
  ];

  const adminNavItems = [
    { href: '/admin', label: t.nav.controlRoom, icon: Shield },
    { href: '/admin/trial', label: t.nav.adminTrial, icon: Clock },
    { href: '/admin/users', label: t.nav.adminUsers, icon: Users },
    { href: '/admin/invitations', label: t.nav.adminInvitations, icon: Mail },
    { href: '/admin/commerce', label: t.nav.adminCommerce, icon: CreditCard },
    { href: '/admin/integrations', label: t.nav.adminIntegrations, icon: Plug },
    { href: '/admin/feedback', label: t.nav.adminFeedback, icon: MessageSquare },
    { href: '/admin/content', label: t.nav.adminContent, icon: FileText },
    { href: '/admin/marketing', label: t.nav.adminMarketing, icon: Megaphone },
  ];

  const showAdminNav = isAdminLevel(data?.account);

  const renderSection = () => {
    switch (section) {
      case 'overview': return <PortalOverview data={data} t={t} onNavigate={setSection} />;
      case 'profile': return <PortalDjProfile data={data} t={t} onRefresh={refresh} loading={loading} />;
      case 'license': return <PortalLicense data={data} t={t} />;
      case 'myfeed': return <PortalMyFeed data={data} t={t} onRefresh={refresh} />;
      case 'orders': return <PortalOrders t={t} />;
      case 'devices': return <PortalDevices t={t} />;
      case 'security': return <PortalSecurity data={data} t={t} />;
      case 'instructions': return <PortalInstructions lang={lang} />;
      case 'settings': return <PortalSettings t={t} lang={lang} changeLang={changeLang} languages={languages} />;
      default: return <PortalOverview data={data} t={t} onNavigate={setSection} />;
    }
  };

  return (
    <div className="portal-readable min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="lg:hidden rounded-lg p-1.5 hover:bg-stone-100">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE Portal</h1>
              <p className="hidden text-xs text-stone-500 sm:block">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e => changeLang(e.target.value)} className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm">
              {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <Link to="/studio" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-sm font-bold text-white hover:bg-stone-800 sm:px-4">
              <ArrowLeft size={14} /> <span className="hidden sm:inline">{t.common.backToApp}</span>
            </Link>
            <button
              onClick={() => base44.auth.logout('/')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
              title="Log out"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-56 shrink-0`}>
          <nav className="sticky top-20 space-y-1 rounded-xl border border-stone-200 bg-white p-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => { setSection(item.key); setSidebarOpen(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-amber-50 text-amber-700' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
            {showAdminNav && (
              <>
                <div className="mt-3 border-t border-stone-200 pt-3">
                  <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-stone-400">{t.nav.adminSection}</p>
                </div>
                {adminNavItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Icon size={16} /> {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}