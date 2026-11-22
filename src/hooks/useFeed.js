import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { PAGE_SIZE, fetchActiveCount, fetchListingsPage } from '../lib/listings';

/** The paged home feed for a tab / category / sort, plus the live total. */
export function useFeed({ tab, cat, sort, onError }) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [totalActive, setTotalActive] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const itemsRef = useRef([]);

  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const page = await fetchListingsPage(0, tab, cat, sort);
        if (cancelled) return;
        setItems(page);
        setHasMore(page.length === PAGE_SIZE);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Could not load listings.'); setItems([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab, cat, sort, reloadKey]);

  // Real total of active listings (the loaded page is capped at PAGE_SIZE).
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let cancelled = false;
    fetchActiveCount().then(count => { if (!cancelled && count !== null) setTotalActive(count); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchListingsPage(itemsRef.current.length, tab, cat, sort);
      setItems(prev => {
        const seen = new Set(prev.map(item => item.id));
        return [...prev, ...page.filter(item => !seen.has(item.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      console.error('Load more failed:', err);
      onError?.('Could not load more listings.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, tab, cat, sort, onError]);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  return { items, itemsRef, hasMore, loading, loadingMore, error, totalActive, loadMore, reload };
}
