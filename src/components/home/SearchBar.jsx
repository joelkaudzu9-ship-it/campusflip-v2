import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function SearchBar({ onOpen, onFilters, filtersActive }) {
  return (
    <div className="cf-search-area">
      <div className="cf-search">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onOpen}
          className="cf-search-open"
          aria-label="Open search"
        >
          <Search size={18} color="#94A3B8" />
          <span>Search items on campus...</span>
        </motion.button>
        <button
          type="button"
          className={`cf-search-filter${filtersActive ? ' active' : ''}`}
          onClick={onFilters}
          aria-label="Filters"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
