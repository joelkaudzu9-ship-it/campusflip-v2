import AuthPanel from './components/AuthPanel';
import { AnimatedModal, AnimatedTabs, MotionButton } from './components/MotionUI';
import ToastViewport from './components/ToastViewport';
import NotificationCenter from './components/NotificationCenter';
import EmptyState from './components/EmptyState';
import PageTransition from './components/PageTransition';
import Onboarding from './components/Onboarding';
import ContactSellerModal from './components/ContactSellerModal';
import InvitePage from './components/InvitePage';
import ResetPasswordPage from './components/ResetPasswordPage';
import InstallPrompt from './components/InstallPrompt';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, ChevronDown,
  ShoppingBasket, BookOpen, Laptop, Shirt, Utensils,
  MoreHorizontal, Flame, Store, Users, Heart, Plus,
  UserRound, MapPin, Zap, ArrowRight, ArrowLeft,
  X, Home, Bookmark, ShieldCheck, Clock3, LoaderCircle,
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabase';
import { safeStorage } from './lib/safeStorage';
import { cfImage } from './lib/cloudinary';
import { clearPrivateCaches } from './lib/privateCaches';
import { useBackButton } from './lib/useBackButton';
import './premium.css';
import './audit-fixes.css';
import ErrorBoundary from './components/ErrorBoundary';

// Rarely-used screens load on demand so the home feed ships less JavaScript.
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SavedItemsPage = lazy(() => import('./components/SavedItemsPage'));
const AccountPage = lazy(() => import('./components/AccountPage'));
const NotificationPreferences = lazy(() => import('./components/NotificationPreferences'));
const PrivacySecurity = lazy(() => import('./components/PrivacySecurity'));
const SearchPage = lazy(() => import('./components/SearchPage'));
const MyShop = lazy(() => import('./components/MyShop'));
const PostListingModal = lazy(() => import('./components/PostListingModal'));
const ListingDetails = lazy(() => import('./components/ListingDetails'));

const PAGE_SIZE = 30;

// True from the first time `flag` is true onward, so a lazy overlay mounts on
// first use but keeps its exit animation afterwards.
function useEverTrue(flag) {
  const [ever, setEver] = useState(Boolean(flag));
  useEffect(() => { if (flag) setEver(true); }, [flag]);
  return ever || Boolean(flag);
}

