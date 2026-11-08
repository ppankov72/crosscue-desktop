import { TrendingUp, Users, MousePointerClick, DollarSign, Target, Activity, Award, Repeat, Globe2, MessageSquare, PlayCircle, Disc3 } from 'lucide-react';
import MarketingFunnel from '@/components/marketing/MarketingFunnel';
import { formatCurrency, formatNumber, formatPercent, getStatusMeta, getChannelLabel } from '@/lib/marketing/constants';

export default function MarketingDashboard({ data }) {
  const { overview, campaigns } = data;

  const activeCampaigns = campaigns.filter(c => !c.is_template && c.status === 'active');
  const topCampaigns = [...campaigns]
    .filter(c => !c.is_template)
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  const topChannel = (() => {
    const chMap = {};
    campaigns.filter(c => !c.is_template && c.status === 'active').forEach(c => {
      if (!c.channel) return;
      if (!chMap[c.channel]) chMap[c.channel] = { visits: 0, revenue: 0 };
      chMap[c.channel].visits += c.visits || 0;
      chMap[c.channel].revenue += c.revenue || 0;
    });
    const sorted = Object.entries(chMap).sort((a, b) => b[1].revenue - a[1].revenue);
    return sorted.length ? { channel: sorted[0][0], ...sorted[0][1] } : null;
  })();

  const topMarket = (() => {
    const mMap = {};
    campaigns.filter(c => !c.is_template && c.status === 'active').forEach(c => {
      if (!c.target_market) return;
      if (!mMap[c.target_market]) mMap[c.target_market] = { visits: 0, revenue: 0 };
      mMap[c.target_market].visits += c.visits || 0;
      mMap[c.target_market].revenue += c.revenue || 0;
    });
    const sorted = Object.entries(mMap).sort((a, b) => b[1].revenue - a[1].revenue);
    return sorted.length ? { market: sorted[0][0], ...sorted[0][1] } : null;
  })();



  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Visits" value={formatNumber(overview.totalVisits)} sub={`${overview.activeCampaigns} active campaigns`} />
        <KpiCard icon={MousePointerClick} label="Registrations" value={formatNumber(overview.totalRegistrations)} sub={`from ${overview.totalCampaigns} campaigns`} />
        <KpiCard icon={Activity} label="Trial Starts" value={formatNumber(overview.totalTrials)} sub={formatPercent(overview.totalTrials / (overview.totalRegistrations || 1)) + ' of registrations'} />
        <KpiCard
          icon={Target}
          label="Paid Purchases (Live)"
          value={formatNumber(overview.totalPurchases)}
          sub={
            overview.testPurchases
              ? `${overview.totalPurchases} Live · ${overview.testPurchases} Test (${overview.allPurchases || overview.totalPurchases} total orders)`
              : `${overview.weekendPasses} Weekend · ${overview.premiumSubs} Premium`
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Revenue (Stripe Live)"
          value={formatCurrency(overview.totalRevenue)}
          sub={
            overview.testRevenue
              ? `Verified Live · ${formatCurrency(overview.testRevenue)} test excluded`
              : 'from verified Stripe Live orders'
          }
          highlight
        />
        <KpiCard icon={TrendingUp} label="Trial → Paid" value={formatPercent(overview.trialToPaidRate)} sub="conversion rate" />
        <KpiCard icon={DollarSign} label="Total Spend" value={formatCurrency(overview.totalSpend)} sub={`of ${formatCurrency(overview.totalBudget)} budget`} />
        <KpiCard icon={Repeat} label="ROAS" value={overview.overallRoas !== null ? formatPercent(overview.overallRoas) : 'N/A'} sub={overview.overallCac !== null ? `CAC ${formatCurrency(overview.overallCac)}` : 'CAC: N/A'} />
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-800">Free Core & Mix Intent Signals (Stage 1)</h2>
            <p className="text-xs text-stone-500">Privacy-gated analytics events (analytics consent required · once per session deduplicated)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              Meta Pixel: 1453792916709017 (Consent-Gated)
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {data.traffic?.filter === 'all' ? 'All traffic' : 'Real traffic'}
            </span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={PlayCircle}
            label="StartMix_Free"
            value={formatNumber(overview.totalStartMixFree || 0)}
            sub="First real playback in Free Core (excludes Trial/Paid)"
          />
          <KpiCard
            icon={Disc3}
            label="Intent_Mix_30s"
            value={formatNumber(overview.totalIntentMix30s || 0)}
            sub="30s cumulative dual-deck simultaneous playback"
          />
          <KpiCard
            icon={TrendingUp}
            label="Visit → StartMix_Free"
            value={overview.startMixFreeRate !== null && overview.startMixFreeRate !== undefined ? formatPercent(overview.startMixFreeRate) : '—'}
            sub="share of visits starting Free Core playback"
          />
          <KpiCard
            icon={Activity}
            label="StartMix_Free → Intent_30s"
            value={overview.intentMixFromStartRate !== null && overview.intentMixFromStartRate !== undefined ? formatPercent(overview.intentMixFromStartRate) : '—'}
            sub="dual-deck mix ratio from Free Core starts"
          />
        </div>
      </section>

      <MarketingFunnel data={data}/>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-700">Top Campaigns by Revenue</h2>
          {topCampaigns.length === 0 ? (
            <p className="text-sm text-stone-400">No campaign data yet. Create a campaign to see metrics.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                    <th className="pb-2">Campaign</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Visits</th>
                    <th className="pb-2 text-right">Trials</th>
                    <th className="pb-2 text-right">Purchases</th>
                    <th className="pb-2 text-right">Revenue</th>
                    <th className="pb-2 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map(c => {
                    const sm = getStatusMeta(c.status);
                    return (
                      <tr key={c.id} className="border-b border-stone-100">
                        <td className="py-2.5">
                          <div className="font-medium text-stone-800">{c.name}</div>
                          <div className="text-xs text-stone-400">{c.internal_code} · {getChannelLabel(c.channel)}</div>
                        </td>
                        <td className="py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sm.color}`}>{sm.label}</span>
                        </td>
                        <td className="py-2.5 text-right text-stone-600">{formatNumber(c.visits)}</td>
                        <td className="py-2.5 text-right text-stone-600">{formatNumber(c.trials)}</td>
                        <td className="py-2.5 text-right text-stone-600">{formatNumber(c.purchases)}</td>
                        <td className="py-2.5 text-right font-medium text-stone-900">{formatCurrency(c.revenue, c.currency)}</td>
                        <td className="py-2.5 text-right text-stone-600">{c.roas !== null ? formatPercent(c.roas) : 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <Award size={16} /><span className="text-xs font-bold uppercase tracking-wide">Top Channel</span>
            </div>
            {topChannel ? (
              <div className="mt-2">
                <p className="text-xl font-bold text-stone-900">{getChannelLabel(topChannel.channel)}</p>
                <p className="mt-1 text-xs text-stone-400">{formatCurrency(topChannel.revenue)} revenue · {formatNumber(topChannel.visits)} visits</p>
              </div>
            ) : <p className="mt-2 text-sm text-stone-400">No data</p>}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <Globe2 size={16} /><span className="text-xs font-bold uppercase tracking-wide">Top Market</span>
            </div>
            {topMarket ? (
              <div className="mt-2">
                <p className="text-xl font-bold text-stone-900">{topMarket.market}</p>
                <p className="mt-1 text-xs text-stone-400">{formatCurrency(topMarket.revenue)} revenue · {formatNumber(topMarket.visits)} visits</p>
              </div>
            ) : <p className="mt-2 text-sm text-stone-400">No data</p>}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-stone-500">
              <MessageSquare size={16} /><span className="text-xs font-bold uppercase tracking-wide">Active Campaigns</span>
            </div>
            <p className="mt-2 text-xl font-bold text-stone-900">{activeCampaigns.length}</p>
            <p className="mt-1 text-xs text-stone-400">{activeCampaigns.filter(c => c.actual_spend > 0).length} with spend recorded</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${highlight ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
      <div className="flex items-center gap-2 text-stone-500">
        <Icon size={16} /><span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-amber-900' : 'text-stone-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
    </div>
  );
}