import type { FirebaseApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

export interface AdminAppCheckConfig {
  isProduction: boolean;
  hostname: string;
  siteKey: string;
  allowedHosts: string;
}

/** Exact-host allowlist; missing configuration keeps App Check inactive. */
export function isAdminAppCheckConfigured(config: AdminAppCheckConfig): boolean {
  if (!config.isProduction || !config.siteKey.trim()) return false;
  const hostname = config.hostname.trim().toLowerCase();
  if (!hostname) return false;
  const allowedHosts = config.allowedHosts
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return allowedHosts.includes(hostname);
}

/** Token monitoring only. Enforcement is controlled in Firebase, never by this client. */
export function initializeAdminAppCheck(app: FirebaseApp): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const config = {
    isProduction: import.meta.env.PROD,
    hostname: window.location.hostname,
    siteKey: import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '',
    allowedHosts: import.meta.env.VITE_APP_CHECK_ALLOWED_HOSTS || '',
  };
  if (!isAdminAppCheckConfigured(config)) return;

  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(config.siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    document.documentElement.dataset.sathiAppCheck = 'pending';
    void getToken(appCheck)
      .then(() => { document.documentElement.dataset.sathiAppCheck = 'verified'; })
      .catch(() => { document.documentElement.dataset.sathiAppCheck = 'unverified'; });
  } catch {
    document.documentElement.dataset.sathiAppCheck = 'unverified';
    console.warn('[SATHI Admin] App Check initialization failed; enforcement must remain off until verified.');
  }
}
