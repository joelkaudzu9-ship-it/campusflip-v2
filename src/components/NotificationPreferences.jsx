import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, Target, CreditCard, Clock, MessageCircle,
  Sparkles, Volume2, Vibrate, LoaderCircle, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { pushState, enablePush, disablePush } from '../lib/push';

const spring = { type: 'spring', stiffness: 300, damping: 28 };

const PREFERENCES = [
  {
    key: 'wanted_matches',
    icon: Target,
    title: 'Wanted board matches',
    description: 'Get notified when someone posts an item that matches your Wanted ad.',
    accent: 'var(--cf-amber)',
  },
  {
    key: 'payment_updates',
    icon: CreditCard,
    title: 'Payment updates',
    description: 'Confirmations, failures, and reminders about payments for listings and boosts.',
    accent: 'var(--cf-success-bright)',
  },
  {
    key: 'listing_expiry',
    icon: Clock,
    title: 'Listing expiry reminders',
    description: 'Know a day before your listing expires so you can renew it.',
    accent: 'var(--cf-blue)',
  },
  {
    key: 'chat_messages',
    icon: MessageCircle,
    title: 'New messages',
    description: 'Get notified when a buyer messages you about one of your listings.',
    accent: 'var(--cf-sky)',
  },
  {
    key: 'marketing',
    icon: Sparkles,
    title: 'Product updates & tips',
    description: 'Occasional news about new CampusFlip features and selling tips.',
    accent: '#A855F7',
  },
];

const FEEDBACK = [
  {
    key: 'sound_enabled',
    icon: Volume2,
    title: 'Sound',
    description: 'Play a chime when a new notification arrives.',
  },
  {
    key: 'haptic_enabled',
    icon: Vibrate,
    title: 'Haptic vibration',
    description: 'Buzz the phone on new notifications (mobile only).',
  },
];

export default function NotificationPreferences({ session, onBack, onToast }) {
  const [push, setPush] = useState('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => { pushState().then(setPush); }, []);

  async function togglePush() {
    setPushBusy(true);
    setPushError('');
    try {
      if (push === 'on') await disablePush(); else await enablePush();
    } catch (err) {
      setPushError(err.message);
    }
    setPush(await pushState());
    setPushBusy(false);
  }
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!session?.user?.id) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error('Prefs load failed:', error.message);
        onToast?.('Could not load your preferences.', 'error');
      } else if (!data) {
        const { data: created } = await supabase
          .from('notification_preferences')
          .insert({ user_id: session.user.id })
          .select()
          .single();
        setPrefs(created);
      } else {
        setPrefs(data);
      }
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [session?.user?.id, onToast]);

  async function toggle(key) {
    if (!prefs || saving === key) return;
    const next = !prefs[key];

    setSaving(key);
    setPrefs({ ...prefs, [key]: next });

    const { error } = await supabase
      .from('notification_preferences')
      .update({ [key]: next, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Toggle failed:', error.message);
      setPrefs({ ...prefs, [key]: !next });
      onToast?.('Could not save preference.', 'error');
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 20,
        }}
      >
        <span className="cf-block-loader" />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          transition={{ delay: 0.3 }}
          style={{ color: 'var(--cf-subtle)', fontSize: 13, fontWeight: 600 }}
        >
          Loading preferences…
        </motion.span>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      style={{
        minHeight: '100vh',
        padding: 'calc(24px + env(safe-area-inset-top)) 16px 120px',
        maxWidth: 600,
        margin: '0 auto',
        color: 'var(--cf-navy)',
      }}
    >
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 'calc(env(safe-area-inset-top) + 8px)',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '-8px -8px 24px',
          padding: '10px 8px',
          borderRadius: 16,
          background: 'rgba(245,248,255,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 38, height: 38,
            border: '1px solid var(--cf-line)', borderRadius: 12,
            background: 'white', color: 'var(--cf-navy)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={19} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="#2563EB" /> Notifications
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--cf-subtle)' }}>
            Choose what you want to hear about
          </p>
        </div>
      </div>

      {push !== 'unsupported' && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--cf-line)', overflow: 'hidden', marginBottom: 20 }}>
          <PrefRow
            pref={{
              key: 'push',
              icon: Bell,
              title: 'Push notifications on this phone',
              description: push === 'denied'
                ? 'Blocked in your browser settings. Allow notifications for CampusFlip, then come back.'
                : 'Get alerts even when CampusFlip is closed.',
            }}
            value={push === 'on'}
            saving={pushBusy}
            onToggle={push === 'denied' ? () => {} : togglePush}
            isLast
          />
          {pushError && <p role="alert" style={{ margin: 0, padding: '0 16px 14px', fontSize: 12, color: 'var(--cf-danger)' }}>{pushError}</p>}
        </div>
      )}

      {/* Content prefs */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid var(--cf-line)',
          boxShadow: '0 6px 20px rgba(16,28,58,.04)',
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {PREFERENCES.map((pref, i) => (
          <PrefRow
            key={pref.key}
            pref={pref}
            value={prefs?.[pref.key]}
            saving={saving === pref.key}
            onToggle={() => toggle(pref.key)}
            isLast={i === PREFERENCES.length - 1}
          />
        ))}
      </motion.div>

      {/* Feedback prefs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        style={{
          padding: '14px 16px 8px',
          marginBottom: 8,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1,
          color: 'var(--cf-subtle)',
          textTransform: 'uppercase',
        }}
      >
        Sound & feedback
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } } }}
        style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid var(--cf-line)',
          boxShadow: '0 6px 20px rgba(16,28,58,.04)',
          overflow: 'hidden',
        }}
      >
        {FEEDBACK.map((pref, i) => (
          <PrefRow
            key={pref.key}
            pref={pref}
            value={prefs?.[pref.key]}
            saving={saving === pref.key}
            onToggle={() => toggle(pref.key)}
            isLast={i === FEEDBACK.length - 1}
          />
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          margin: '24px 8px 0',
          fontSize: 12,
          color: 'var(--cf-subtle)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        You can turn off sound and vibration and still get the notification bell.
        Preferences apply immediately across all devices.
      </motion.p>
    </motion.main>
  );
}

function PrefRow({ pref, value, saving, onToggle, isLast }) {
  const Icon = pref.icon;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0, transition: spring },
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px',
        borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
      }}
    >
      <div style={{
        width: 40, height: 40, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        borderRadius: 12,
        background: `${pref.accent || 'var(--cf-blue)'}15`,
        color: pref.accent || 'var(--cf-blue)',
      }}>
        <Icon size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cf-navy)' }}>
          {pref.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--cf-subtle)', marginTop: 2, lineHeight: 1.5 }}>
          {pref.description}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={onToggle}
        disabled={saving}
        style={{
          flexShrink: 0,
          width: 44,
          height: 26,
          padding: 3,
          border: 0,
          borderRadius: 13,
          background: value ? 'var(--cf-blue)' : 'var(--cf-line)',
          cursor: saving ? 'wait' : 'pointer',
          position: 'relative',
          transition: 'background 0.25s ease',
        }}
      >
        <motion.div
          animate={{ x: value ? 18 : 0 }}
          transition={spring}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(16,28,58,.2)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <AnimatePresence>
            {saving && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                style={{ position: 'absolute' }}
              >
                <LoaderCircle size={10} color={value ? '#2563EB' : '#94A3B8'} className="cf-spin" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>
    </motion.div>
  );
}