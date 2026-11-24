import { safeStorage } from '../lib/safeStorage';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt({ onOpenDownload }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return;
    // Opened from the Android app itself (a Trusted Web Activity reports this referrer).
    if (document.referrer.startsWith('android-app://')) return;

    // Don't show if dismissed recently
    const dismissed = safeStorage.get('cf_install_dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 30 * 24 * 60 * 60 * 1000) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Android: offer the real app (APK) from our download page, not the browser install.
    if (/Android/i.test(navigator.userAgent)) {
      setIsAndroid(true);
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // iOS: show instruction banner after a short delay
    if (ios) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Desktop Chrome: capture the browser install event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setShowPrompt(false);
    safeStorage.set('cf_install_dismissed', String(Date.now()));
  }

  function openDownload() {
    dismiss();
    onOpenDownload?.();
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  }

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 20,
          left: 16,
          right: 16,
          maxWidth: 400,
          margin: '0 auto',
          zIndex: 9000,
          background: 'var(--cf-navy)',
          color: 'white',
          borderRadius: 20,
          padding: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,.4)',
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(255,255,255,.1)', border: 0,
            borderRadius: 8, width: 28, height: 28,
            color: 'white', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--cf-blue)', display: 'grid', placeItems: 'center',
            fontSize: 18, fontWeight: 900,
          }}>
            CF
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{isAndroid ? 'Get the CampusFlip app' : 'Install CampusFlip'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
              {isAndroid ? 'Full screen, with alerts for new messages' : 'Faster access, works offline'}
            </div>
          </div>
        </div>

        {isIOS ? (
          <div style={{
            fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.8)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Share size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Tap the Share button in Safari, then choose <b>"Add to Home Screen"</b>.
            </span>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={isAndroid ? openDownload : handleInstall}
            style={{
              width: '100%', padding: 13, border: 0, borderRadius: 12,
              background: 'var(--cf-blue)', color: 'white',
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Download size={16} /> {isAndroid ? 'Get the app' : 'Install App'}
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}