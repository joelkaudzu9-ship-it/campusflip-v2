import { lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AnimatedModal } from './MotionUI';
import PageTransition from './PageTransition';
import Guard from './Guard';
import { useEverTrue } from '../hooks/useEverTrue';
import { PATHS } from '../lib/routes';

// Rarely-used screens load on demand so the home feed ships less JavaScript.
const AccountSettings = lazy(() => import('./AccountSettings'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const SavedItemsPage = lazy(() => import('./SavedItemsPage'));
const AccountPage = lazy(() => import('./AccountPage'));
const NotificationPreferences = lazy(() => import('./NotificationPreferences'));
const PrivacySecurity = lazy(() => import('./PrivacySecurity'));
const SearchPage = lazy(() => import('./SearchPage'));
const MyShop = lazy(() => import('./MyShop'));
const PostListingModal = lazy(() => import('./PostListingModal'));
const ListingDetails = lazy(() => import('./ListingDetails'));
const InfoPages = lazy(() => import('./InfoPages'));
const INFO_ROUTES = ['download', 'help', 'privacyPolicy', 'terms'];

const ACCOUNT_ROUTES = ['account', 'settings', 'notifications', 'privacy'];

/**
 * Every full-screen layer that sits on top of the home feed. Which one is open
 * is decided by the URL (`route.name`), so each has a real, refreshable address.
 */
export default function Overlays({
  route, session, isAdmin, items, saved, onSave,
  selectedListing, openListing, goBack, go,
  onToast, onSignOut, onSignedOut, onAvatarChanged, onListingCreated,
  onRequireAuth, contactReplayToken, contactReplyId,
}) {
  const name = route.name;
  const signedIn = Boolean(session);
  const postMounted = useEverTrue(name === 'post');
  const listingMounted = useEverTrue(name === 'listing');

  const backToAccount = () => goBack(PATHS.account);

  return (
    <>
      <AnimatedModal
        open={name === 'settings' && signedIn}
        onClose={() => { onAvatarChanged(); backToAccount(); }}
        className="cf-account-modal"
      >
        <Guard onClose={backToAccount}>
          <AccountSettings
            session={session}
            onClose={() => { onAvatarChanged(); backToAccount(); }}
            onBack={backToAccount}
            onToast={onToast}
          />
        </Guard>
      </AnimatedModal>

      <AnimatePresence>
        {ACCOUNT_ROUTES.includes(name) && signedIn && (
          <PageTransition key="account-page" onBack={() => goBack()}>
            <Guard onClose={() => goBack()}>
              <AccountPage
                session={session}
                onBack={() => goBack()}
                onOpenSettings={() => go(PATHS.settings)}
                onOpenNotifications={() => go(PATHS.notifications)}
                onOpenPrivacy={() => go(PATHS.privacy)}
                onSignOut={onSignOut}
                onOpenAdmin={() => go(PATHS.admin)}
                onOpenInfo={path => go(path)}
                isAdmin={isAdmin}
              />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {name === 'notifications' && signedIn && (
          <PageTransition key="notif-prefs" onBack={backToAccount}>
            <Guard onClose={backToAccount}>
              <NotificationPreferences session={session} onBack={backToAccount} onToast={onToast} />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {name === 'privacy' && signedIn && (
          <PageTransition key="privacy" onBack={backToAccount}>
            <Guard onClose={backToAccount}>
              <PrivacySecurity
                session={session}
                onBack={backToAccount}
                onSignOut={onSignedOut}
                onToast={onToast}
              />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {name === 'saved' && signedIn && (
          <PageTransition key="saved-page" onBack={() => goBack()}>
            <Guard onClose={() => goBack()}>
              <SavedItemsPage
                session={session}
                onBack={() => goBack()}
                onOpenListing={openListing}
                onToast={onToast}
              />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {name === 'shop' && signedIn && (
          <PageTransition key="my-shop" onBack={() => goBack()}>
            <Guard onClose={() => goBack()}>
              <MyShop
                session={session}
                onBack={() => goBack()}
                onPostAnother={() => go(PATHS.post)}
                onToast={onToast}
              />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {name === 'admin' && signedIn && isAdmin && (
          <PageTransition key="admin-dashboard" onBack={() => goBack(PATHS.account)}>
            <Guard onClose={() => goBack(PATHS.account)}>
              <AdminDashboard onBack={() => goBack(PATHS.account)} onToast={onToast} />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {INFO_ROUTES.includes(name) && (
          <PageTransition key="info-page" onBack={() => goBack()}>
            <Guard onClose={() => goBack()}>
              <InfoPages page={name} onBack={() => goBack()} onGo={path => go(path)} />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {name === 'search' && (
          <PageTransition key="search-page" onBack={() => goBack()}>
            <Guard onClose={() => goBack()}>
              <SearchPage
                items={items}
                saved={saved}
                onSave={onSave}
                onOpenListing={openListing}
                onBack={() => goBack()}
              />
            </Guard>
          </PageTransition>
        )}
      </AnimatePresence>

      {postMounted && (
        <Guard silent onClose={() => goBack()}>
          <PostListingModal
            open={name === 'post' && signedIn}
            onClose={() => goBack()}
            session={session}
            onCreated={onListingCreated}
          />
        </Guard>
      )}

      {listingMounted && (
        <Guard silent onClose={() => goBack()}>
          <ListingDetails
            listing={name === 'listing' ? selectedListing : null}
            onClose={() => goBack()}
            onToast={onToast}
            onRequireAuth={onRequireAuth}
            replayToken={contactReplayToken}
            replyId={contactReplyId}
          />
        </Guard>
      )}
    </>
  );
}
