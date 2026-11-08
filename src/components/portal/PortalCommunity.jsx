import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Portal Community Feed — compact social layer from MYFEED.
// MYFEED failure shows controlled error, does NOT crash Portal.
export default function PortalCommunity({ t, isConnected }) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getCommunityFeed', { limit: 10, offset: 0 });
      if (res.data?.error) {
        setError(res.data.error);
        setItems([]);
      } else {
        setItems(res.data?.items || []);
      }
    } catch (e) {
      setError('myfeed_unavailable');
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeed(); }, []);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wider text-stone-500">{t.myfeed.community}</h3>
        <button onClick={fetchFeed} disabled={loading} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-4 text-sm text-stone-500">
          <AlertCircle size={16} /> {t.myfeed.communityError}
        </div>
      ) : items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <div className="flex items-center gap-2">
                {item.avatar ? (
                  <img src={item.avatar} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                    {(item.author || '?')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-stone-900">{item.author}</p>
                  <p className="text-xs text-stone-400">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-stone-600">{item.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-stone-400">{t.myfeed.communityEmpty}</p>
      )}
    </div>
  );
}