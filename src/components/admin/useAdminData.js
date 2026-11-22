import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

/** All data and actions for the admin console: stats, reports, users, live refresh. */
export function useAdminData({ onToast }) {
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Admin-only user list via RPC (includes private email/phone). Falls back to a direct
  // select until the security migration has been applied.
  async function loadAdminUsers() {
    const rpc = await supabase.rpc('admin_list_profiles');
    if (!rpc.error) return { data: rpc.data || [], error: null };
    if (!/could not find the function|does not exist/i.test(rpc.error.message || '')) return rpc;
    return supabase
      .from('profiles')
      .select('id, display_name, business_name, is_verified, email, phone, created_at, avatar_url')
      .order('created_at', { ascending: false });
  }

  // ── Stable loadAll wrapped in useCallback ────────────────────────────────
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');

    const [statsRes, reportsRes, usersRes] = await Promise.all([
      supabase.rpc('admin_dashboard_stats'),
      supabase
        .from('reports')
        .select(`
          id, reason, details, status, created_at, reporter_id,
          listings(id, title, seller_id),
          profiles(display_name)
        `)
        .order('created_at', { ascending: false }),
      loadAdminUsers(),
    ]);

    if (statsRes.error) {
      console.error('Analytics failed:', statsRes.error.message, statsRes.error.details);
      if (!silent) setError(`Analytics failed: ${statsRes.error.message}`);
    } else {
      setAnalytics(statsRes.data);
    }

    // Email/phone are private columns: reporter contact details come from the admin-only user list.
    const usersById = new Map((usersRes.data || []).map(u => [u.id, u]));
    if (!reportsRes.error && reportsRes.data) {
      reportsRes.data = reportsRes.data.map(r => ({
        ...r,
        profiles: { ...(r.profiles || {}), ...(usersById.get(r.reporter_id) || {}) },
      }));
    }

    if (reportsRes.error) {
      console.error('Reports failed:', reportsRes.error.message, reportsRes.error.details);
      if (!silent) setError(prev => prev || `Reports failed: ${reportsRes.error.message}`);
    } else {
      setReports(reportsRes.data || []);
    }

    if (usersRes.error) {
      console.error('Users failed:', usersRes.error.message, usersRes.error.details);
      if (!silent) setError(prev => prev || `Users failed: ${usersRes.error.message}`);
    } else {
      setUsers(usersRes.data || []);
    }

    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Realtime subscriptions + 60s fallback poll ──────────────────────────
  useEffect(() => {
    // Listings change on every view (views_count), so coalesce bursts into one refresh.
    let debounce = null;
    const refreshSoon = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => loadAll(true), 3000);
    };
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, refreshSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refreshSoon)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, refreshSoon)
      .subscribe();

    const poll = setInterval(() => loadAll(true), 60000);

    return () => {
      supabase.removeChannel(channel);
      if (debounce) clearTimeout(debounce);
      clearInterval(poll);
    };
  }, [loadAll]);
  // ─────────────────────────────────────────────────────────────────────────

  async function handleRemoveListing(listingId, reportId) {
    if (!listingId) { onToast?.('Listing already deleted.', 'error'); return; }
    setActionLoading(reportId);

    const { error: r1 } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    const { error: r2 } = await supabase.from('listings').update({ status: 'removed' }).eq('id', listingId);

    if (r1 || r2) onToast?.(`Failed: ${(r1 || r2).message}`, 'error');
    else { onToast?.('Listing removed and report resolved.'); await loadAll(); }
    setActionLoading(null);
  }

  async function handleDismissReport(reportId) {
    setActionLoading(reportId);
    const { error: r } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    if (r) onToast?.(`Failed: ${r.message}`, 'error');
    else { onToast?.('Report dismissed.'); await loadAll(); }
    setActionLoading(null);
  }

  async function toggleVerification(userId, currentStatus) {
    setActionLoading(userId);
    // Preferred: admin-only RPC (profiles are not directly writable for this column).
    let { error: e } = await supabase.rpc('admin_set_verified', { p_user_id: userId, p_verified: !currentStatus });
    if (e && /could not find the function|does not exist/i.test(e.message || '')) {
      ({ error: e } = await supabase.from('profiles').update({ is_verified: !currentStatus }).eq('id', userId));
    }
    if (e) onToast?.(`Failed: ${e.message}`, 'error');
    else { onToast?.(currentStatus ? 'Verification removed.' : 'Seller verified.'); await loadAll(); }
    setActionLoading(null);
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.business_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return {
    analytics, reports, users, filteredUsers, loading, error, actionLoading,
    userSearch, setUserSearch, pendingCount,
    removeListing: handleRemoveListing,
    dismissReport: handleDismissReport,
    toggleVerification,
  };
}
