import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isTauriDesktop } from '@/lib/crosscue/freemium';

export default function useSessionLogger(page) {
  useEffect(() => {
    if (isTauriDesktop()) return;

    const key = 'crosscue-session-logged';
    if (sessionStorage.getItem(key)) return;

    const screenResolution = `${window.screen.width}x${window.screen.height}`;

    base44.functions.invoke('logSession', { screenResolution, page })
      .then(() => sessionStorage.setItem(key, '1'))
      .catch(() => {});
  }, [page]);
}