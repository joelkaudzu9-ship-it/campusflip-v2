import { motion } from 'framer-motion';
import { Bookmark, Home, Store, UserRound } from 'lucide-react';

export const NAV_ITEMS = [['Home', Home], ['Saved', Bookmark], ['My Shop', Store], ['Profile', UserRound]];

export default function BottomNav({ current, onSelect }) {
  return (
    <nav className="bottom cf-bottom-nav" aria-label="Main">
      {NAV_ITEMS.map(([name, Icon]) => (
        <motion.button
          whileTap={{ scale: 0.9 }}
          key={name}
          type="button"
          className={current === name ? 'current' : ''}
          aria-current={current === name ? 'page' : undefined}
          onClick={() => onSelect(name)}
        >
          <Icon /><span>{name}</span>
        </motion.button>
      ))}
    </nav>
  );
}
