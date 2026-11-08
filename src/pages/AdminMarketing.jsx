import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, RefreshCw, Megaphone, LayoutDashboard, FolderKanban, Link2, Users, Globe2, BookOpen, Calendar, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MarketingDashboard from '@/components/marketing/MarketingDashboard';
import CampaignManager from '@/components/marketing/CampaignManager';
import UtmLinkBuilder from '@/components/marketing/UtmLinkBuilder';
import CommunityCampaigns from '@/components/marketing/CommunityCampaigns';
import MarketIntelligence from '@/components/marketing/MarketIntelligence';
import CampaignLessons from '@/components/marketing/CampaignLessons';
import CampaignCalendar from '@/components/marketing/CampaignCalendar';
import BrandLibrary from '@/components/marketing/BrandLibrary';
import InternalTrafficRules from '@/components/marketing/InternalTrafficRules';
import TrafficFilter from '@/components/analytics/TrafficFilter';
import TrafficComparison from '@/components/analytics/TrafficComparison';
import useTrafficFilter from '@/hooks/useTrafficFilter';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campaigns', icon: FolderKanban },
  { id: 'links', label: 'Links / UTM', icon: Link2 },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'intelligence', label: 'Market Intelligence', icon: Globe2 },
  { id: 'lessons', label: 'Lessons Learned', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'brand', label: 'Brand / Templates', icon: MessageSquare },
  { id: 'traffic-rules', label: 'Internal/Bot Traffic Rules', icon: Shield },
];

export default function AdminMarketing() {
  const [tab, setTab] = useState('dashboard');
  const [trafficFilter,setTrafficFilter]=useTrafficFilter('marketing');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    base44.functions.invoke('getMarketingDashboard', {traffic_filter:trafficFilter})
      .then(res => { setData(res.data); setError(null); })
      .catch(err => setError(err.response?.status === 403 ? 'forbidden' : 'error'))
      .finally(() => setLoading(false));
  }, [trafficFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <RefreshCw className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <Shield className="h-12 w-12 text-stone-400" />
        <p className="text-lg font-bold text-stone-900">Access denied</p>
        <p className="text-stone-500">Marketing Center is for administrators only.</p>
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">
          <ArrowLeft size={16} /> Back to app
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <p className="text-lg font-bold text-stone-900">Error loading marketing data</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800">
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="admin-content min-h-screen bg-stone-50">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Megaphone size={20} className="text-amber-600" />
            <span className="font-serif text-lg font-bold tracking-wider text-stone-900">CROSSCUE Marketing Center</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1 border-r border-stone-200 pr-4">
              <Link to="/admin" className="text-sm font-medium text-stone-500 hover:text-amber-700">← Control Room</Link>
            </nav>
            <button onClick={fetchData} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">
              <ArrowLeft size={14} /> To app
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl border-t border-stone-100 px-6">
          <nav className="flex gap-1 overflow-x-auto py-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-amber-50 text-amber-800'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                  }`}
                >
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6"><TrafficFilter mode={trafficFilter} onChange={setTrafficFilter} traffic={data.traffic}/></div>
        {tab === 'dashboard' && <><div className="mb-6"><TrafficComparison comparison={data.comparison}/></div><MarketingDashboard data={data} /></>}
        {tab === 'traffic-rules' && <InternalTrafficRules onDataChange={fetchData}/>}
        {tab === 'campaigns' && <CampaignManager data={data} onDataChange={fetchData} />}
        {tab === 'links' && <UtmLinkBuilder data={data} onDataChange={fetchData} />}
        {tab === 'community' && <CommunityCampaigns data={data} onDataChange={fetchData} />}
        {tab === 'intelligence' && <MarketIntelligence data={data} onDataChange={fetchData} />}
        {tab === 'lessons' && <CampaignLessons data={data} onDataChange={fetchData} />}
        {tab === 'calendar' && <CampaignCalendar data={data} />}
        {tab === 'brand' && <BrandLibrary data={data} onDataChange={fetchData} />}
      </main>
    </div>
  );
}