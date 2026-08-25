import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Wifi, WifiOff, Share, PlusSquare, Sparkles } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  // Connectivity states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // 1. Check if application is running standalone
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. Listen for standard PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show banner if not already installed/standalone and not dismissed
      if (!isStandaloneMode && !localStorage.getItem('sathi-pwa-dismissed')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Handle successful installation
    const handleAppInstalled = () => {
      console.log('SATHI PWA was installed successfully!');
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem('sathi-pwa-dismissed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. iOS fallback prompt (if in Safari browser, not standalone, and not dismissed)
    if (isIOSDevice && !isStandaloneMode && !localStorage.getItem('sathi-pwa-dismissed')) {
      // Show iOS banner after a small delay to not obstruct initial load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Monitor network connection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowConnectionBanner(true);
        // Automatically hide the "Online" success banner after 4 seconds
        const timer = setTimeout(() => {
          setShowConnectionBanner(false);
          setWasOffline(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowConnectionBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Open iOS instructions modal
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;
    
    // Show standard install prompt
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('sathi-pwa-dismissed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('sathi-pwa-dismissed', 'true');
    setShowBanner(false);
  };

  return (
    <>
      {/* Network Connectivity Toast Notification */}
      <AnimatePresence>
        {showConnectionBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ zIndex: 9999 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96"
          >
            {isOnline ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 shadow-xl rounded-2xl p-4 text-emerald-800">
                <div className="p-2 bg-emerald-500 rounded-xl text-text-primary">
                  <Wifi className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h5 className="font-extrabold text-sm leading-tight text-emerald-950">Connection Restored</h5>
                  <p className="text-xs text-emerald-750">Back online. Re-syncing SATHI local cache.</p>
                </div>
                <button 
                  onClick={() => setShowConnectionBanner(false)}
                  className="text-emerald-400 hover:text-emerald-600 transition-colors p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 shadow-xl rounded-2xl p-4 text-amber-800">
                <div className="p-2 bg-amber-500 rounded-xl text-text-primary animate-pulse">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h5 className="font-extrabold text-sm leading-tight text-amber-950">You are Offline</h5>
                  <p className="text-xs text-amber-750">Running SATHI in offline mode with cached experiences.</p>
                </div>
                <button 
                  onClick={() => setShowConnectionBanner(false)}
                  className="text-amber-400 hover:text-amber-600 transition-colors p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent PWA Install Top/Bottom Bar */}
      <AnimatePresence>
        {showBanner && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            style={{ zIndex: 999 }}
            className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] bg-background/95 backdrop-blur-lg border border-primary-action/20 shadow-2xl rounded-3xl p-4"
          >
            <div className="flex items-start gap-4 text-left">
              {/* SATHI Icon inside banner */}
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-surface-elevated to-background border border-primary-action/30 flex-shrink-0 flex items-center justify-center shadow-inner">
                <img
                  src="/sathi-logo.jpeg"
                  alt="SATHI PWA"
                  className="h-10 w-auto max-w-[64px] object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback if icon hasn't finished compiling in static route
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute -top-1 -right-1 p-0.5 bg-primary-action rounded-full">
                  <Sparkles className="w-2.5 h-2.5 text-background fill-current" />
                </div>
              </div>

              {/* Install pitch */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-extrabold text-text-primary">SATHI for mobile</h4>
                  <span className="text-[9px] bg-primary-action/10 text-primary-action font-black px-1.5 py-0.5 rounded-md border border-primary-action/20 uppercase tracking-wider">PWA</span>
                </div>
                <p className="text-xs text-text-secondary leading-tight">
                  {isIOS 
                    ? "Install SATHI directly on your iPhone for native fullscreen mode & fast offline access." 
                    : "Install SATHI on your device for smooth animations, offline search, and a standalone app feel."}
                </p>
                
                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary-action hover:bg-primary-action-hover active:scale-98 text-background text-xs font-extrabold py-2 px-3 rounded-xl transition-all shadow-md shadow-primary-action/10"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    Install App
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="bg-white/5 hover:bg-white/10 text-text-primary hover:text-text-primary text-xs font-bold py-2 px-3 rounded-xl transition-all"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>

              {/* Close icon */}
              <button 
                onClick={handleDismiss}
                className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari 'Add to Home Screen' Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSInstructions(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="relative w-full max-w-sm bg-surface border border-primary-action/30 rounded-[32px] overflow-hidden shadow-2xl p-6 text-center text-text-primary space-y-5"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="mx-auto w-16 h-16 rounded-[22px] overflow-hidden bg-gradient-to-br from-surface-elevated to-background border border-primary-action/40 flex items-center justify-center shadow-lg shadow-primary-action/5">
                  <img src="/sathi-logo.jpeg" alt="SATHI" className="h-14 w-auto max-w-[84px] object-contain rounded-xl bg-surface-elevated/60 px-1" />
                </div>
                <h3 className="text-xl font-extrabold text-primary-action">Install SATHI on iOS</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Safari on iPhone doesn't support automatic PWA triggers. Follow these 3 quick steps to add SATHI to your home screen:
                </p>
              </div>

              {/* Steps list */}
              <div className="bg-surface-elevated/60 rounded-2xl p-4 text-left space-y-4 text-xs text-text-primary border border-border-token-light">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-action/20 text-primary-action font-black flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                  <div className="space-y-1">
                    <p className="font-bold">Tap the Share Button</p>
                    <p className="text-text-secondary flex items-center gap-1">
                      Look for the standard Share icon <Share className="w-3.5 h-3.5 text-primary-action" /> in the Safari toolbar (usually at the bottom of your screen).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-border-token-light pt-3">
                  <span className="w-5 h-5 rounded-full bg-primary-action/20 text-primary-action font-black flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                  <div className="space-y-1">
                    <p className="font-bold">Scroll down & Tap 'Add to Home Screen'</p>
                    <p className="text-text-secondary flex items-center gap-1">
                      Scroll past options like Copy or Print to find <PlusSquare className="w-3.5 h-3.5 text-primary-action" /> <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-border-token-light pt-3">
                  <span className="w-5 h-5 rounded-full bg-primary-action/20 text-primary-action font-black flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                  <div className="space-y-1">
                    <p className="font-bold">Confirm Name & Install</p>
                    <p className="text-text-secondary">
                      Tap <strong>Add</strong> in the top right corner. SATHI will instantly appear on your iOS homescreen like a native app!
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  setShowIOSInstructions(false);
                  setShowBanner(false);
                  localStorage.setItem('sathi-pwa-dismissed', 'true');
                }}
                className="w-full bg-primary-action hover:bg-primary-action-hover text-background font-extrabold py-3.5 rounded-xl transition-all active:scale-98 shadow-lg shadow-primary-action/10"
              >
                Got It, Thanks!
              </button>

              {/* Close Button */}
              <button 
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
