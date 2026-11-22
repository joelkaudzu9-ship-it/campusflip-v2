import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LoaderCircle, Search, Store, Users, X } from 'lucide-react';
import { AnimatedTabs } from '../MotionUI';
import EmptyState from '../EmptyState';
import ProductCard from './ProductCard';

export default function Feed({
  tab, onTab, items: shown, loading, error, hasMore, loadingMore, pendingUpdates,
  flashDeals, saved, onSave, onOpen, onLoadMore, onRefresh, onClearFilters,
}) {
  return (
    <>
      <AnimatedTabs
          className="tabs cf-market-tabs cf-motion-tabs"
          value={tab}
          onChange={onTab}
          tabs={[
            { label: <><Store size={17} /> Marketplace</>, value: 'Marketplace' },
            { label: <><Users size={17} /> Wanted &amp; Free</>, value: 'Wanted & Free' }
          ]}
        />
  
        {pendingUpdates > 0 && !loading && (
          <button
            type="button"
            className="cf-new-activity"
            onClick={() => { onRefresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            <LoaderCircle size={14} aria-hidden="true" /> New listings available · Tap to refresh
          </button>
        )}
  
        <div className="subhead">
          <h2>{tab === 'Marketplace' ? 'Discover on campus' : 'Wanted & Free'}</h2>
          <span>{loading ? 'Searching...' : `${shown.length}${hasMore ? '+' : ''} items`}</span>
        </div>
  
        {error && (
          <div className="empty">
            <X />
            <b>Couldn't load listings</b>
            <span>{error}</span>
            <button onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
  
        <AnimatePresence mode="wait">
          <motion.div
            key={`grid-${tab}`}
            className="grid cf-listings-grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1] }}
          >
            {loading ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300,
                  gap: 16,
                }}
              >
                <span className="cf-block-loader" />
                <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                  Finding listings...
                </span>
              </div>
            ) : (
              shown.map((item, i) => {
                const activeFlash = flashDeals.find(fd => fd.id === item.id);
                const shouldStagger = i < 12;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={shouldStagger ? { opacity: 0, y: 16 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      shouldStagger
                        ? { type: 'spring', stiffness: 320, damping: 30, delay: i * 0.04 }
                        : { duration: 0.2 }
                    }
                  >
                    <ProductCard
                      item={item}
                      isSaved={saved.includes(item.id)}
                      onSave={() => onSave(item.id)}
                      onOpen={() => onOpen(item)}
                      flashDeal={activeFlash}
                    />
                  </motion.div>
                );
              })
            )}
  
            {!loading && !shown.length && (
              <EmptyState
                icon={Search}
                title="No matches"
                message="Try a different category, or browse all listings."
                actionLabel="Clear filters"
                onAction={onClearFilters}
              />
            )}
          </motion.div>
        </AnimatePresence>
  
        {!loading && hasMore && (
          <div style={{ padding: '8px 16px 24px' }}>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onLoadMore}
              disabled={loadingMore}
              style={{
                width: '100%',
                padding: 14,
                border: '1px solid #E5EAF2',
                borderRadius: 14,
                background: '#fff',
                color: '#101C3A',
                fontSize: 13,
                fontWeight: 700,
                cursor: loadingMore ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(16,28,58,.04)',
                opacity: loadingMore ? 0.7 : 1,
              }}
            >
              {loadingMore ? (
                <>
                  <LoaderCircle size={15} className="cf-spin" />
                  Loading more…
                </>
              ) : (
                <>
                  Load more listings
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </div>
        )}
    </>
  );
}
