import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

export default function GeoSection({ geo }) {
  const { markers, topCountries, topCities } = geo;

  if (!markers || markers.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900">География</h3>
        <div className="mt-4 flex flex-col items-center gap-2 py-12 text-stone-400">
          <MapPin size={32} />
          <p className="text-sm">Все още няма географски данни.</p>
        </div>
      </div>
    );
  }

  const center = markers.length > 0
    ? [markers.reduce((sum, m) => sum + m.lat, 0) / markers.length, markers.reduce((sum, m) => sum + m.lon, 0) / markers.length]
    : [20, 0];

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-900">География</h3>
      <div className="mt-4 h-56 overflow-hidden rounded-lg border border-stone-200">
        <MapContainer center={center} zoom={1} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {markers.map((m, i) => (
            <CircleMarker key={i} center={[m.lat, m.lon]} radius={Math.min(4 + m.count * 2, 20)} fillOpacity={0.6} stroke={false} color="#f59e0b">
              <Popup>{`${m.city || m.country || 'Неизвестно'}: ${m.count} посещения`}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500">Топ държави</h4>
          <ul className="mt-2 space-y-1">
            {topCountries.map((c, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-stone-600">{c.country}</span>
                <span className="font-bold text-stone-900">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500">Топ градове</h4>
          <ul className="mt-2 space-y-1">
            {topCities.map((c, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-stone-600">{c.city}</span>
                <span className="font-bold text-stone-900">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}