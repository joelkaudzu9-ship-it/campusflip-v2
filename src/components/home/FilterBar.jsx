import { motion } from 'framer-motion';
import {
  BookOpen, Clock3, Laptop, MoreHorizontal, ShieldCheck, ShoppingBasket, Shirt, Utensils,
} from 'lucide-react';
import { SORT_LABELS, SORT_ORDER } from '../../lib/listings';

const cats = [
  ['All', ShoppingBasket],
  ['Books', BookOpen],
  ['Electronics', Laptop],
  ['Clothes', Shirt],
  ['Food', Utensils],
  ['More', MoreHorizontal],
];

const chipStyle = (active) => ({
  border: '1px solid',
  borderColor: active ? '#2563EB' : '#E5EAF2',
  background: active ? '#2563EB' : '#fff',
  color: active ? '#fff' : '#4B5563',
  borderRadius: 20,
  padding: '10px 14px',
  minHeight: 40,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  flexShrink: 0,
  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
});

export default function FilterBar({ cat, onCat, verifiedOnly, onVerified, sort, onSort }) {
  return (
    <>
        <nav className="cats cf-categories" aria-label="Categories">
          {cats.map(([name, Icon]) => {
            const active = cat === name;
            return (
              <motion.button
                whileTap={{ scale: 0.94 }}
                className={`cf-category${active ? ' active' : ''}`}
                onClick={() => onCat(name)}
                key={name}
                type="button"
                aria-pressed={active}
              >
                <Icon />
                <span>{name}</span>
              </motion.button>
            );
          })}
        </nav>
  
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '10px 20px 0',
            alignItems: 'center',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onVerified(false)}
            style={chipStyle(!verifiedOnly)}
          >
            All sellers
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onVerified(true)}
            style={chipStyle(verifiedOnly)}
          >
            <ShieldCheck size={13} />
            Verified
          </motion.button>
  
          <div style={{ width: 1, height: 20, background: '#E5EAF2', margin: '0 4px', flexShrink: 0 }} />
  
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const next = SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length];
              onSort(next);
            }}
            style={chipStyle(sort !== 'recent')}
            aria-label={`Sort: ${SORT_LABELS[sort]}. Tap to change.`}
          >
            <Clock3 size={13} />
            {SORT_LABELS[sort]}
          </motion.button>
        </div>
    </>
  );
}
