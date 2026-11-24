import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, Link2, MessageCircle, Store } from 'lucide-react';
import ProductCard from './home/ProductCard';
import { fetchSellerShop } from '../lib/listings';
import { cfImage } from '../lib/cloudinary';
import { copyText, shopUrl, whatsappShareUrl } from '../lib/share';
import './seller-shop.css';

export default function SellerShopPage({ sellerId, saved, onSave, onOpenListing, onBack, onToast }) {
  const [shop, setShop] = useState(undefined);   // undefined = loading, null = not found
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShop(undefined);
    setFailed(false);
    fetchSellerShop(sellerId)
      .then(result => { if (!cancelled) setShop(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [sellerId]);

  if (failed) {
    return (
      <main className="cf-seller cf-seller-empty">
        <p>We couldn't load this shop. Check your connection and try again.</p>
        <button type="button" onClick={onBack}>Go back</button>
      </main>
    );
  }
  if (shop === undefined) {
    return (
      <main className="cf-seller cf-seller-empty">
        <span className="cf-block-loader" />
        <span>Loading shop...</span>
      </main>
    );
  }
  if (shop === null) {
    return (
      <main className="cf-seller cf-seller-empty">
        <Store size={32} />
        <p>This shop doesn't exist.</p>
        <button type="button" onClick={onBack}>Go back</button>
      </main>
    );
  }

  const { seller, items } = shop;
  const name = seller.business_name || seller.display_name || 'CampusFlip seller';
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  const url = shopUrl(seller.id);
  const since = seller.created_at
    ? new Date(seller.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : null;

  async function copyLink() {
    const ok = await copyText(url);
    onToast?.(ok ? 'Shop link copied.' : 'Could not copy the link.', ok ? 'success' : 'error');
  }

  const shareText = `Check out ${name} on CampusFlip: ${items.length} item${items.length === 1 ? '' : 's'} for sale.\n${url}`;

  return (
    <main className="cf-seller">
      <header className="cf-seller-top">
        <button type="button" onClick={onBack} aria-label="Go back"><ArrowLeft size={19} /></button>
        <h1>Shop</h1>
      </header>

      <section className="cf-seller-head">
        <div className="cf-seller-avatar">
          {seller.avatar_url ? <img src={cfImage(seller.avatar_url, 240)} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="cf-seller-id">
          <h2>
            {name}
            {seller.is_verified && <ShieldCheck size={16} className="cf-seller-verified" aria-label="Verified seller" />}
          </h2>
          {seller.business_name && seller.display_name && <p>{seller.display_name}</p>}
          <small>
            {items.length} item{items.length === 1 ? '' : 's'} for sale{since ? ` · Member since ${since}` : ''}
          </small>
        </div>
      </section>

      <div className="cf-seller-actions">
        <a className="cf-seller-wa" href={whatsappShareUrl(shareText)} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} /> Share on WhatsApp
        </a>
        <button type="button" onClick={copyLink}><Link2 size={16} /> Copy link</button>
      </div>

      {items.length === 0 ? (
        <div className="cf-seller-empty-list">
          <Store size={28} />
          <p>Nothing for sale right now. Check back soon.</p>
        </div>
      ) : (
        <div className="grid cf-listings-grid cf-seller-grid">
          {items.map(item => (
            <ProductCard
              key={item.id}
              item={item}
              isSaved={saved?.includes?.(item.id)}
              onSave={() => onSave?.(item.id)}
              onOpen={() => onOpenListing(item)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
