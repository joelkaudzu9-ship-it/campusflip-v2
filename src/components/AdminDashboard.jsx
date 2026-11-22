import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Flag, Shield, TrendingUp, Users } from 'lucide-react';
import { softSpring, spring } from './admin/ui';
import { useAdminData } from './admin/useAdminData';
import OverviewTab from './admin/OverviewTab';
import ReportsTab from './admin/ReportsTab';
import UsersTab from './admin/UsersTab';
import UserModal from './admin/UserModal';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'users', label: 'Users', icon: Users },
];

export default function AdminDashboard({ onBack, onToast }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [inspectUser, setInspectUser] = useState(null);
  const {
    analytics, reports, users, filteredUsers, loading, error, actionLoading,
    userSearch, setUserSearch, pendingCount, removeListing, dismissReport, toggleVerification,
  } = useAdminData({ onToast });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #07102A 0%, #0F1B3D 55%, #101C3A 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -200, left: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, right: -200, width: 500, height: 500, background: 'radial-gradient(circle, rgba(245,166,35,0.14) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}
        >
          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.14)' }}
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            aria-label="Back"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              width: 44, height: 44,
              color: 'white',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              transition: 'background 0.2s',
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={26} color="#F5A623" /> Admin Console
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.55 }}>
              CampusFlip marketplace management
            </p>
          </div>
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={spring}
                style={{
                  background: 'rgba(220,53,53,0.15)',
                  border: '1px solid rgba(220,53,53,0.35)',
                  color: '#FF8A8A',
                  padding: '8px 14px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} /> {pendingCount} pending
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={softSpring}
              style={{
                padding: 14,
                marginBottom: 24,
                borderRadius: 14,
                background: 'rgba(220,53,53,0.15)',
                color: '#FF8A8A',
                fontSize: 13,
                border: '1px solid rgba(220,53,53,0.3)',
                overflow: 'hidden',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 28,
          background: 'rgba(255,255,255,0.05)',
          padding: 6,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
                boxShadow: activeTab === tab.id ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
              }}
            >
              <tab.icon size={15} /> {tab.label}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 16 }}
          >
            <span className="cf-block-loader" />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: 13 }}
            >
              Loading dashboard…
            </motion.span>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">

            {activeTab === 'overview' && analytics && (
              <OverviewTab analytics={analytics} users={users} onSelectUser={setInspectUser} />
            )}
            {activeTab === 'reports' && (
              <ReportsTab reports={reports} actionLoading={actionLoading} onRemoveListing={removeListing} onDismiss={dismissReport} />
            )}
            {activeTab === 'users' && (
              <UsersTab filteredUsers={filteredUsers} userSearch={userSearch} onSearch={setUserSearch} onInspect={setInspectUser} onToggleVerified={toggleVerification} actionLoading={actionLoading} />
            )}
          </AnimatePresence>
        )}
      </div>

      <UserModal
        user={inspectUser}
        onClose={() => setInspectUser(null)}
        onToggleVerified={(id, current) => toggleVerification(id, current).then(() => setInspectUser(null))}
      />
    </div>
  );
}
