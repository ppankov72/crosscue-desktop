import { useState, useEffect } from 'react';
import { detectDeviceProfile } from '@/lib/crosscue/deviceDetection';

export default function useDeviceProfile() {
  const [profile, setProfile] = useState(() => detectDeviceProfile());

  useEffect(() => {
    let rafId = null;
    const updateProfile = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setProfile(prev => {
          const next = detectDeviceProfile();
          if (
            prev.os === next.os &&
            prev.deviceType === next.deviceType &&
            prev.browser === next.browser &&
            prev.isTouch === next.isTouch &&
            prev.orientation === next.orientation &&
            prev.layoutMode === next.layoutMode &&
            Math.abs(prev.viewport.width - next.viewport.width) < 4 &&
            Math.abs(prev.viewport.height - next.viewport.height) < 4
          ) {
            return prev;
          }
          return next;
        });
      });
    };

    window.addEventListener('resize', updateProfile, { passive: true });
    window.addEventListener('orientationchange', updateProfile, { passive: true });
    window.visualViewport?.addEventListener('resize', updateProfile, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateProfile);
      window.removeEventListener('orientationchange', updateProfile);
      window.visualViewport?.removeEventListener('resize', updateProfile);
    };
  }, []);

  return profile;
}