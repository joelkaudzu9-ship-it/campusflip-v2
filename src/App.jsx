import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import { supabase } from './lib/supabase';
import { disablePush } from './lib/push';
import { setMonitoringUser } from './lib/monitoring';
import { safeStorage } from './lib/safeStorage';
import { PATHS, navItemFor, parseRoute } from './lib/routes';
import { fetchListingById } from './lib/listings';
import { useAppNav } from './hooks/useAppNav';
import { useSession } from './hooks/useSession';
import { useFeed } from './hooks/useFeed';
import { useFlashDeals } from './hooks/useFlashDeals';
import { useSavedListings } from './hooks/useSavedListings';
import { useMarketplaceLive } from './hooks/useMarketplaceLive';

import ToastViewport from './components/ToastViewport';
import Onboarding from './components/Onboarding';
import ContactSellerModal from './components/ContactSellerModal';
import InvitePage from './components/InvitePage';
import ResetPasswordPage from './components/ResetPasswordPage';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import { useOnline } from './hooks/useOnline';
import Overlays from './components/Overlays';
import Splash from './components/home/Splash';
import AppHeader from './components/home/AppHeader';
import HomeGreeting from './components/home/HomeGreeting';
import FilterSheet from './components/home/FilterSheet';
import SearchBar from './components/home/SearchBar';
import FilterBar from './components/home/FilterBar';
import FlashDeals from './components/home/FlashDeals';
import Feed from './components/home/Feed';
import JoinBanner from './components/home/JoinBanner';
import BottomNav from './components/home/BottomNav';
import AuthModal from './components/home/AuthModal';
import './premium.css';
import './audit-fixes.css';
import './home-clean.css';

const NAV_PATHS = { Home: PATHS.home, Saved: PATHS.saved, 'My Shop': PATHS.shop, Profile: PATHS.account };

