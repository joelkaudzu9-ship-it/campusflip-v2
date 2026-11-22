import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** The signed-in user's saved listing ids, with an optimistic toggle. */
export function useSavedListings(userId, { onNeedAuth, onToast }) {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId || !supabase) { setSaved([]); return; }
      const { data } = await supabase.from('saved_listings').select('listing_id').eq('user_id', userId);
      if (!cancelled) setSaved((data || []).map(row => row.listing_id));
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const toggle = useCallback(async (id) => {
    if (!userId) { onToast?.('Please sign in to save listings.', 'error'); onNeedAuth?.(); return; }
    const already = saved.includes(id);
    setSaved(cur => already ? cur.filter(i => i !== id) : [...cur, id]);

    const query = supabase.from('saved_listings');
    const { error } = already
      ? await query.delete().eq('user_id', userId).eq('listing_id', id)
      : await query.insert({ user_id: userId, listing_id: id });

    if (error) {
      setSaved(cur => already ? [...new Set([...cur, id])] : cur.filter(i => i !== id));
      onToast?.('Could not update saved listings.', 'error');
      return;
    }
    onToast?.(already ? 'Removed from saved items' : 'Added to saved items');
  }, [userId, saved, onNeedAuth, onToast]);

  return { saved, toggle };
}
