import { Link2, MessageCircle } from 'lucide-react';
import { copyText, shopUrl, whatsappShareUrl } from '../lib/share';
import './seller-shop.css';

/** "Your shop link": one link that replaces posting every photo in a group. */
export default function ShopLinkCard({ userId, onToast }) {
  if (!userId) return null;
  const url = shopUrl(userId);
  const text = `See everything I'm selling on CampusFlip:\n${url}`;

  async function copy() {
    const ok = await copyText(url);
    onToast?.(ok ? 'Shop link copied.' : 'Could not copy the link.', ok ? 'success' : 'error');
  }

  return (
    <section className="cf-shoplink" aria-label="Your shop link">
      <div>
        <strong>Your shop link</strong>
        <small>Share one link in your groups and status instead of posting every photo.</small>
      </div>
      <div className="cf-seller-actions">
        <a className="cf-seller-wa" href={whatsappShareUrl(text)} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} /> Share on WhatsApp
        </a>
        <button type="button" onClick={copy}><Link2 size={16} /> Copy link</button>
      </div>
    </section>
  );
}
