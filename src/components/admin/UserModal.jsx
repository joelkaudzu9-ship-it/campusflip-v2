import { motion } from 'framer-motion';
import { Phone, X } from 'lucide-react';
import { Modal, Row } from './ui';

export default function UserModal({ user: inspectUser, onClose, onToggleVerified }) {
  return (
    <Modal open={!!inspectUser} onClose={() => onClose()}>
      {inspectUser && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: '#F5A623', marginBottom: 4 }}>
                USER DETAIL
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                {inspectUser.display_name || 'Anonymous'}
              </h2>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onClose()}
              aria-label="Close"
              style={{ background: 'rgba(255,255,255,0.08)', border: 0, borderRadius: 10, width: 32, height: 32, color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <X size={16} />
            </motion.button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <Row label="Email" value={inspectUser.email || '—'} icon={null} />
            <Row label="Phone" value={inspectUser.phone || 'Not provided'} icon={Phone} />
            <Row label="Shop name" value={inspectUser.business_name || '—'} icon={null} />
            <Row label="Status" value={inspectUser.is_verified ? 'Verified seller' : 'Regular member'} icon={null} />
            <Row label="Joined" value={new Date(inspectUser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} icon={null} />
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onToggleVerified(inspectUser.id, inspectUser.is_verified).then(() => onClose())}
            style={{
              marginTop: 22,
              width: '100%',
              padding: 14,
              borderRadius: 14,
              border: 0,
              background: inspectUser.is_verified ? 'rgba(255,255,255,0.1)' : '#22C55E',
              color: inspectUser.is_verified ? 'rgba(255,255,255,0.8)' : '#0A1A12',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {inspectUser.is_verified ? 'Remove verification' : 'Verify this seller'}
          </motion.button>
        </>
      )}
    </Modal>
  );
}
