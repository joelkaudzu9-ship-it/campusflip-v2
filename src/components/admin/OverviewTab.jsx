import { motion } from 'framer-motion';
import { DollarSign, Flag, Store, Users } from 'lucide-react';
import { GlassCard, SectionHeader, StatCard, spring } from './ui';
import { CategoryChart, PaymentBreakdown, RevenueChart, TopSellers } from './charts';

export default function OverviewTab({ analytics, users, onSelectUser }) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Revenue (all time)"
          value={analytics.revenueTotal || 0}
          prefix="MK "
          sub={`MK ${(analytics.revenueLast7 || 0).toLocaleString()} this week`}
          icon={DollarSign}
          accent="#F5A623"
          delay={0}
        />
        <StatCard
          label="Active listings"
          value={analytics.activeListings || 0}
          sub={`${analytics.totalListings || 0} total`}
          icon={Store}
          accent="#64B5F6"
          delay={0.05}
        />
        <StatCard
          label="Members"
          value={analytics.totalUsers || 0}
          sub={`${analytics.verifiedShops || 0} verified · ${analytics.usersWithPhone || 0} with phone`}
          icon={Users}
          accent="#22C55E"
          delay={0.1}
        />
        <StatCard
          label="Pending reports"
          value={analytics.pendingReports || 0}
          sub={analytics.pendingReports > 0 ? 'Needs attention' : 'All clear'}
          icon={Flag}
          accent={analytics.pendingReports > 0 ? '#FF8A8A' : '#22C55E'}
          delay={0.15}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
        <GlassCard>
          <SectionHeader title="Revenue" sub="Last 14 days" />
          <RevenueChart data={analytics.revenueByDay || []} />
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Listings by category" sub="Active only" />
          <CategoryChart data={analytics.listingsByCategory || []} />
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <GlassCard>
          <SectionHeader title="Top sellers" sub="By active listings" />
          <TopSellers
            sellers={analytics.topSellers || []}
            onSelect={(id) => {
              const u = users.find(x => x.id === id);
              if (u) onSelectUser(u);
            }}
          />
        </GlassCard>

        <GlassCard>
          <SectionHeader title="Payment mix" sub="Successful payments" />
          <PaymentBreakdown data={analytics.paymentBreakdown || {}} />
        </GlassCard>
      </div>
    </motion.div>
  );
}
