import React, { useEffect, useState } from 'react';
import { BellRing, LoaderCircle } from 'lucide-react';
import { pushState, enablePush } from '../lib/push';
import './whatsapp-prompt.css';

const KEY = 'campusflip_push_nudge_until';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function snoozed() {
  try { return Number(localStorage.getItem(KEY) || 0) > Date.now(); } catch { return false; }
}

// Asks once (then every two weeks at most) if the student wants phone alerts.
export default function PushNudge({ session, onToast }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    let alive = true;
    if (!userId || snoozed()) return undefined;
    pushState().then(state => { if (alive && state === 'off') setShow(true); });
    return () => { alive = false; };
  }, [userId]);

  if (!show) return null;

  function notNow() {
    try { localStorage.setItem(KEY, String(Date.now() + SNOOZE_MS)); } catch { /* ignore */ }
    setShow(false);
  }

  async function turnOn() {
    setBusy(true);
    try {
      await enablePush();
      setShow(false);
      onToast?.('Done! You will now get alerts on this phone.');
    } catch (err) {
      onToast?.(err.message, 'error');
      notNow();
    }
    setBusy(false);
  }

  return (
    <div className="cf-wa-prompt">
      <div className="cf-wa-prompt-head">
        <BellRing size={18} />
        <div>
          <strong>Get alerts on this phone</strong>
          <small>Know right away when a payment goes through or something you want gets posted.</small>
        </div>
      </div>
      <div className="cf-wa-prompt-row">
        <button type="button" onClick={turnOn} disabled={busy} style={{ flex: 1, padding: '10px 18px' }}>
          {busy ? <LoaderCircle size={15} className="cf-spin" /> : 'Turn on alerts'}
        </button>
        <button type="button" onClick={notNow} disabled={busy}
          style={{ background: 'transparent', color: 'var(--cf-body)', border: '1px solid var(--cf-line)', padding: '10px 14px' }}>
          Not now
        </button>
      </div>
    </div>
  );
}
