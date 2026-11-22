import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { Store, X } from 'lucide-react';
import { useBodyLock } from '../../lib/useBodyLock';

export const spring = { type: 'spring', stiffness: 300, damping: 30 };
export const softSpring = { type: 'spring', stiffness: 240, damping: 26 };

export function CountUp({ value = 0, prefix = '', suffix = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', v => setDisplay(v));
    return () => { controls.stop(); unsubscribe(); };
  }, [value, count, rounded]);

  return <>{prefix}{display}{suffix}</>;
}

/* Fully-locked modal shell — portaled, centered, body scroll locked */

export function Modal({ open, onClose, children, maxWidth = 420 }) {
  useBodyLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(7,16,42,.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            overscrollBehavior: 'contain',
          }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={spring}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth,
              maxHeight: 'calc(100dvh - 40px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              background: '#0F1B3D',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 24,
              padding: 26,
              color: 'white',
              boxShadow: '0 30px 90px rgba(0,0,0,0.5)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function GlassCard({ children, style }) {
  return (
    <motion.div
      layout
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent, delay, prefix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      whileHover={{ y: -3 }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 20,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>{label}</span>
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: delay + 0.1 }}
          style={{
            width: 30, height: 30, borderRadius: 10,
            background: `${accent}22`,
            color: accent,
            display: 'grid', placeItems: 'center',
          }}
        >
          <Icon size={15} />
        </motion.div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 6 }}>
        <CountUp value={value} prefix={prefix} />
      </div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>{sub}</div>
    </motion.div>
  );
}

export function EmptyMini({ text }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', fontSize: 12, opacity: 0.5 }}>
      {text}
    </div>
  );
}

export function Row({ label, value, icon: Icon }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ opacity: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <Icon size={12} />} {label}
      </span>
      <span style={{ fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{value}</span>
    </div>
  );
}
