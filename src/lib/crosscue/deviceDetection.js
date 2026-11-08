// Centralized device, OS, browser, touch, and viewport detection for CROSSCUE.
// Combines User-Agent / Client Hints, touch capabilities, and real viewport dimensions
// with a safe responsive fallback when any browser API is unavailable.

export function detectDeviceProfile() {
  if (typeof window === 'undefined') {
    return {
      os: 'Unknown',
      deviceType: 'desktop',
      browser: 'other',
      isInAppBrowser: false,
      isTouch: false,
      orientation: 'landscape',
      viewport: { width: 1280, height: 800 },
      layoutMode: 'desktop',
      isMobileUI: false,
      isCompactPortrait: false
    };
  }

  const width = Math.max(1, window.innerWidth || document.documentElement?.clientWidth || 1024);
  const height = Math.max(1, window.innerHeight || document.documentElement?.clientHeight || 768);
  const orientation = width > height ? 'landscape' : 'portrait';

  let ua = '';
  let platform = '';
  let maxTouchPoints = 0;
  let uaDataMobile = null;
  let uaDataPlatform = '';

  try {
    ua = navigator.userAgent || '';
    platform = navigator.platform || '';
    maxTouchPoints = Number(navigator.maxTouchPoints) || 0;
    if (navigator.userAgentData) {
      uaDataMobile = Boolean(navigator.userAgentData.mobile);
      uaDataPlatform = navigator.userAgentData.platform || '';
    }
  } catch {
    // Safe fallback if navigator properties are restricted
  }

  let coarsePointer = false;
  try {
    coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches || false;
  } catch {}

  const isTouch = maxTouchPoints > 0 || coarsePointer || 'ontouchstart' in window;

  // 1. OS Detection (Windows, macOS, Linux, Android, iOS, iPadOS)
  let os = 'Unknown';
  const isIPadOS =
    /iPad/i.test(ua) ||
    (/Macintosh|MacIntel/i.test(platform || uaDataPlatform || ua) && maxTouchPoints > 1);

  if (isIPadOS) {
    os = 'iPadOS';
  } else if (/iPhone|iPod/i.test(ua)) {
    os = 'iOS';
  } else if (/Android/i.test(ua) || /Android/i.test(uaDataPlatform)) {
    os = 'Android';
  } else if (/Win/i.test(platform) || /Windows/i.test(ua) || /Windows/i.test(uaDataPlatform)) {
    os = 'Windows';
  } else if (/Mac/i.test(platform) || /Mac OS X|Macintosh/i.test(ua) || /macOS/i.test(uaDataPlatform)) {
    os = 'macOS';
  } else if (/Linux/i.test(platform) || /Linux/i.test(ua) || /Linux/i.test(uaDataPlatform)) {
    os = 'Linux';
  }

  // 2. Browser & In-App WebView Detection (Facebook, Instagram, iOS Safari, Android Chrome)
  const isFacebook = /FBAN|FBAV|FB_IAB/i.test(ua);
  const isInstagram = /Instagram/i.test(ua);
  const isInAppBrowser = isFacebook || isInstagram || /BytedanceWebview|Musical_ly|Line\//i.test(ua);

  let browser = 'other';
  if (isFacebook) {
    browser = 'facebook';
  } else if (isInstagram) {
    browser = 'instagram';
  } else if ((os === 'iOS' || os === 'iPadOS') && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) {
    browser = 'ios_safari';
  } else if (os === 'Android' && /Chrome/i.test(ua) && !/EdgA|OPR/i.test(ua)) {
    browser = 'android_chrome';
  } else if (/Edg/i.test(ua)) {
    browser = 'edge';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'chrome';
  } else if (/Safari/i.test(ua)) {
    browser = 'safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'firefox';
  }

  // 3. Device Category (desktop | tablet | mobile) combining UA, touch, and screen geometry
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);

  let deviceType = 'desktop';
  if (os === 'iPadOS') {
    deviceType = 'tablet';
  } else if (os === 'iOS') {
    deviceType = 'mobile';
  } else if (os === 'Android') {
    if (uaDataMobile === false || (!/Mobile/i.test(ua) && shortestSide >= 600)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'mobile';
    }
  } else if (isTouch && longestSide <= 1366 && shortestSide <= 900) {
    deviceType = shortestSide < 540 ? 'mobile' : 'tablet';
  } else if (width < 640) {
    // Responsive fallback when desktop browser is resized to phone width
    deviceType = 'mobile';
  } else if (width < 1024 && isTouch) {
    deviceType = 'tablet';
  }

  // 4. Adaptive UI Layout Mode based on both device capabilities and real available space
  let layoutMode = 'desktop';
  if (width < 640) {
    layoutMode = 'mobile-portrait';
  } else if (deviceType === 'mobile' && orientation === 'landscape') {
    layoutMode = 'mobile-landscape';
  } else if (deviceType === 'tablet' || (width >= 640 && width < 1024 && isTouch)) {
    layoutMode = orientation === 'portrait' && width < 900 ? 'tablet-portrait' : 'tablet-landscape';
  } else if (width < 768 && orientation === 'portrait') {
    layoutMode = 'tablet-portrait';
  } else {
    layoutMode = 'desktop';
  }

  const isMobileUI = layoutMode === 'mobile-portrait' || layoutMode === 'mobile-landscape';
  const isCompactPortrait = layoutMode === 'mobile-portrait' || layoutMode === 'tablet-portrait';

  return {
    os,
    deviceType,
    browser,
    isInAppBrowser,
    isTouch,
    orientation,
    viewport: { width, height },
    layoutMode,
    isMobileUI,
    isCompactPortrait
  };
}