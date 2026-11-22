import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cfImage } from '../lib/cloudinary';
import { clearPrivateCaches } from '../lib/privateCaches';

/**
 * Auth state for the whole app.
 *  authReady  – false until Supabase has told us whether someone is signed in
 *  adminReady – false until we know whether that person is an admin
 */
export function useSession({ onPasswordRecovery } = {}) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckedFor, setAdminCheckedFor] = useState(null);
  const [avatar, setAvatar] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    if (!supabase) return undefined;

    clearPrivateCaches();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(next);
        setAuthReady(true);
        onPasswordRecovery?.();
        return;
      }
      if (event === 'SIGNED_OUT') clearPrivateCaches();
      setSession(next);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userId = session?.user?.id;
  // Not ready from the moment someone signs in until the admin check for *them* has finished.
  const adminReady = !userId || adminCheckedFor === userId;

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!userId || !supabase) { setIsAdmin(false); setAdminCheckedFor(null); return; }
      // is_admin is a private column: ask the server-side is_admin() function instead.
      const rpc = await supabase.rpc('is_admin');
      let admin;
      if (!rpc.error) {
        admin = rpc.data === true;
      } else {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
        admin = data?.is_admin === true;
      }
      if (!cancelled) { setIsAdmin(admin); setAdminCheckedFor(userId); }
    }
    check();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId || !supabase) { setAvatar(''); return; }
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
      if (!cancelled) setAvatar(cfImage(data?.avatar_url, 128) || '');
    }
    load();
    return () => { cancelled = true; };
  }, [userId, avatarVersion]);

  const refreshAvatar = useCallback(() => setAvatarVersion(v => v + 1), []);

  return { session, authReady, isAdmin, adminReady, avatar, refreshAvatar };
}
