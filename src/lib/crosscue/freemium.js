// Freemium architecture helpers for CROSSCUE.
// Core mixing of local files, turntables, EQ, crossfader, and playlists is 100% FREE.
// Advanced features (Google Drive, recording, custom MIDI profiles) require Premium or 40-min Trial.

export const isTauriDesktop = () =>
  typeof window !== 'undefined' &&
  Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

export const PREMIUM_FEATURES = {
  drive: {
    id: 'drive',
    titleBg: 'Google Drive Cloud Музика',
    titleEn: 'Google Drive Cloud Tracks',
    descBg: 'Директен достъп, търсене и стрийминг на аудио файлове от личния ви Google Drive в двата виртуални грамофона.',
    descEn: 'Direct access, browsing, and streaming of audio files from your personal Google Drive into both virtual turntables.'
  },
  recording: {
    id: 'recording',
    titleBg: 'Студиен аудио запис (Audio Recording)',
    titleEn: 'Studio Mix Recording (Audio REC)',
    descBg: 'Запис на живо на вашите DJ сетове с висока резолюция (WAV), разделяне на песни и експорт за споделяне.',
    descEn: 'High-resolution live recording of your DJ sets (WAV), track splitting, and export for sharing.'
  },
  midi_manager: {
    id: 'midi_manager',
    titleBg: 'Разширен MIDI Мапинг & Профили',
    titleEn: 'Advanced MIDI Mapping & Profiles',
    descBg: 'Създаване, експортиране и запазване на персонализирани хардуерни контролер профили и импорт на Traktor TSI и Mixxx файлове.',
    descEn: 'Create, export, and save custom hardware controller mappings and import Traktor TSI & Mixxx files.'
  },
  general: {
    id: 'general',
    titleBg: 'CROSSCUE Premium функции',
    titleEn: 'CROSSCUE Premium Features',
    descBg: 'Пълен достъп до Google Drive облачни песни, студиен аудио запис на сетове и разширен MIDI мениджър.',
    descEn: 'Full access to Google Drive cloud tracks, studio mix recording, and advanced MIDI mapping profiles.'
  }
};

/**
 * Checks whether the current user has access to Premium features.
 * Desktop version: all features unlocked.
 * Web version: original trial/premium logic.
 */
export function hasPremiumAccess(permission) {
  // Desktop Tauri version — unlock everything
  if (isTauriDesktop()) {
    return true;
  }

  // Web fallback (original logic)
  if (!permission) return false;

  // Paid entitlements
  if (permission.entitlementType === 'premium' || permission.entitlementType === 'weekend') {
    return true;
  }

  // Active trial with remaining playback/enforcement time
  if (permission.entitlementType === 'trial') {
    if (permission.trialExpired) return false;
    if (typeof permission.remainingSeconds === 'number' && permission.remainingSeconds <= 0) {
      return false;
    }
    return true;
  }

  return false;
}