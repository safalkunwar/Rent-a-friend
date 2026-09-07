import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

/** Monitor first. Console enforcement is deliberately NOT controlled by client code. */
export function initializeWebAppCheck(app: FirebaseApp) {
  const key = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!key || !import.meta.env.PROD || !['hamrosathi.vercel.app'].includes(window.location.hostname)) return;
  try {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(key), isTokenAutoRefreshEnabled: true });
  } catch { console.warn('[SATHI] App Check initialization failed; enforcement must remain off until verified.'); }
}
