import { useEffect, useState } from 'react';

/* Owns its 1-second timer so the rest of the page doesn't re-render every tick. */
export default function DealCountdown({ endsAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  return [
    Math.floor(left / 3600000),
    Math.floor((left % 3600000) / 60000),
    Math.floor((left % 60000) / 1000),
  ].map(v => String(v).padStart(2, '0')).join(':');
}
