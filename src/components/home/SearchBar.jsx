import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function SearchBar({ onOpen }) {
  return (
      <div className="cf-search-area">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onOpen}
          className="cf-search"
          style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
          aria-label="Open search"
        >
          <Search size={18} color="#94A3B8" />
          <span style={{ flex: 1, color: 'var(--cf-subtle)', fontSize: 14 }}>
            Search items on campus...
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 10,
              background: 'rgba(37,99,235,.07)',
              color: 'var(--cf-blue)',
            }}
          >
            <SlidersHorizontal size={16} />
          </div>
        </motion.button>
      </div>
  );
}
