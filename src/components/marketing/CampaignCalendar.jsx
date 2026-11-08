import { Calendar } from 'lucide-react';
import { getStatusMeta, getChannelLabel, getObjectiveLabel, formatCurrency } from '@/lib/marketing/constants';

export default function CampaignCalendar({ data }) {
  const campaigns = (data.campaigns || []).filter(c => !c.is_template);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Build a 90-day window centered on today
  const days = [];
  const startOffset = -30;
  const endOffset = 60;
  for (let i = startOffset; i < endOffset; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Assign campaigns to days
  const dayMap = {};
  for (const c of campaigns) {
    if (!c.start_date && !c.end_date) continue;
    const start = c.start_date || c.end_date;
    const end = c.end_date || c.start_date;
    for (const day of days) {
      if (day >= start && day <= end) {
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(c);
      }
    }
  }

  // Group by week for display
  const weeks = [];
  let currentWeek = [];
  let currentWeekStart = null;
  for (const day of days) {
    const d = new Date(day);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    if (weekStartStr !== currentWeekStart) {
      if (currentWeek.length) weeks.push({ weekStart: currentWeekStart, days: currentWeek });
      currentWeek = [];
      currentWeekStart = weekStartStr;
    }
    currentWeek.push(day);
  }
  if (currentWeek.length) weeks.push({ weekStart: currentWeekStart, days: currentWeek });

  // Status groups
  const scheduled = campaigns.filter(c => c.status === 'scheduled');
  const active = campaigns.filter(c => c.status === 'active');
  const endingSoon = campaigns.filter(c => {
    if (!c.end_date) return false;
    const end = new Date(c.end_date);
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });
  const finished = campaigns.filter(c => c.status === 'finished');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-900">Campaign Calendar</h2>
        <p className="text-sm text-stone-500">Timeline of scheduled, active, and finished campaigns.</p>
      </div>

      {/* Status summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatusCard label="Scheduled" count={scheduled.length} color="bg-purple-100 text-purple-700" />
        <StatusCard label="Active" count={active.length} color="bg-green-100 text-green-700" />
        <StatusCard label="Ending Soon" count={endingSoon.length} color="bg-amber-100 text-amber-700" />
        <StatusCard label="Finished" count={finished.length} color="bg-stone-200 text-stone-700" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-stone-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          {weeks.map(week => (
            <div key={week.weekStart} className="grid grid-cols-7 gap-1">
              {week.days.map(day => {
                const dayCampaigns = dayMap[day] || [];
                const isToday = day === todayStr;
                const isPast = day < todayStr;
                return (
                  <div
                    key={day}
                    className={`min-h-[60px] rounded-md border p-1 ${
                      isToday ? 'border-amber-400 bg-amber-50' : isPast ? 'border-stone-100 bg-stone-50/50' : 'border-stone-100 bg-white'
                    }`}
                  >
                    <div className={`text-xs ${isToday ? 'font-bold text-amber-700' : 'text-stone-400'}`}>
                      {new Date(day).getDate()}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {dayCampaigns.slice(0, 2).map(c => {
                        const sm = getStatusMeta(c.status);
                        return (
                          <div key={c.id} className={`truncate rounded px-1 py-0.5 text-xs ${sm.color}`} title={c.name}>
                            {c.name}
                          </div>
                        );
                      })}
                      {dayCampaigns.length > 2 && (
                        <div className="text-xs text-stone-400">+{dayCampaigns.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Ending soon list */}
      {endingSoon.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-800">Ending Soon</h3>
          <div className="mt-2 space-y-1">
            {endingSoon.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-800">{c.name}</span>
                <span className="text-xs text-amber-700">ends {c.end_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, count, color }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color.split(' ')[1]}`}>{count}</p>
    </div>
  );
}