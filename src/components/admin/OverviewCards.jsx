import { Users, Eye, Calendar, CalendarDays } from 'lucide-react';

const colorMap = {
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700'
};

export default function OverviewCards({ overview }) {
  const cards = [
    { label: 'Общо сесии', value: overview.totalSessions, icon: Eye, color: 'amber' },
    { label: 'Уникални посетители', value: overview.uniqueVisitors, icon: Users, color: 'blue' },
    { label: 'Днес', value: overview.sessionsToday, icon: Calendar, color: 'green' },
    { label: 'Тази седмица', value: overview.sessionsThisWeek, icon: CalendarDays, color: 'purple' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[card.color]}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-stone-500">{card.label}</p>
                <p className="text-2xl font-bold text-stone-900">{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}