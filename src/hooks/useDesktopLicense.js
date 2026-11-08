import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useDesktopLicense() {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const status = await invoke('get_license_status');
      setLicense(status);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const activate = async (key) => {
    try {
      const ok = await invoke('activate_license', { key });
      if (ok) await refresh();
      return ok;
    } catch (e) {
      setError(String(e));
      return false;
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const isTrialValid = license && !license.is_activated
    ? (new Date(license.first_run).getTime() + 3 * 24 * 60 * 60 * 1000) > Date.now()
    : false;

  return {
    license,
    loading,
    error,
    isActivated: license?.is_activated ?? false,
    isTrialValid,
    refresh,
    activate,
  };
}