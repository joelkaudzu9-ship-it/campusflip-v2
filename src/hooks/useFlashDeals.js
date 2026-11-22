import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchFlashDeals } from '../lib/listings';

/** Running flash deals; refreshes itself right after the next one expires. */
export function useFlashDeals(reloadSignal = 0) {
  const [deals, setDeals] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let cancelled = false;
    fetchFlashDeals()
      .then(list => { if (!cancelled) setDeals(list); })
      .catch(err => { console.error('Flash deals error:', err.message); if (!cancelled) setDeals([]); });
    return () => { cancelled = true; };
  }, [reloadSignal, refreshKey]);

  useEffect(() => {
    if (!deals.length) return undefined;
    const nextExpiry = Math.min(...deals.map(d => new Date(d.endsAt).getTime()));
    const delay = Math.max(nextExpiry - Date.now(), 0) + 1000;
    const timer = setTimeout(() => setRefreshKey(v => v + 1), delay);
    return () => clearTimeout(timer);
  }, [deals]);

  const refresh = useCallback(() => setRefreshKey(v => v + 1), []);
  return { deals, refresh };
}
