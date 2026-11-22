import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, ChevronRight, LoaderCircle, Search, X } from 'lucide-react';
import { softSpring, spring } from './ui';

export default function UsersTab({ filteredUsers, userSearch, onSearch, onInspect, onToggleVerified, actionLoading }) {
  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          marginBottom: 14,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Search size={16} style={{ opacity: 0.5 }} />
        <input
          value={userSearch}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search by name, shop, email, or phone…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 0,
            outline: 'none',
            color: 'white',
            fontSize: 13,
          }}
        />
        <AnimatePresence>
          {userSearch && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              type="button"
              onClick={() => onSearch('')}
              style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10, paddingLeft: 4 }}>
        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04 } },
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {filteredUsers.map(user => (
          <motion.div
            key={user.id}
            variants={{
              hidden: { opacity: 0, x: -12 },
              show: { opacity: 1, x: 0, transition: spring },
            }}
            layout
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: user.avatar_url ? 'transparent' : 'rgba(255,255,255,0.1)',
                display: 'grid', placeItems: 'center',
                overflow: 'hidden', flexShrink: 0,
                fontWeight: 800, fontSize: 14,
                cursor: 'pointer',
              }}
              onClick={() => onInspect(user)}
            >
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user.display_name || 'A').charAt(0).toUpperCase()}
            </motion.div>

            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name || 'Anonymous'}
                </span>
                {user.is_verified && <CheckCircle2 size={14} color="#22C55E" />}
              </div>
              <div style={{ fontSize: 12, opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email || '—'}
                {user.phone && ` · ${user.phone}`}
                {user.business_name && ` · ${user.business_name}`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onInspect(user)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                Inspect <ChevronRight size={12} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleVerified(user.id, user.is_verified)}
                disabled={actionLoading === user.id}
                style={{
                  background: user.is_verified ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                  color: user.is_verified ? '#22C55E' : 'rgba(255,255,255,0.7)',
                  border: user.is_verified ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  minWidth: 88,
                  justifyContent: 'center',
                }}
              >
                {actionLoading === user.id
                  ? <LoaderCircle size={13} className="cf-spin" />
                  : user.is_verified ? <><Check size={13} /> Verified</> : 'Verify'}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
