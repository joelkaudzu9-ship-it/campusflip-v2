import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { springPhysics } from '../../lib/motion';

/** The slim card at the top of Home: a greeting, the free-listing balance and the one action sellers need. */
export default function HomeGreeting({ session, totalListings, onNewListing }) {
  const userId = session?.user?.id;
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!userId || !supabase) { setName(''); setCredits(null); return undefined; }
    let alive = true;
    async function load() {
      const [{ data: profile }, { data: stats }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
        supabase.rpc('get_referral_stats'),
      ]);
      if (!alive) return;
      setName(String(profile?.display_name || '').trim().split(/\s+/)[0] || '');
      setCredits(stats?.success ? Number(stats.credits) || 0 : null);
    }
    load();
    window.addEventListener('cf:profile-changed', load);
    return () => { alive = false; window.removeEventListener('cf:profile-changed', load); };
  }, [userId]);

  return (
    <motion.section
      className="cf-greeting"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springPhysics, delay: 0.04 }}
    >
      <div className="cf-greeting-copy">
        <h1>{userId ? `Hello${name ? `, ${name}` : ''} 👋` : 'Welcome to CampusFlip'}</h1>
        <p>{userId ? 'Do you have something to sell?' : 'Buy, sell and meet on campus.'}</p>
        {credits > 0 && (
          <span className="cf-greeting-credits">
            <Ticket size={13} /> {credits} free listing{credits === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <motion.button type="button" className="cf-greeting-cta" whileTap={{ scale: 0.96 }} onClick={onNewListing}>
        <Plus size={16} /> New listing
      </motion.button>
      <div className="cf-greeting-live">
        <span className="cf-live-dot" />
        {totalListings} active listing{totalListings === 1 ? '' : 's'} on campus
      </div>
    </motion.section>
  );
}
