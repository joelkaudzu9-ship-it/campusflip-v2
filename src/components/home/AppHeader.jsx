import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserRound } from 'lucide-react';
import NotificationCenter from '../NotificationCenter';
import { NAV_ITEMS } from './BottomNav';

export default function AppHeader({ session, avatar, current, onSelectNav, onOpenAccount, onSignIn, onOpenListing }) {
  return (
    <header className="top cf-header">
      <Link className="brand cf-brand" to="/" aria-label="CampusFlip home">
        <span className="mark">CF</span>
        <span><b>Campus<span>Flip</span></b><small>Buy. Sell. <em>Meet.</em></small></span>
      </Link>
      <nav className="cf-top-nav" aria-label="Main">
        {NAV_ITEMS.map(([name, Icon]) => (
          <button
            key={name}
            type="button"
            className={current === name ? 'current' : ''}
            aria-current={current === name ? 'page' : undefined}
            onClick={() => onSelectNav(name)}
          >
            <Icon size={17} /> {name}
          </button>
        ))}
      </nav>
      <div className="actions">
        <NotificationCenter
          session={session}
          onOpenListing={onOpenListing}
        />
        {session && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          className="avatar"
          onClick={onOpenAccount}
          aria-label={session ? 'Open account' : 'Sign in'}
          style={{ padding: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}
        >
          {avatar ? (
            <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          ) : (
            session?.user?.email?.[0]?.toUpperCase() || <UserRound size={18} aria-hidden="true" />
          )}
        </motion.button>
        )}
        {!session && (
          <button type="button" className="cf-signin-btn" onClick={onSignIn}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
