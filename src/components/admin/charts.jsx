import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Store, TrendingUp } from 'lucide-react';
import { EmptyMini, GlassCard, SectionHeader, spring } from './ui';

export function RevenueChart({ data }) {
  if (!data.length) return <EmptyMini text="No payments yet." />;

  const max = Math.max(...data.map(d => d.amount), 1);

  return (
    <div style={{ position: 'relative', height: 140 }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 4, paddingBottom: 20 }}>
        {data.map((d, i) => {
          const height = (d.amount / max) * 100;
          return (
            <motion.div
              key={d.day}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${Math.max(height, 2)}%`, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.03 }}
              whileHover={{ opacity: 0.75 }}
              title={`${d.day}: MK ${d.amount.toLocaleString()}`}
              style={{
                flex: 1,
                background: 'linear-gradient(180deg, #F5A623 0%, #D97706 100%)',
                borderRadius: 4,
                minHeight: 2,
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 9, opacity: 0.4, display: 'flex', justifyContent: 'space-between' }}>
        <span>{data[0]?.day?.slice(5)}</span>
        <span>{data[data.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
}

export function CategoryChart({ data }) {
  if (!data.length) return <EmptyMini text="No active listings." />;
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => {
        const width = (d.count / max) * 100;
        return (
          <div key={d.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
              <span style={{ fontWeight: 600 }}>{d.category}</span>
              <span style={{ opacity: 0.6 }}>{d.count}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.06 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563EB 0%, #64B5F6 100%)',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TopSellers({ sellers, onSelect }) {
  if (!sellers.length) return <EmptyMini text="No sellers with active listings yet." />;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {sellers.map((s, i) => (
        <motion.div
          key={s.id}
          variants={{
            hidden: { opacity: 0, x: -10 },
            show: { opacity: 1, x: 0, transition: spring },
          }}
          whileHover={{ x: 3, background: 'rgba(255,255,255,0.08)' }}
          onClick={() => onSelect(s.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: i === 0 ? '#F5A623' : 'rgba(255,255,255,0.1)',
            color: i === 0 ? '#101C3A' : 'rgba(255,255,255,0.7)',
            display: 'grid', placeItems: 'center',
            fontSize: 12, fontWeight: 800,
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              {s.is_verified && <CheckCircle2 size={12} color="#22C55E" />}
            </div>
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              {s.active_listings} active listing{s.active_listings === 1 ? '' : 's'}
            </span>
          </div>
          <ChevronRight size={14} style={{ opacity: 0.4 }} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function PaymentBreakdown({ data }) {
  const entries = Object.entries(data);
  if (!entries.length) return <EmptyMini text="No successful payments yet." />;

  const labels = {
    listing: 'Listing fee',
    boost: 'Boost',
    boost_discount: 'Boost (discounted)',
    shop_plan: 'Shop plan',
    flash_deal: 'Flash deal',
  };

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const palette = ['#F5A623', '#2563EB', '#64B5F6', '#22C55E', '#A855F7'];

  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
        {entries.map(([type, count], i) => (
          <motion.div
            key={type}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.06 }}
            style={{ background: palette[i % palette.length], height: '100%' }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(([type, count], i) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.1 + i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 3, background: palette[i % palette.length] }} />
            <span style={{ flex: 1, opacity: 0.8 }}>{labels[type] || type}</span>
            <span style={{ fontWeight: 700 }}>{count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
