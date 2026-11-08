import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatDate(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ActivityChart({ activity }) {
  const data = activity.map(a => ({ ...a, label: formatDate(a.date) }));
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-900">Активност (последните 30 дни)</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#a8a29e" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#a8a29e" />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e4', fontSize: 13 }} />
            <Line type="monotone" dataKey="sessions" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}