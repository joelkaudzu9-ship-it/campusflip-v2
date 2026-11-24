import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { PAGE_SIZE, fetchActiveCount, fetchListingsPage } from '../lib/listings';
import { safeStorage } from '../lib/safeStorage';
import { friendlyError, isNetworkError } from '../lib/errors';

// The last public feed is kept on the phone so it can still be shown with no signal.
// Only public listing data is stored here, never anything private.
const CACHE_KEY = 'cf_feed_cache_v1';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function saveFeedCache(key, items) {
  safeStorage.set(CACHE_KEY, JSON.stringify({ key, savedAt: Date.now(), items: items.slice(0, 24) }));
}

function loadFeedCache(key) {
  try {
    const cached = JSON.parse(safeStorage.get(CACHE_KEY) || 'null');
    if (!cached || cached.key !== key || Date.now() - cached.savedAt > CACHE_MAX_AGE) return null;
    return Array.isArray(cached.items) && cached.items.length ? cached.items : null;
  } catch {
    return null;
  }
}

/** The paged home feed for a tab / category / sort, plus the live total. */
export function useFeed({ tab, cat, sort, onError }) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [totalActive, setTotalActive] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [offlineCopy, setOfflineCopy] = useState(false);
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
      // Phone says there is no connection: show the saved copy straight away instead of waiting
      // for the request to time out.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const saved = loadFeedCache(`${tab}|${cat}|${sort}`);
        if (saved) {
          setItems(saved);
          setHasMore(false);
          setOfflineCopy(true);
          setError('');
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setError('');
      try {
        const page = await fetchListingsPage(0, tab, cat, sort);
        if (cancelled) return;
        setItems(page);
        setHasMore(page.length === PAGE_SIZE);
        setOfflineCopy(false);
        if (page.length) saveFeedCache(`${tab}|${cat}|${sort}`, page);
      } catch (err) {
        if (cancelled) return;
        const cached = isNetworkError(err) ? loadFeedCache(`${tab}|${cat}|${sort}`) : null;
        if (cached) {
          setItems(cached);
          setHasMore(false);
          setOfflineCopy(true);
        } else {
          setError(friendlyError(err, 'Could not load listings.'));
          setItems([]);
          setOfflineCopy(false);
        }
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

  return { items, itemsRef, hasMore, loading, loadingMore, error, offlineCopy, totalActive, loadMore, reload };
}
