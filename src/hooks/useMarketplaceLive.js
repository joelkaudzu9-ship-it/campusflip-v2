import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Realtime changes. Deal changes refresh quietly; feed changes only call
 * onFeedChange so the UI can offer a "new listings" pill instead of jumping.
 */
export function useMarketplaceLive({ itemsRef, onFeedChange, onDealsChange }) {
  const timers = useRef({});
  const handlers = useRef({ onFeedChange, onDealsChange });
  handlers.current = { onFeedChange, onDealsChange };

  useEffect(() => {
    if (!supabase) return undefined;

    const debounce = (kind, fn) => {
      if (timers.current[kind]) clearTimeout(timers.current[kind]);
      timers.current[kind] = setTimeout(() => { timers.current[kind] = null; fn?.(); }, 600);
    };

    const channel = supabase
      .channel('public:marketplace-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, (payload) => {
        // views_count bumps fire an UPDATE per view; only react to changes that alter the feed:
        // a listing we don't have becoming active, or one we have leaving 'active'.
        const row = payload.new || {};
        const id = row.id || payload.old?.id;
        const known = itemsRef.current.some(item => item.id === id);
        if (payload.eventType === 'DELETE') {
          if (known) debounce('listings', () => handlers.current.onFeedChange?.());
          return;
        }
        if ((row.status === 'active' && !known) || (row.status !== 'active' && known)) {
          debounce('listings', () => handlers.current.onFeedChange?.());
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_deals' },
        () => debounce('deals', () => handlers.current.onDealsChange?.()))
      .subscribe();

    const pending = timers.current;
    return () => {
      supabase.removeChannel(channel);
      Object.values(pending).forEach(t => t && clearTimeout(t));
    };
  }, [itemsRef]);
}
