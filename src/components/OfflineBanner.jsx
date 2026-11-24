import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import './offline.css';

/** A slim bar at the top: "offline" while there is no connection, then "back online" for a moment. */
export default function OfflineBanner({ online }) {
  const [showBack, setShowBack] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) { wasOffline.current = true; setShowBack(false); return undefined; }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    setShowBack(true);
    const timer = setTimeout(() => setShowBack(false), 2600);
    return () => clearTimeout(timer);
  }, [online]);

  const visible = !online || showBack;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={online ? 'back' : 'off'}
          className={`cf-offline ${online ? 'is-back' : ''}`}
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {online ? <Wifi size={15} /> : <WifiOff size={15} />}
          <span>{online ? 'Back online' : "You're offline. Posting and messaging need data."}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
