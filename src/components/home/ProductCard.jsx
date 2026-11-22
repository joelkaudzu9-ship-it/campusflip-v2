import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Heart, MapPin, ShoppingBasket, Zap } from 'lucide-react';
import { money } from '../../lib/listings';

export default function ProductCard({ item, isSaved, onSave, onOpen, flashDeal }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const displayPrice = flashDeal ? flashDeal.dealPrice : item.price;

  return (
    <motion.article
      className="card cf-product-card"
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`${item.title}, ${money(displayPrice)}`}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(); }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="photo cf-product-image">
        {item.image && !imageError && (
          <>
            {!imageLoaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, var(--cf-surface-2) 25%, #F7FAFF 50%, var(--cf-surface-2) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'cf-shimmer 1.5s infinite',
                }}
              />
            )}
            <motion.img
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 1.05 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageLoaded(true); setImageError(true); }}
            />
          </>
        )}
        {(!item.image || imageError) && (
          <div style={{
            width: '100%', height: '100%',
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #EFF5FF 0%, #E1EBFF 100%)',
            color: 'var(--cf-subtle)',
          }}>
            <ShoppingBasket size={32} />
          </div>
        )}

        {flashDeal ? (
          <label
            className="gold"
            style={{
              background: '#FFF0E5',
              color: '#D65B16',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Flame size={10} fill="currentColor" />
            {flashDeal.discountPercent}% OFF
          </label>
        ) : item.isBoosted ? (
          <label
            className="gold"
            style={{
              background: 'var(--cf-amber)',
              color: 'var(--cf-navy)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            aria-label="Boosted listing"
          >
            <Zap size={10} fill="currentColor" />
            Boosted
          </label>
        ) : null}

        <motion.button
          whileTap={{ scale: 0.8 }}
          className={isSaved ? 'heart liked' : 'heart'}
          onClick={e => { e.stopPropagation(); onSave(); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
        >
          <Heart fill={isSaved ? 'currentColor' : 'none'} />
        </motion.button>
      </div>
      <div className="info cf-product-info">
        <h3 className="cf-product-title">{item.title}</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 5,
          marginTop: 6,
          fontSize: 12,
          color: '#64748b',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
            {item.businessName || item.sellerName}
          </span>
          {item.isVerified && (
            <span
              title="Verified CampusFlip Business"
              aria-label="Verified seller"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: 'var(--cf-blue)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
          )}
        </div>
        {item.kind === 'sale' && (
          <b className="cf-product-price">
            {money(displayPrice)}
            {flashDeal && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8995A8', textDecoration: 'line-through', marginLeft: 6 }}>
                {money(item.price)}
              </span>
            )}
          </b>
        )}
        {item.kind === 'wanted' && <b className="cf-product-price">Wanted</b>}
        {item.kind === 'free' && <b className="cf-product-price">Free</b>}
        {item.kind === 'lost_found' && <b className="cf-product-price">Lost & Found</b>}
        <p className="cf-product-meta"><MapPin />{item.location}</p>
      </div>
    </motion.article>
  );
}
