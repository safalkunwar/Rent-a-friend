import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';
import configuration from './appCheckConfig.json';

/** Monitor first. Console enforcement is deliberately NOT controlled by client code. */
export function initializeWebAppCheck(app: FirebaseApp) {
  // Public attestation site key, not a server secret. An environment override is optional.
  const key = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || configuration.siteKey;
  if (!key || !import.meta.env.PROD || !configuration.productionDomains.includes(window.location.hostname)) return;
  try {
    const check = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(key), isTokenAutoRefreshEnabled: true });
    document.documentElement.dataset.sathiAppCheck = 'pending';
    void getToken(check).then(() => { document.documentElement.dataset.sathiAppCheck = 'verified'; })
      .catch(() => { document.documentElement.dataset.sathiAppCheck = 'unverified'; });
  } catch { console.warn('[SATHI] App Check initialization failed; enforcement must remain off until verified.'); }
}
