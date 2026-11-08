import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Hook for managing the current user's DJ Profile.
// Auto-creates a DJ Demo profile on first load.
export default function useDjProfile() {
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getMyProfile', {});
      if (res.data?.profile) {
        setProfile(res.data.profile);
        setAccount(res.data.account);
      } else if (res.data?.error) {
        setError(res.data.error);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (updates) => {
    try {
      const res = await base44.functions.invoke('updateMyProfile', updates);
      if (res.data?.ok) {
        setProfile(res.data.profile);
        return { ok: true };
      }
      return { ok: false, error: res.data?.error || 'update_failed' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  return { profile, account, loading, error, refetch: fetchProfile, updateProfile };
}