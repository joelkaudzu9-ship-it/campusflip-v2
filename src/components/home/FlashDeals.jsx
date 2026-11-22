import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock3, Flame, ShoppingBasket, Zap } from 'lucide-react';
import { dealToListing, money } from '../../lib/listings';
import { softSpring, springPhysics } from '../../lib/motion';
import DealCountdown from './DealCountdown';

/** Featured flash-deal carousel with an "all deals" view. Hidden when there are no deals. */
export default function FlashDeals({ deals, onOpen }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Keep the index valid when the list changes.
  useEffect(() => {
    setIndex(current => (deals.length ? current % deals.length : 0));
  }, [deals.length]);

  // Auto-advance, paused on hover/focus and for reduced motion.
  useEffect(() => {
    if (deals.length < 2 || hovered || focused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setTimeout(() => setIndex(c => (c + 1) % deals.length), 6000);
    return () => clearTimeout(timer);
  }, [deals.length, index, hovered, focused, cycleKey]);

  const activeDeal = deals.length ? deals[index % deals.length] : null;
  const dealActive = activeDeal ? new Date(activeDeal.endsAt).getTime() > Date.now() : false;

  if (!deals.length && !showAll) return null;

  return (
      <motion.section
        layout
        className="cf-flash-section"
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingBottom: '16px'
        }}
      >
        <AnimatePresence mode="wait">
          {showAll ? (
            <motion.div
              key="all-deals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={softSpring}
            >
              <div className="heading cf-section-heading">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAll(false)}
                    aria-label="Back to featured deal"
                    style={{
                      width: 34, height: 34,
                      border: '1px solid #E5EAF2',
                      borderRadius: 10,
                      background: '#fff',
                      color: '#101C3A',
                      display: 'grid', placeItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowLeft size={16} />
                  </motion.button>
                  <div style={{ minWidth: 0 }}>
                    <h2><Flame fill="currentColor" /> All Flash Deals</h2>
                    <p>{deals.length} active {deals.length === 1 ? 'deal' : 'deals'}</p>
                  </div>
                </div>
              </div>

              {deals.length === 0 ? (
                <div className="empty cf-empty-state">
                  <Zap />
                  <b>No flash deals right now</b>
                  <span>Check back soon for special campus offers.</span>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}>
                  {deals.map((fd, i) => (
                    <motion.div
                      key={fd.id}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...springPhysics, delay: i * 0.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onOpen(dealToListing(fd))}
                      style={{
                        background: '#fff',
                        border: '1px solid #E5EAF2',
                        borderRadius: 16,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(16,28,58,.05)',
                      }}
                    >
                      <div style={{ aspectRatio: '4/3', background: '#EEF3FC', position: 'relative', overflow: 'hidden' }}>
                        {fd.image ? (
                          <img src={fd.image} alt={fd.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
                            <ShoppingBasket size={28} />
                          </div>
                        )}
                        <span style={{
                          position: 'absolute', top: 8, left: 8,
                          background: '#FFF0E5', color: '#D65B16',
                          padding: '3px 8px', borderRadius: 6,
                          fontSize: 11, fontWeight: 900,
                        }}>
                          🔥 {fd.discountPercent}% OFF
                        </span>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fd.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <b style={{ color: '#2563EB', fontSize: 15 }}>{money(fd.dealPrice)}</b>
                          <span style={{ fontSize: 12, color: '#8995A8', textDecoration: 'line-through' }}>
                            {money(fd.originalPrice)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="featured-deal"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={softSpring}
            >
              <div className="heading cf-section-heading">
                <div style={{ minWidth: 0 }}>
                  <h2><Flame fill="currentColor" /> Flash Deals</h2>
                  <p>Limited-time campus offers 🔥</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="see"
                  onClick={() => setShowAll(true)}
                >
                  See All <ArrowRight />
                </motion.button>
              </div>

              {activeDeal && dealActive ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      className="deal"
                      key={activeDeal.id}
                      onMouseEnter={() => setHovered(true)}
                      onMouseLeave={() => setHovered(false)}
                      onFocus={() => setFocused(true)}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
                      }}
                      initial={{ opacity: 0, x: 20, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.98 }}
                      transition={springPhysics}
                    >
                      <div className="cf-deal-copy">
                        <b className="pill">
                          <Zap size={13} /> {activeDeal.discountPercent}% OFF
                        </b>
                        <strong>{activeDeal.title}</strong>
                        <div className="cf-deal-prices">
                          <b>{money(activeDeal.dealPrice)}</b>
                          <span>{money(activeDeal.originalPrice)}</span>
                        </div>
                        <span className="cf-deal-countdown">
                          <Clock3 size={14} /> Ends in <DealCountdown endsAt={activeDeal.endsAt} />
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onOpen(dealToListing(activeDeal))}
                        >
                          Grab deal <ArrowRight />
                        </motion.button>
                      </div>
                      <div className="cf-deal-visual">
                        <div className="cf-deal-visual-glow" />
                        {activeDeal.image ? (
                          <img src={activeDeal.image} alt={activeDeal.title} loading="lazy" />
                        ) : (
                          <div className="cf-deal-image-fallback" aria-hidden="true">⚡</div>
                        )}
                      </div>
                      {deals.length > 1 && (
                        <div className="arrows">
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => {
                              setIndex(c => (c + deals.length - 1) % deals.length);
                              setCycleKey(k => k + 1);
                            }}
                            aria-label="Previous deal"
                          >
                            ‹
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => {
                              setIndex(c => (c + 1) % deals.length);
                              setCycleKey(k => k + 1);
                            }}
                            aria-label="Next deal"
                          >
                            ›
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {deals.length > 1 && (
                    <div className="dots">
                      {deals.map((item, index) => (
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          key={item.id}
                          className={index % deals.length === index ? 'on' : ''}
                          onClick={() => {
                            setIndex(index);
                            setCycleKey(k => k + 1);
                          }}
                          aria-label={`Show flash deal ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty cf-empty-state">
                  <Zap />
                  <b>No flash deals right now</b>
                  <span>Check back soon for special campus offers.</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
  );
}
