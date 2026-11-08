import { Activity, Calendar, Clock, Music, AlertTriangle, HeartCrack } from 'lucide-react';

const colorMap = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  stone: 'bg-stone-200 text-stone-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700'
};

export default function TrialOverviewCards({ overview }) {
  const cards = [
    { label: 'Active Trials', value: overview.activeTrials, icon: Activity, color: 'green' },
    { label: 'Trials Today', value: overview.trialsToday, icon: Calendar, color: 'blue' },
    { label: 'Expired Trials', value: overview.expiredTrials, icon: Clock, color: 'stone' },
    { label: 'Total Playback Hours', value: overview.totalPlaybackHours, icon: Music, color: 'amber' },
    { label: 'Suspicious Attempts', value: overview.suspiciousAttempts, icon: AlertTriangle, color: 'red' },
    { label: 'Heartbeat Lost', value: overview.heartbeatLostSessions, icon: HeartCrack, color: 'orange' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[card.color]}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-stone-500">{card.label}</p>
                <p className="text-xl font-bold text-stone-900">{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}