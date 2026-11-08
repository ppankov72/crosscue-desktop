import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Phase E — Portal data aggregation hook.
// Single request to getPortalAccountStatus — no 12 sequential requests.
export default function usePortalData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getPortalAccountStatus', {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.status === 401 ? 'auth_required' : 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortalData(); }, [fetchPortalData]);

  return { data, loading, error, refresh: fetchPortalData };
}