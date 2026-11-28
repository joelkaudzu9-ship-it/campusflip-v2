import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShieldCheck, X } from 'lucide-react';
import { SORT_LABELS, SORT_ORDER } from '../../lib/listings';

const SORT_NAMES = { recent: 'Newest first', price_asc: 'Price: low to high', price_desc: 'Price: high to low' };

/** Bottom sheet holding the seller and sort filters that used to sit on the Home screen. */
export default function FilterSheet({ open, onClose, verifiedOnly, onVerified, sort, onSort }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cf-sheet-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="cf-sheet" role="dialog" aria-modal="true" aria-label="Filters"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="cf-sheet-head">
              <h3>Filters</h3>
              <button type="button" onClick={onClose} aria-label="Close filters"><X size={18} /></button>
            </div>

            <h4>Sellers</h4>
            <div className="cf-sheet-options">
              <button type="button" className={!verifiedOnly ? 'on' : ''} onClick={() => onVerified(false)}>
                All sellers {!verifiedOnly && <Check size={15} />}
              </button>
              <button type="button" className={verifiedOnly ? 'on' : ''} onClick={() => onVerified(true)}>
                <ShieldCheck size={15} /> Verified only {verifiedOnly && <Check size={15} />}
              </button>
            </div>

            <h4>Sort by</h4>
            <div className="cf-sheet-options">
              {SORT_ORDER.map(key => (
                <button type="button" key={key} className={sort === key ? 'on' : ''} onClick={() => onSort(key)} aria-label={SORT_LABELS[key]}>
                  {SORT_NAMES[key]} {sort === key && <Check size={15} />}
                </button>
              ))}
            </div>

            <button type="button" className="cf-sheet-done" onClick={onClose}>Show results</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