export default function App() {
  const { go, close, location } = useAppNav();
  const [searchParams] = useSearchParams();
  const route = parseRoute(location.pathname);

  // ── UI state ──
  const [tab, setTab] = useState('Marketplace');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('recent');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !safeStorage.get('campusflip_onboarded'));
  const [contactIntent, setContactIntent] = useState(null);
  const [contactReplayToken, setContactReplayToken] = useState(0);
  const [contactReplyId, setContactReplyId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const pendingContact = useRef(null);
  const returnTo = useRef(null);       // where to go after signing in
  const lastTab = useRef('Home');      // keeps the bottom-nav highlight on listing/search/post screens

  const ping = useCallback((message, type = 'success') => setToast({ id: Date.now(), message, type }), []);

  // ── Data ──
  const { session, authReady, isAdmin, adminReady, avatar, refreshAvatar } = useSession({
    onPasswordRecovery: () => go(PATHS.resetPassword, { replace: true }),
  });
  const userId = session?.user?.id;

  const feed = useFeed({ tab, cat, sort, onError: message => ping(message, 'error') });
  const { items, itemsRef, loading, reload } = feed;
  const online = useOnline();
  const wasOffline = useRef(false);

  // When the connection returns, refresh the feed by itself (no page reload).
  useEffect(() => {
    if (!online) { wasOffline.current = true; return; }
    if (wasOffline.current) { wasOffline.current = false; reload(); }
  }, [online, reload]);
  const { deals, refresh: refreshDeals } = useFlashDeals();
  const { saved, toggle: toggleSave } = useSavedListings(userId, {
    onNeedAuth: () => setShowAuth(true),
    onToast: ping,
  });

  useMarketplaceLive({
    itemsRef,
    onFeedChange: () => setPendingUpdates(v => v + 1),
    onDealsChange: refreshDeals,
  });

  const refreshFeed = useCallback(() => { setPendingUpdates(0); reload(); refreshDeals(); }, [reload, refreshDeals]);
  const handleListingCreated = useCallback(listing => {
    refreshFeed();
    ping(listing.status === 'pending_payment' ? 'Post created. Complete payment to publish it.' : 'Your post is now live!');
  }, [refreshFeed, ping]);

  // "Verified only" needs seller data fetched separately, so it filters loaded rows.
  const shown = useMemo(
    () => (verifiedOnly ? items.filter(item => item.isVerified === true) : items),
    [items, verifiedOnly]
  );

  // Keep fetching pages while "Verified only" would otherwise show an almost-empty list.
  const verifiedAutoPages = useRef(0);
  useEffect(() => { verifiedAutoPages.current = 0; }, [verifiedOnly, tab, cat, sort]);
  useEffect(() => {
    if (!verifiedOnly || loading || feed.loadingMore || !feed.hasMore) return;
    if (shown.length >= 12 || verifiedAutoPages.current >= 5) return;
    verifiedAutoPages.current += 1;
    feed.loadMore();
  }, [verifiedOnly, loading, feed, shown.length]);

  // ── Splash: gone once the first listings arrive, never later than 2.5 s ──
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowSplash(false), 250);
      return () => clearTimeout(timer);
    }
    const cap = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(cap);
  }, [loading]);

  // ── Routing ──
  const requireAuth = useCallback((path) => {
    returnTo.current = path || null;
    setShowAuth(true);
  }, []);

  // Old share links (/?listing=<id>) become /listing/<id>.
  const legacyListing = searchParams.get('listing');
  useEffect(() => {
    if (legacyListing) go(PATHS.listing(legacyListing), { replace: true });
  }, [legacyListing, go]);

  // Guards: private screens need a session, admin needs admin, unknown paths go home.
  useEffect(() => {
    if (!authReady) return;
    if (route.name === 'notFound') {
      go(PATHS.home, { replace: true });
      ping('That page does not exist.', 'error');
    } else if (route.isPrivate && !session) {
      go(PATHS.home, { replace: true });
      requireAuth(location.pathname);
    } else if (route.name === 'admin' && session && adminReady && !isAdmin) {
      go(PATHS.home, { replace: true });
    } else if (route.name === 'resetPassword' && !session) {
      go(PATHS.home, { replace: true });
    }
  }, [authReady, adminReady, isAdmin, session, route.name, route.isPrivate, location.pathname, go, ping, requireAuth]);

  // A listing URL loads its listing (from the feed if we have it, otherwise the server).
  const listingId = route.name === 'listing' ? route.params.id : null;
  const selectedRef = useRef(null);
  selectedRef.current = selectedListing;
  const dealsRef = useRef(deals);
  dealsRef.current = deals;
  useEffect(() => {
    if (!listingId) { setSelectedListing(null); return undefined; }
    if (selectedRef.current?.id === listingId) return undefined;
    let cancelled = false;
    (async () => {
      const known = itemsRef.current.find(i => i.id === listingId)
        || dealsRef.current.find(d => d.id === listingId);
      const listing = known || await fetchListingById(listingId);
      if (cancelled) return;
      if (!listing) {
        ping('This listing is no longer available.', 'error');
        go(PATHS.home, { replace: true });
        return;
      }
      setSelectedListing(listing);
    })();
    return () => { cancelled = true; };
  }, [listingId, itemsRef, go, ping]);

  const openListing = useCallback((item) => {
    setSelectedListing(item);
    go(PATHS.listing(item.id));
  }, [go]);

  // Invite links remember their code until the person signs in.
  useEffect(() => {
    if (route.name === 'invite') safeStorage.set('campusflip_invite_code', route.params.code);
  }, [route.name, route.params.code]);

  const mainTab = navItemFor(route.name);
  if (['Saved', 'My Shop', 'Profile'].includes(mainTab) || route.name === 'home') lastTab.current = mainTab;
  const currentNav = ['listing', 'search', 'post'].includes(route.name) ? lastTab.current : mainTab;

  function selectNav(name) {
    const path = NAV_PATHS[name];
    if (name !== 'Home' && !session) { requireAuth(path); return; }
    if (path === location.pathname) return;
    go(path);
  }

  function openPost() {
    if (!session) { requireAuth(PATHS.post); return; }
    go(PATHS.post);
  }

  async function handleSignOut() {
    go(PATHS.home, { replace: true });
    await disablePush();
    const { error } = await supabase.auth.signOut();
    if (error) { ping(error.message, 'error'); return; }
    ping('You have signed out.');
  }

  // One-time welcome bonus for verified KUHeS emails. Runs for any signed-in session,
  // so it also fires when the student returns after clicking the email-verification link.
  const bonusTried = useRef('');
  const bonusUserId = session?.user?.id;
  useEffect(() => {
    if (!bonusUserId || bonusTried.current === bonusUserId) return;
    bonusTried.current = bonusUserId;
    supabase.rpc('claim_welcome_bonus').then(({ data, error }) => {
      if (!error && data?.success) {
        ping(`Welcome to CampusFlip! ${data.bonus} free listings (MK ${data.bonus * 200}) have been added to your account.`);
        window.dispatchEvent(new Event('cf:profile-changed'));   // lets the Account page show the new balance now
      }
    });
  }, [bonusUserId, ping]);

  useEffect(() => { setMonitoringUser(bonusUserId || null); }, [bonusUserId]);

  async function handleAuthenticated() {
    setShowAuth(false);

    const code = safeStorage.get('campusflip_invite_code');
    if (code) {
      const { data, error } = await supabase.rpc('claim_referral', { p_code: code });
      ping(!error && data?.success ? 'Welcome! Your MK 200 referral credit is ready.' : 'Welcome to CampusFlip!');
      window.dispatchEvent(new Event('cf:profile-changed'));
      safeStorage.remove('campusflip_invite_code');
    } else {
      ping('Welcome to CampusFlip!');
    }

    const destination = returnTo.current;
    returnTo.current = null;
    if (destination && destination !== PATHS.home) go(destination);

    const pending = pendingContact.current;
    if (pending) {
      setContactReplyId(pending.replyId || null);
      setTimeout(() => {
        setContactReplayToken(t => t + 1);
        pendingContact.current = null;
      }, 250);
    }
  }

  function handleProceedToAuth(replyId) {
    pendingContact.current = { ...contactIntent, replyId: replyId || null };
    setContactIntent(null);
    setTimeout(() => setShowAuth(true), 50);
  }

  function completeOnboarding() {
    safeStorage.set('campusflip_onboarded', 'true');
    setShowOnboarding(false);
  }

  // ── Full-page routes ──
  if (route.name === 'resetPassword' && session) {
    return <ResetPasswordPage onToast={ping} onComplete={() => go(PATHS.home, { replace: true })} />;
  }

  if (route.name === 'invite') {
    return (
      <InvitePage
        code={route.params.code}
        onEnter={() => {
          go(PATHS.home, { replace: true });
          if (!session) setShowAuth(true);
        }}
      />
    );
  }

  const totalListings = feed.totalActive ?? items.length;

  return (
    <>
      <AnimatePresence>
        {showOnboarding && <Onboarding key="onboarding" onComplete={completeOnboarding} />}
      </AnimatePresence>
      <Splash show={showSplash} />

      <OfflineBanner online={online} />

      <div className="shell">
        <AppHeader
          session={session}
          avatar={avatar}
          current={currentNav}
          onSelectNav={selectNav}
          onOpenAccount={() => (session ? go(PATHS.account) : setShowAuth(true))}
          onSignIn={() => setShowAuth(true)}
          onOpenListing={id => id && go(PATHS.listing(id))}
        />

        <main className="cf-app-main">
          {deals.length
            ? <FlashDeals deals={deals} onOpen={openListing} />
            : <HomeGreeting session={session} totalListings={totalListings} onNewListing={openPost} />}
          <SearchBar
            onOpen={() => go(PATHS.search)}
            onFilters={() => setShowFilters(true)}
            filtersActive={verifiedOnly || sort !== 'recent'}
          />
          <FilterBar cat={cat} onCat={setCat} />
          <FilterSheet
            open={showFilters} onClose={() => setShowFilters(false)}
            verifiedOnly={verifiedOnly} onVerified={setVerifiedOnly}
            sort={sort} onSort={setSort}
          />
          <Feed
            tab={tab}
            onTab={next => { setTab(next); setCat('All'); }}
            items={shown}
            loading={loading}
            error={feed.error}
            hasMore={feed.hasMore}
            loadingMore={feed.loadingMore}
            pendingUpdates={pendingUpdates}
            flashDeals={deals}
            saved={saved}
            onSave={toggleSave}
            onOpen={openListing}
            onLoadMore={feed.loadMore}
            onRefresh={refreshFeed}
            onClearFilters={() => { setCat('All'); setVerifiedOnly(false); }}
            offlineCopy={feed.offlineCopy}
            onRetry={reload}
          />
          {!session && <JoinBanner onSignUp={() => setShowAuth(true)} />}
        </main>

        <motion.button whileTap={{ scale: 0.94 }} className="post cf-post-button" onClick={openPost}>
          <Plus /><span>Post</span>
        </motion.button>

        <BottomNav current={currentNav} onSelect={selectNav} />
        <ToastViewport toast={toast} onDismiss={() => setToast(null)} />
        <InstallPrompt onOpenDownload={() => go(PATHS.download)} />

        <AuthModal
          open={showAuth}
          onClose={() => { setShowAuth(false); returnTo.current = null; }}
          onToast={ping}
          onAuthenticated={handleAuthenticated}
        />

        <Overlays
          route={route}
          session={session}
          isAdmin={isAdmin}
          items={items}
          saved={saved}
          onSave={toggleSave}
          selectedListing={selectedListing}
          openListing={openListing}
          goBack={close}
          go={go}
          onToast={ping}
          onSignOut={handleSignOut}
          onSignedOut={() => go(PATHS.home, { replace: true })}
          onAvatarChanged={refreshAvatar}
          onListingCreated={handleListingCreated}
          onRequireAuth={setContactIntent}
          contactReplayToken={contactReplayToken}
          contactReplyId={contactReplyId}
        />

        <AnimatePresence>
          {contactIntent && (
            <ContactSellerModal
              open={!!contactIntent}
              seller={contactIntent.seller}
              listing={{ title: contactIntent.title, image: contactIntent.image, spotName: contactIntent.spotName }}
              onProceed={handleProceedToAuth}
              onClose={() => setContactIntent(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