// Wraps a lazy-loaded overlay: shows a spinner while its code loads and a
// small "Something went wrong" card (with Close) if it crashes.
function Guard({ onClose, children, silent = false }) {
  return (
    <ErrorBoundary inline onClose={onClose}>
      <Suspense fallback={silent ? null : <div className="cf-lazy-fallback" role="status" aria-label="Loading"><LoaderCircle className="cf-spin" size={26} /></div>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}


const cats = [
  ['All', ShoppingBasket],
  ['Books', BookOpen],
  ['Electronics', Laptop],
  ['Clothes', Shirt],
  ['Food', Utensils],
  ['More', MoreHorizontal]
];

const categoryMatches = {
  Books: ['books', 'books & study materials'],
  Electronics: ['electronics'],
  Clothes: ['clothes', 'clothing & fashion'],
  Food: ['food', 'food & groceries'],
  More: ['accommodation', 'services', 'furniture & appliances',
    'beauty & personal care', 'sports & fitness', 'other']
};

const money = n => `MK ${Number(n || 0).toLocaleString('en-US')}`;

function relation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function mapListing(row, seller) {
  const category = relation(row.categories);
  const spot = relation(row.meeting_spots);
  const photos = [...(row.listing_photos || [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    kind: row.kind,
    category: category?.name || 'Other',
    location: spot?.name || 'Campus',
    image: cfImage(photos[0]?.image_url, 480) || null,
    badge: row.is_boosted ? 'Boosted' : '',
    isBoosted: row.is_boosted,
    sellerId: row.seller_id,
    sellerName: seller?.display_name || 'CampusFlip Seller',
    businessName: seller?.business_name || '',
    isVerified: seller?.is_verified === true,
    createdAt: row.created_at,
  };
}

const springPhysics = { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 };
const softSpring = { type: 'spring', stiffness: 200, damping: 25 };

const SORT_ORDER = ['recent', 'price_asc', 'price_desc'];
const SORT_LABELS = {
  recent: 'Recent',
  price_asc: 'Price ↑',
  price_desc: 'Price ↓'
};

/* ── Countdown: owns its 1-second timer so the whole app doesn't re-render ── */
function DealCountdown({ endsAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  return [
    Math.floor(left / 3600000),
    Math.floor((left % 3600000) / 60000),
    Math.floor((left % 60000) / 1000),
  ].map(v => String(v).padStart(2, '0')).join(':');
}

/* ── Product card ── */
function ProductCard({ item, isSaved, onSave, onOpen, flashDeal }) {
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
                  background: 'linear-gradient(90deg, #EEF3FC 25%, #F7FAFF 50%, #EEF3FC 75%)',
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
            color: '#94A3B8',
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
              background: '#F5A623',
              color: '#101C3A',
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
                background: '#2563EB',
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

export default function App() {
  const [cat, setCat] = useState('All');
  const [tab, setTab] = useState('Marketplace');
  const [sort, setSort] = useState('recent');
  const [saved, setSaved] = useState([]);
  const [deal, setDeal] = useState(0);
  const [flashDeals, setFlashDeals] = useState([]);
  const [dealHovered, setDealHovered] = useState(false);
  const [dealFocused, setDealFocused] = useState(false);
  const [dealCycleKey, setDealCycleKey] = useState(0);
  const [showAllDeals, setShowAllDeals] = useState(false);
  const [toast, setToast] = useState(null);
  const [nav, setNav] = useState('Home');
  const [session, setSession] = useState(null);
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [showMyShop, setShowMyShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedPage, setShowSavedPage] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [refreshListings, setRefreshListings] = useState(0);
  const [dealsRefresh, setDealsRefresh] = useState(0);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [totalActive, setTotalActive] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [showResetPassword, setShowResetPassword] = useState(false);

  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [inviteCode, setInviteCode] = useState(() => {
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/^\/invite\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('listing');
    if (!listingId) return;

    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`id, seller_id, title, price, kind, status, is_boosted, created_at,
                 categories(name, slug), meeting_spots(name),
                 listing_photos(image_url, display_order)`)
        .eq('id', listingId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        ping('This listing is no longer available.', 'error');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      let seller = null;
      if (data.seller_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, business_name, is_verified')
          .eq('id', data.seller_id)
          .maybeSingle();
        seller = profile;
      }

      setSelectedListing(mapListing(data, seller));
      window.history.replaceState({}, '', window.location.pathname);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !safeStorage.get('campusflip_onboarded');
  });

  const [contactIntent, setContactIntent] = useState(null);
  const pendingContact = useRef(null);
  const [contactReplayToken, setContactReplayToken] = useState(0);
  const [contactReplyId, setContactReplyId] = useState(null);

  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(true);

  const refreshDebounceRef = useRef({});
  const itemsRef = useRef([]);
  const postMounted = useEverTrue(showPost);
  const listingMounted = useEverTrue(Boolean(selectedListing));

  const accountBack = useBackButton(showAccountPage, () => { setShowAccountPage(false); setNav('Home'); });
  const settingsBack = useBackButton(showSettings, () => { setShowSettings(false); });
  const savedBack = useBackButton(showSavedPage, () => { setShowSavedPage(false); setNav('Home'); });
  const shopBack = useBackButton(showMyShop, () => { setShowMyShop(false); setNav('Home'); });
  const searchBack = useBackButton(showSearchPage, () => { setShowSearchPage(false); });
  const notifPrefsBack = useBackButton(showNotificationPrefs, () => { setShowNotificationPrefs(false); setShowAccountPage(true); });
  const privacyBack = useBackButton(showPrivacy, () => { setShowPrivacy(false); setShowAccountPage(true); });
  const adminBack = useBackButton(showAdmin, () => { setShowAdmin(false); setNav('Home'); });
  const listingBack = useBackButton(Boolean(selectedListing), () => setSelectedListing(null));

  // Make an open listing shareable/refreshable: reflect it in the address bar.
  // (replaceState, so the Back-button history is not affected.)
  const selectedListingId = selectedListing?.id;
  useEffect(() => {
    if (!selectedListingId || typeof window === 'undefined') return;
    try {
      window.history.replaceState(window.history.state, '', `/?listing=${encodeURIComponent(selectedListingId)}`);
    } catch { /* ignore */ }
  }, [selectedListingId]);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/invite\/([a-zA-Z0-9]+)/);
    if (match) safeStorage.set('campusflip_invite_code', match[1]);
  }, []);

  useEffect(() => {
    if (flashDeals.length < 2) return;
    if (dealHovered || dealFocused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setTimeout(() => {
      setDeal(c => (c + 1) % flashDeals.length);
    }, 6000);
    return () => clearTimeout(timer);
  }, [flashDeals.length, deal, dealHovered, dealFocused, dealCycleKey]);

  // Show the app as soon as the first listings arrive (images fill in as they load).
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowSplash(false), 250);
      return () => clearTimeout(timer);
    }
    // Never hold the splash longer than 2.5 s, even on a very slow connection.
    const cap = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(cap);
  }, [loading]);

  useEffect(() => {
    if (!supabase) return;

    clearPrivateCaches();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(newSession);
        setShowResetPassword(true);
        return;
      }
      if (event === 'SIGNED_OUT') clearPrivateCaches();
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      if (!session?.user?.id || !supabase) { setIsAdmin(false); return; }
      // is_admin is a private column: ask the server-side is_admin() function instead.
      const rpc = await supabase.rpc('is_admin');
      if (!rpc.error) { setIsAdmin(rpc.data === true); return; }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
      setIsAdmin(data?.is_admin === true);
    }
    checkAdmin();
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    async function loadProfileAvatar() {
      if (!session?.user?.id || !supabase) { setProfileAvatar(''); return; }
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle();
      if (mounted) setProfileAvatar(cfImage(data?.avatar_url, 128) || '');
    }
    loadProfileAvatar();
    return () => { mounted = false; };
  }, [session?.user?.id, profileRefresh]);

  useEffect(() => {
    let mounted = true;
    async function loadSavedListings() {
      if (!session?.user?.id || !supabase) { setSaved([]); return; }
      const { data } = await supabase.from('saved_listings').select('listing_id').eq('user_id', session.user.id);
      if (mounted) setSaved((data || []).map(item => item.listing_id));
    }
    loadSavedListings();
    return () => { mounted = false; };
  }, [session?.user?.id]);

  const fetchListingsPage = useCallback(async (offset, currentTab, currentCat, currentSort) => {
    const filterByCategory = currentTab === 'Marketplace' && currentCat !== 'All';
    // !inner makes the category filter remove listings, not just blank the join.
    const categorySelect = filterByCategory ? 'categories!inner(name, slug)' : 'categories(name, slug)';

    let request = supabase
      .from('listings')
      .select(`id, seller_id, title, price, kind, status, is_boosted, created_at, ${categorySelect}, meeting_spots(name), listing_photos(image_url, display_order)`)
      .eq('status', 'active');

    if (currentSort === 'price_asc') {
      request = request.order('price', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    } else if (currentSort === 'price_desc') {
      request = request.order('price', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    } else {
      request = request.order('is_boosted', { ascending: false }).order('created_at', { ascending: false });
    }

    request = request.range(offset, offset + PAGE_SIZE - 1);

    request = currentTab === 'Marketplace'
      ? request.eq('kind', 'sale')
      : request.in('kind', ['wanted', 'free', 'lost_found']);

    if (filterByCategory) {
      const names = categoryMatches[currentCat] || [];
      // ilike without wildcards = case-insensitive exact match, run on the server.
      const conditions = names.map(name => `name.ilike."${name.replace(/"/g, '')}"`).join(',');
      if (conditions) request = request.or(conditions, { referencedTable: 'categories' });
    }

    const { data, error } = await request;
    if (error) throw error;

    const listings = data || [];
    const sellerIds = [...new Set(listings.map(item => item.seller_id).filter(Boolean))];
    let sellerProfiles = {};
    if (sellerIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, business_name, is_verified')
        .in('id', sellerIds);
      sellerProfiles = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    }

    return listings.map(row => mapListing(row, sellerProfiles[row.seller_id]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const mapped = await fetchListingsPage(0, tab, cat, sort);
        if (cancelled) return;
        setItems(mapped);
        setHasMore(mapped.length === PAGE_SIZE);
        setPendingUpdates(0);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load listings.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadListings();
    return () => { cancelled = true; };
  }, [tab, cat, sort, refreshListings, fetchListingsPage]);

  // Real total of active listings (the loaded page is capped at PAGE_SIZE).
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('kind', 'sale')
      .then(({ count, error: countError }) => {
        if (!cancelled && !countError && typeof count === 'number') setTotalActive(count);
      });
    return () => { cancelled = true; };
  }, [refreshListings]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const mapped = await fetchListingsPage(items.length, tab, cat, sort);
      setItems(prev => {
        const seen = new Set(prev.map(item => item.id));
        return [...prev, ...mapped.filter(item => !seen.has(item.id))];
      });
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.error('Load more failed:', err);
      ping('Could not load more listings.', 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadFlashDeals() {
      if (!isSupabaseConfigured || !supabase) return;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('flash_deals')
        .select(`
          id, listing_id, original_price, deal_price, starts_at, ends_at,
          listings!inner(
            id, seller_id, title, price, kind, status, is_boosted, created_at,
            categories(name, slug), meeting_spots(name), listing_photos(image_url, display_order)
          )
        `)
        .eq('is_active', true)
        .lte('starts_at', now)
        .gt('ends_at', now)
        .eq('listings.status', 'active')
        .eq('listings.kind', 'sale')
        .order('ends_at', { ascending: true })
        .limit(15);

      if (cancelled) return;

      if (error) {
        console.error('Flash deals error:', error.message);
        setFlashDeals([]);
        return;
      }

      const records = data || [];
      const sellerIds = [
        ...new Set(records.map(r => relation(r.listings)?.seller_id).filter(Boolean))
      ];

      let sellerProfiles = {};
      if (sellerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, business_name, is_verified')
          .in('id', sellerIds);
        sellerProfiles = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      }

      const mapped = records.map(record => {
        const listing = relation(record.listings);
        if (!listing) return null;

        const originalPrice = Number(record.original_price);
        const dealPrice = Number(record.deal_price);

        if (!Number.isFinite(originalPrice) || !Number.isFinite(dealPrice) ||
            originalPrice <= 0 || dealPrice <= 0 || dealPrice >= originalPrice) return null;

        return {
          ...mapListing(listing, sellerProfiles[listing.seller_id]),
          flashDealId: record.id,
          originalPrice,
          dealPrice,
          discountPercent: Math.round(((originalPrice - dealPrice) / originalPrice) * 100),
          startsAt: record.starts_at,
          endsAt: record.ends_at,
          isFlashDeal: true
        };
      }).filter(Boolean);

      if (!cancelled) {
        setFlashDeals(mapped);
        setDeal(current => mapped.length ? current % mapped.length : 0);
      }
    }

    loadFlashDeals();
    return () => { cancelled = true; };
  }, [refreshListings, dealsRefresh]);

  // Refresh deals right after the next one expires.
  useEffect(() => {
    if (!flashDeals.length) return;
    const nextExpiry = Math.min(...flashDeals.map(item => new Date(item.endsAt).getTime()));
    const delay = Math.max(nextExpiry - Date.now(), 0) + 1000;
    const timer = setTimeout(() => setDealsRefresh(v => v + 1), delay);
    return () => clearTimeout(timer);
  }, [flashDeals]);

  // Live updates: deals refresh quietly; feed changes show a "new activity"
  // pill instead of reloading the list under the user's thumb.
  const scheduleRefresh = useCallback((kind) => {
    const timers = refreshDebounceRef.current;
    if (timers[kind]) clearTimeout(timers[kind]);
    timers[kind] = setTimeout(() => {
      if (kind === 'deals') setDealsRefresh(v => v + 1);
      else setPendingUpdates(v => v + 1);
      timers[kind] = null;
    }, 600);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:marketplace-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, (payload) => {
        // The database bumps listings.views_count on every view, which fires an UPDATE
        // event for each one. Only react to changes that alter what the feed shows:
        // a listing we don't have becoming active, or one we have leaving 'active'.
        const row = payload.new || {};
        const id = row.id || payload.old?.id;
        const known = itemsRef.current.some(item => item.id === id);
        if (payload.eventType === 'DELETE') { if (known) scheduleRefresh('listings'); return; }
        if ((row.status === 'active' && !known) || (row.status !== 'active' && known)) scheduleRefresh('listings');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_deals' }, () => scheduleRefresh('deals'))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(refreshDebounceRef.current).forEach(t => t && clearTimeout(t));
    };
  }, [scheduleRefresh]);

  function ping(message, type = 'success') { setToast({ id: Date.now(), message, type }); }
  function dismissToast() { setToast(null); }

  function completeOnboarding() {
    safeStorage.set('campusflip_onboarded', 'true');
    setShowOnboarding(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) { ping(error.message); return; }
    setShowAccountPage(false);
    ping('You have signed out.');
  }

  function handleRequireAuth(intent) { setContactIntent(intent); }

  function handleProceedToAuth(replyId) {
    pendingContact.current = { ...contactIntent, replyId: replyId || null };
    setContactIntent(null);
    setTimeout(() => setShowAuth(true), 50);
  }

  async function save(id) {
    if (!session?.user?.id) { ping('Please sign in to save listings.', 'error'); setShowAuth(true); return; }
    const alreadySaved = saved.includes(id);
    setSaved(current => alreadySaved ? current.filter(i => i !== id) : [...current, id]);

    let error;
    if (alreadySaved) {
      ({ error } = await supabase.from('saved_listings').delete().eq('user_id', session.user.id).eq('listing_id', id));
    } else {
      ({ error } = await supabase.from('saved_listings').insert({ user_id: session.user.id, listing_id: id }));
    }

    if (error) {
      setSaved(current => alreadySaved ? [...new Set([...current, id])] : current.filter(i => i !== id));
      ping('Could not update saved listings.', 'error');
      return;
    }
    ping(alreadySaved ? 'Removed from saved items' : 'Added to saved items');
  }

  async function handleOpenListingFromNotification(listingId) {
    if (!listingId) return;

    const found = items.find(item => item.id === listingId);
    if (found) { setSelectedListing(found); return; }

    const { data, error: queryError } = await supabase
      .from('listings')
      .select(`
        id, seller_id, title, price, kind, status, is_boosted, created_at,
        categories(name, slug), meeting_spots(name),
        listing_photos(image_url, display_order)
      `)
      .eq('id', listingId)
      .eq('status', 'active')
      .maybeSingle();

    if (queryError || !data) {
      ping('This listing is no longer available.', 'error');
      return;
    }

    let seller = null;
    if (data.seller_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, business_name, is_verified')
        .eq('id', data.seller_id)
        .maybeSingle();
      seller = profile;
    }

    setSelectedListing(mapListing(data, seller));
  }

  // Category and sort run on the server. "Verified only" needs seller data that is
  // fetched separately, so it filters the loaded rows (and auto-loads more pages below).
  const shown = useMemo(
    () => (verifiedOnly ? items.filter(item => item.isVerified === true) : items),
    [items, verifiedOnly]
  );

  const totalListings = totalActive ?? items.length;
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Keep fetching pages while "Verified only" would otherwise show an almost-empty list.
  const verifiedAutoPages = useRef(0);
  useEffect(() => { verifiedAutoPages.current = 0; }, [verifiedOnly, tab, cat, sort]);
  useEffect(() => {
    if (!verifiedOnly || loading || loadingMore || !hasMore) return;
    if (shown.length >= 12 || verifiedAutoPages.current >= 5) return;
    verifiedAutoPages.current += 1;
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedOnly, loading, loadingMore, hasMore, shown.length]);

  const activeDeal = flashDeals.length ? flashDeals[deal % flashDeals.length] : null;

  const dealActive = activeDeal ? new Date(activeDeal.endsAt).getTime() > Date.now() : false;

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

  if (showResetPassword) {
    return (
      <ResetPasswordPage
        onToast={ping}
        onComplete={() => {
          setShowResetPassword(false);
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  if (inviteCode) {
    return (
      <InvitePage
        code={inviteCode}
        onEnter={() => {
          window.history.replaceState({}, '', '/');
          setInviteCode(null);
          if (!session) setShowAuth(true);
        }}
      />
    );
  }

  return (
    <>
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="cf-splash"
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springPhysics, delay: 0.1 }}
              className="cf-splash-logo"
            >
              <span className="mark">CF</span>
              <span>Campus<span style={{ color: '#2563EB' }}>Flip</span></span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="cf-splash-tagline"
            >
              Buy. Sell. Meet.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              style={{ marginTop: 20 }}
            >
              <span className="cf-block-loader"></span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shell">
        <header className="top cf-header">
          <a className="brand cf-brand" href="#" onClick={() => setNav('Home')}>
            <span className="mark">CF</span>
            <span><b>Campus<span>Flip</span></b><small>Buy. Sell. <em>Meet.</em></small></span>
          </a>
          <div className="actions">
            <NotificationCenter
              session={session}
              onOpenListing={handleOpenListingFromNotification}
            />
            {session && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="avatar"
              onClick={() => session ? setShowAccountPage(true) : setShowAuth(true)}
              aria-label={session ? 'Open account' : 'Sign in'}
              style={{ padding: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}
            >
              {profileAvatar ? (
                <img src={profileAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              ) : (
                session?.user?.email?.[0]?.toUpperCase() || <UserRound size={18} aria-hidden="true" />
              )}
            </motion.button>
            )}
            {!session && (
              <button type="button" className="cf-signin-btn" onClick={() => setShowAuth(true)}>
                Sign in
              </button>
            )}
          </div>
        </header>

        <div style={{ paddingTop: '80px' }}>
          <AnimatedModal open={showSettings && Boolean(session)} onClose={settingsBack.close} className="cf-account-modal">
            <Guard onClose={settingsBack.close}>
            <AccountSettings
              session={session}
              onClose={() => { setShowSettings(false); setProfileRefresh(v => v + 1); }}
              onBack={settingsBack.close}
              onToast={ping}
            />
            </Guard>
          </AnimatedModal>

          {/* HERO — bold marketplace message with a visual campus product collage */}
          <motion.section
            className="cf-hero"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPhysics, delay: 0.05 }}
          >
            <div className="cf-hero-glow cf-hero-glow-one" />
            <div className="cf-hero-glow cf-hero-glow-two" />

            <div className="cf-hero-copy">
              <span className="cf-hero-eyebrow">THE KUHeS MARKETPLACE</span>
              <h1>
                Everything campus.
                <span>One marketplace.</span>
              </h1>
              <p>
                Buy what you need. Sell what you don't.
                <br className="cf-hero-desktop-break" /> Connect with your campus community.
              </p>
              <motion.button
                type="button"
                className="cf-hero-cta"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  document.querySelector('.cf-categories')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }}
              >
                Explore marketplace <ArrowRight size={18} />
              </motion.button>
              <div className="cf-hero-stats">
                <span className="cf-live-dot" />
                <span>
                  {totalListings} active listing{totalListings === 1 ? '' : 's'} on campus
                </span>
              </div>
            </div>

            <div className="cf-hero-art" aria-hidden="true">
              <div className="cf-hero-art-orbit" />
              <div className="cf-hero-art-spark cf-hero-art-spark-one">✦</div>
              <div className="cf-hero-art-spark cf-hero-art-spark-two">✳</div>
              <div className="cf-hero-product cf-hero-product-bag">
                <span>🎒</span>
                <small>CAMPUS GEAR</small>
              </div>
              <div className="cf-hero-product cf-hero-product-laptop">
                <span>💻</span>
              </div>
              <div className="cf-hero-product cf-hero-product-books">
                <span>📚</span>
                <small>STUDY ESSENTIALS</small>
              </div>
              <div className="cf-hero-product cf-hero-product-bottle">
                <span>🧴</span>
              </div>
              <div className="cf-hero-art-caption">
                <span className="cf-hero-caption-icon"><Users size={15} /></span>
                <span>{totalListings} item{totalListings === 1 ? '' : 's'} from your campus community</span>
              </div>
            </div>
          </motion.section>

          <div className="cf-search-area" style={{ margin: '12px 20px 0' }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSearchPage(true)}
              className="cf-search"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
              aria-label="Open search"
            >
              <Search size={18} color="#94A3B8" />
              <span style={{ flex: 1, color: '#94A3B8', fontSize: 14 }}>
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
                  color: '#2563EB',
                }}
              >
                <SlidersHorizontal size={16} />
              </div>
            </motion.button>
          </div>

          <nav className="cats cf-categories" aria-label="Categories">
            {cats.map(([name, Icon]) => {
              const active = cat === name;
              return (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className={`cf-category${active ? ' active' : ''}`}
                  onClick={() => setCat(name)}
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
              onClick={() => setVerifiedOnly(false)}
              style={chipStyle(!verifiedOnly)}
            >
              All sellers
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setVerifiedOnly(true)}
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
                setSort(next);
              }}
              style={chipStyle(sort !== 'recent')}
              aria-label={`Sort: ${SORT_LABELS[sort]}. Tap to change.`}
            >
              <Clock3 size={13} />
              {SORT_LABELS[sort]}
            </motion.button>
          </div>

          {(flashDeals.length > 0 || showAllDeals) && (
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
              {showAllDeals ? (
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
                        onClick={() => setShowAllDeals(false)}
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
                        <p>{flashDeals.length} active {flashDeals.length === 1 ? 'deal' : 'deals'}</p>
                      </div>
                    </div>
                  </div>

                  {flashDeals.length === 0 ? (
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
                      {flashDeals.map((fd, i) => (
                        <motion.div
                          key={fd.id}
                          initial={{ opacity: 0, y: 12, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ ...springPhysics, delay: i * 0.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedListing({ ...fd, price: fd.dealPrice, originalPrice: fd.originalPrice, isFlashDeal: true })}
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
                      onClick={() => setShowAllDeals(true)}
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
                          onMouseEnter={() => setDealHovered(true)}
                          onMouseLeave={() => setDealHovered(false)}
                          onFocus={() => setDealFocused(true)}
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) setDealFocused(false);
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
                              onClick={() => setSelectedListing({ ...activeDeal, price: activeDeal.dealPrice, originalPrice: activeDeal.originalPrice, isFlashDeal: true })}
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
                          {flashDeals.length > 1 && (
                            <div className="arrows">
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => {
                                  setDeal(c => (c + flashDeals.length - 1) % flashDeals.length);
                                  setDealCycleKey(k => k + 1);
                                }}
                                aria-label="Previous deal"
                              >
                                ‹
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => {
                                  setDeal(c => (c + 1) % flashDeals.length);
                                  setDealCycleKey(k => k + 1);
                                }}
                                aria-label="Next deal"
                              >
                                ›
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                      {flashDeals.length > 1 && (
                        <div className="dots">
                          {flashDeals.map((item, index) => (
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              key={item.id}
                              className={deal % flashDeals.length === index ? 'on' : ''}
                              onClick={() => {
                                setDeal(index);
                                setDealCycleKey(k => k + 1);
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
          )}

          <AnimatedTabs
            className="tabs cf-market-tabs cf-motion-tabs"
            value={tab}
            onChange={nextTab => { setTab(nextTab); setCat('All'); }}
            tabs={[
              { label: <><Store size={17} /> Marketplace</>, value: 'Marketplace' },
              { label: <><Users size={17} /> Wanted &amp; Free</>, value: 'Wanted & Free' }
            ]}
          />

          {pendingUpdates > 0 && !loading && (
            <button
              type="button"
              className="cf-new-activity"
              onClick={() => { setRefreshListings(v => v + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                        onSave={() => save(item.id)}
                        onOpen={() => setSelectedListing(item)}
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
                  onAction={() => { setCat('All'); setVerifiedOnly(false); }}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {!loading && hasMore && (
            <div style={{ padding: '8px 16px 24px' }}>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={loadMore}
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

          {!session && (
            <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="join">
              <Users />
              <div>
                <b>Join the CampusFlip community</b>
                <span>Get the best deals, post freely!</span>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAuth(true)}>
                Sign Up <ArrowRight />
              </motion.button>
            </motion.aside>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            className="post cf-post-button"
            onClick={() => { if (!session) { setShowAuth(true); return; } setShowPost(true); }}
          >
            <Plus /><span>Post</span>
          </motion.button>

          {postMounted && (
          <Guard silent onClose={() => setShowPost(false)}>
          <PostListingModal
            open={showPost}
            onClose={() => setShowPost(false)}
            session={session}
            onCreated={listing => {
              setRefreshListings(v => v + 1);
              ping(listing.status === 'pending_payment' ? 'Post created. Complete payment to publish it.' : 'Your post is now live!');
            }}
          />
          </Guard>
          )}

          <nav className="bottom cf-bottom-nav">
            {[['Home', Home], ['Saved', Bookmark], ['My Shop', Store], ['Profile', UserRound]].map(([name, Icon]) => (
              <motion.button
                whileTap={{ scale: 0.9 }}
                key={name}
                className={nav === name ? 'current' : ''}
                onClick={() => {
                  setNav(name);
                  if (name === 'My Shop') { if (!session) { setShowAuth(true); return; } setShowMyShop(true); }
                  else if (name === 'Saved') { if (!session) { setShowAuth(true); return; } setShowSavedPage(true); }
                  else if (name === 'Profile') { if (!session) { setShowAuth(true); return; } setShowAccountPage(true); }
                }}
              >
                <Icon /><span>{name}</span>
              </motion.button>
            ))}
          </nav>

          <ToastViewport toast={toast} onDismiss={dismissToast} />

          <InstallPrompt />

          <AnimatedModal open={showAuth} onClose={() => setShowAuth(false)} className="cf-auth-modal">
            <div className="cf-auth-modal-heading">
              <div>
                <span className="cf-eyebrow">WELCOME TO CAMPUSFLIP</span>
                <h2>Join your campus marketplace.</h2>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} type="button" className="cf-icon-close" onClick={() => setShowAuth(false)} aria-label="Close sign in">
                <X size={19} />
              </motion.button>
            </div>
            <AuthPanel
              onToast={ping}
              onAuthenticated={async () => {
                setShowAuth(false);

                const code = safeStorage.get('campusflip_invite_code');
                if (code) {
                  const { data, error } = await supabase.rpc('claim_referral', { p_code: code });
                  if (!error && data?.success) {
                    ping('Welcome! Your MK 200 referral credit is ready.');
                  } else {
                    ping('Welcome to CampusFlip!');
                  }
                  safeStorage.remove('campusflip_invite_code');
                } else {
                  ping('Welcome to CampusFlip!');
                }

                const pending = pendingContact.current;
                if (pending) {
                  setContactReplyId(pending.replyId || null);
                  setTimeout(() => {
                    setContactReplayToken(t => t + 1);
                    pendingContact.current = null;
                  }, 250);
                }
              }}
            />
          </AnimatedModal>

          <AnimatePresence>
            {showAccountPage && Boolean(session) && (
              <PageTransition key="account-page" onBack={accountBack.close}>
<Guard onClose={accountBack.close}>
                <AccountPage
                  session={session}
                  onBack={accountBack.close}
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenNotifications={() => setShowNotificationPrefs(true)}
                  onOpenPrivacy={() => setShowPrivacy(true)}
                  onSignOut={handleSignOut}
                  onOpenAdmin={() => setShowAdmin(true)}
                  isAdmin={isAdmin}
                />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showNotificationPrefs && Boolean(session) && (
              <PageTransition key="notif-prefs" onBack={notifPrefsBack.close}>
<Guard onClose={notifPrefsBack.close}>
                <NotificationPreferences
                  session={session}
                  onBack={notifPrefsBack.close}
                  onToast={ping}
                />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPrivacy && Boolean(session) && (
              <PageTransition key="privacy" onBack={privacyBack.close}>
<Guard onClose={privacyBack.close}>
                <PrivacySecurity
                  session={session}
                  onBack={privacyBack.close}
                  onSignOut={() => {
                    setShowAccountPage(false);
                    setNav('Home');
                    privacyBack.close();
                  }}
                  onToast={ping}
                />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSavedPage && (
              <PageTransition key="saved-page" onBack={savedBack.close}>
<Guard onClose={savedBack.close}>
                <SavedItemsPage
                  session={session}
                  onBack={savedBack.close}
                  onOpenListing={item => {
                    savedBack.close();
                    setTimeout(() => setSelectedListing(item), 0);
                  }}
                  onToast={ping}
                />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showMyShop && (
              <PageTransition key="my-shop" onBack={shopBack.close}>
<Guard onClose={shopBack.close}>
                <MyShop
                  session={session}
                  onBack={shopBack.close}
                  onPostAnother={() => {
                    shopBack.close();
                    setTimeout(() => setShowPost(true), 0);
                  }}
                  onToast={ping}
                />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAdmin && (
              <PageTransition key="admin-dashboard" onBack={adminBack.close}>
<Guard onClose={adminBack.close}>
                <AdminDashboard session={session} onBack={adminBack.close} />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSearchPage && (
              <PageTransition key="search-page" onBack={searchBack.close}>
<Guard onClose={searchBack.close}>
                <SearchPage
                  items={items}
                  saved={saved}
                  onSave={save}
                  onOpenListing={(item) => {
                    searchBack.close();
                    setTimeout(() => setSelectedListing(item), 0);
                  }}
                  onBack={searchBack.close}
                />
</Guard>
              </PageTransition>
            )}
          </AnimatePresence>

          {listingMounted && (
          <Guard silent onClose={listingBack.close}>
          <ListingDetails
            listing={selectedListing}
            onClose={listingBack.close}
            onToast={ping}
            onRequireAuth={handleRequireAuth}
            replayToken={contactReplayToken}
            replyId={contactReplyId}
          />
          </Guard>
          )}

          <AnimatePresence>
            {contactIntent && (
              <ContactSellerModal
                open={!!contactIntent}
                seller={contactIntent.seller}
                listing={{
                  title: contactIntent.title,
                  image: contactIntent.image,
                  spotName: contactIntent.spotName
                }}
                onProceed={handleProceedToAuth}
                onClose={() => setContactIntent(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
