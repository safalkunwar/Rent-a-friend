import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateBanner({ onUpdate, onLater }: { onUpdate: () => void; onLater: () => void }) {
  return (
    <section
      aria-label="SATHI update available"
      className="fixed top-20 left-4 right-4 z-[1000] mx-auto max-w-md rounded-2xl border border-primary-action/25 bg-surface/95 p-3 shadow-2xl backdrop-blur-lg md:top-6"
      role="status"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-action/15 text-primary-action">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-text-primary">A SATHI update is ready</p>
          <p className="text-xs leading-snug text-text-secondary">Refresh when you are ready to use the latest version.</p>
        </div>
        <button aria-label="Dismiss update for now" className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary" onClick={onLater}>
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-action px-3 py-2 text-xs font-extrabold text-background transition-colors hover:bg-primary-action-hover" onClick={onUpdate}>
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        Refresh SATHI
      </button>
    </section>
  );
}

/**
 * Keeps the current service worker in control until the user accepts a ready
 * replacement. That avoids an automatic reload while a user is completing a
 * form and gives an installed PWA a visible recovery path from stale assets.
 */
export function PWAUpdatePrompt() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    const exposeWhenWaiting = (candidate: ServiceWorkerRegistration) => {
      if (!cancelled && candidate.waiting && navigator.serviceWorker.controller) setRegistration(candidate);
    };
    const register = async () => {
      try {
        const candidate = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;
        exposeWhenWaiting(candidate);
        candidate.addEventListener('updatefound', () => {
          const worker = candidate.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') exposeWhenWaiting(candidate);
          });
        });
        await candidate.update();
        exposeWhenWaiting(candidate);
      } catch {
        // A missing/blocked service worker must not prevent the web app from loading.
      }
    };
    void register();
    return () => { cancelled = true; };
  }, []);

  if (!registration || dismissed) return null;

  return <PWAUpdateBanner
    onLater={() => setDismissed(true)}
    onUpdate={() => {
      const waiting = registration.waiting;
      if (!waiting) return;
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }}
  />;
}
