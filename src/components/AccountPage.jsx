import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cfImage } from '../lib/cloudinary';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ShieldCheck, LogOut, UserRound, Bell, Lock, Shield,
  Gift, Copy, Share2, Check, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './account-pages.css';
import './account-clean.css';

function SettingsRow({ icon: Icon, title, description, onClick }) {
  return (
    <button type="button" className="cf-acct-row" onClick={onClick}>
      <span className="cf-acct-row-icon"><Icon size={18} /></span>
      <span className="cf-acct-row-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ChevronRight size={18} className="cf-acct-row-arrow" />
    </button>
  );
}

export default function AccountPage({
  session,
  onBack,
  onOpenSettings,
  onSignOut,
  onOpenAdmin,
  onOpenInfo,
  isAdmin,
  onOpenNotifications,
  onOpenPrivacy,
}) {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refStats, setRefStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [listingCount, setListingCount] = useState(0);
  const copyTimerRef = useRef(null);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    const [profileRes, listingsRes, refRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, business_name, avatar_url, is_verified, shop_plan_expires_at, created_at')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', session.user.id)
        .eq('status', 'active'),
      supabase.rpc('get_referral_stats'),
    ]);

    if (!profileRes.error) setProfile(profileRes.data || null);
    if (!listingsRes.error) setListingCount(listingsRes.count || 0);
    if (refRes.data?.success) setRefStats(refRes.data);
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session?.user?.id) {
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      await loadProfile();
      if (!cancelled) setProfileLoading(false);
    })();

    return () => { cancelled = true; };
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`account-live:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        () => loadProfile()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${session.user.id}`,
        },
        () => loadProfile()
      )
      .subscribe();

    const poll = setInterval(() => loadProfile(), 45000);

    // Refresh straight away when the bonus is claimed, or when the student comes back to the app.
    const refresh = () => loadProfile();
    const onVisible = () => { if (document.visibilityState === 'visible') loadProfile(); };
    window.addEventListener('cf:profile-changed', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      window.removeEventListener('cf:profile-changed', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session?.user?.id, loadProfile]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function copyInviteLink() {
    if (!refStats?.code) return;

    const url = `${window.location.origin}/invite/${refStats.code}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);

      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard permissions may be unavailable in some browsers.
    }
  }

  async function shareInvite() {
    if (!refStats?.code) return;

    const url = `${window.location.origin}/invite/${refStats.code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CampusFlip',
          text: 'Get MK 200 off your first listing on CampusFlip.',
          url,
        });
      } catch {
        // Sharing can be cancelled by the user.
      }
    } else {
      copyInviteLink();
    }
  }

  const shopPlanExpiry = profile?.shop_plan_expires_at
    ? new Date(profile.shop_plan_expires_at)
    : null;

  const shopPlanActive = Boolean(
    profile?.is_verified &&
    shopPlanExpiry &&
    shopPlanExpiry.getTime() > Date.now()
  );

  const displayName =
    profile?.display_name ||
    session?.user?.user_metadata?.display_name ||
    'CampusFlip Member';

  const businessName = profile?.business_name?.trim();

  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const memberSince = useMemo(() => {
    const created = profile?.created_at || session?.user?.created_at;
    if (!created) return null;

    return new Date(created).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    });
  }, [profile?.created_at, session?.user?.created_at]);

  const referralCode = refStats?.code;

  if (profileLoading) {
    return (
      <main className="cf-account-page cf-account-loading">
        <span className="cf-block-loader" />
        <span>Preparing your account...</span>
      </main>
    );
  }


  const verified = shopPlanActive;
  const credits = refStats?.credits || 0;
  const referrals = refStats?.referrals || 0;

  return (
    <main className="cf-account-page cf-acct">
      <header className="cf-acct-top">
        <button type="button" className="cf-acct-back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={19} />
        </button>
        <h1>Account</h1>
      </header>

      <section className="cf-acct-card cf-acct-profile">
        <div className="cf-acct-avatar">
          {profile?.avatar_url
            ? <img src={cfImage(profile.avatar_url, 240)} alt={`${displayName}'s profile`} />
            : <span>{initials}</span>}
        </div>
        <div className="cf-acct-id">
          <h2>
            {displayName}
            {verified && <ShieldCheck size={16} className="cf-acct-verified" aria-label="Verified seller" />}
          </h2>
          <p>{businessName || session?.user?.email}</p>
          <small>Member since {memberSince || '—'}</small>
        </div>
        <button type="button" className="cf-acct-edit" onClick={onOpenSettings}>Edit</button>
      </section>

      <section className="cf-acct-stats" aria-label="Your activity">
        <div><strong>{listingCount}</strong><span>Live listings</span></div>
        <div><strong>{referrals}</strong><span>Friends invited</span></div>
        <div><strong>{credits}</strong><span>Free listings</span></div>
      </section>

      {refStats && referralCode && (
        <section className="cf-acct-card cf-acct-invite">
          <span className="cf-acct-invite-icon"><Gift size={20} /></span>
          <div className="cf-acct-invite-copy">
            <strong>Invite friends, earn free listings</strong>
            <small>campusflip.app/invite/{referralCode}</small>
          </div>
          <div className="cf-acct-invite-actions">
            <button type="button" onClick={copyInviteLink} className={copied ? 'is-copied' : ''}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={shareInvite} aria-label="Share invitation">
              <Share2 size={15} /> Share
            </button>
          </div>
        </section>
      )}

      <section className="cf-acct-card cf-acct-list" aria-label="Settings">
        <SettingsRow icon={UserRound} title="Personal details" description="Name, photo and shop contact" onClick={onOpenSettings} />
        <SettingsRow icon={Bell} title="Notifications" description="Choose which updates you get" onClick={onOpenNotifications} />
        <SettingsRow icon={Lock} title="Privacy & security" description="Password and account protection" onClick={onOpenPrivacy} />
        {isAdmin && (
          <SettingsRow icon={Shield} title="Admin dashboard" description="Reports, users and platform activity" onClick={onOpenAdmin} />
        )}
      </section>

      <nav className="cf-acct-links" aria-label="About CampusFlip">
        <button type="button" onClick={() => onOpenInfo?.('/help')}>Help</button>
        <button type="button" onClick={() => onOpenInfo?.('/download')}>Get the app</button>
        <button type="button" onClick={() => onOpenInfo?.('/privacy-policy')}>Privacy Policy</button>
        <button type="button" onClick={() => onOpenInfo?.('/terms')}>Terms</button>
      </nav>

      <button type="button" className="cf-acct-signout" onClick={onSignOut}>
        <LogOut size={16} /> Sign out
      </button>
    </main>
  );
}
