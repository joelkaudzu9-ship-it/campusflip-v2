import { motion } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle2, LoaderCircle } from 'lucide-react';
import { GlassCard, spring } from './ui';

export default function ReportsTab({ reports, actionLoading, onRemoveListing, onDismiss }) {
  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
    >
      {reports.length === 0 ? (
        <GlassCard style={{ textAlign: 'center', padding: 60 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <CheckCircle2 size={48} color="#22C55E" style={{ margin: '0 auto 16px' }} />
          </motion.div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>All clear</h3>
          <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>No listings have been reported.</p>
        </GlassCard>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          {reports.map(report => (
            <motion.div
              key={report.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: spring },
              }}
            >
              <GlassCard style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF8A8A', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, marginBottom: 8 }}>
                      <AlertTriangle size={13} /> {report.reason.toUpperCase()}
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
                      {report.listings?.title || 'Deleted listing'}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, opacity: 0.7, lineHeight: 1.6 }}>
                      {report.details || 'No additional details provided.'}
                    </p>
                    <p style={{ margin: '10px 0 0', fontSize: 11, opacity: 0.4 }}>
                      {report.profiles?.display_name || report.profiles?.email || 'Unknown reporter'}
                      {report.profiles?.phone && ` · ${report.profiles.phone}`}
                      {' · '}
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {report.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
                      {report.listings?.id && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onRemoveListing(report.listings.id, report.id)}
                          disabled={actionLoading === report.id}
                          style={{
                            background: 'rgba(220,53,53,0.15)',
                            color: '#FF8A8A',
                            border: '1px solid rgba(220,53,53,0.35)',
                            borderRadius: 11,
                            padding: '9px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {actionLoading === report.id
                            ? <LoaderCircle size={13} className="cf-spin" />
                            : <Ban size={13} />}
                          Remove
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onDismiss(report.id)}
                        disabled={actionLoading === report.id}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 11,
                          padding: '9px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Dismiss
                      </motion.button>
                    </div>
                  ) : (
                    <span style={{
                      background: report.status === 'resolved'
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(255,255,255,0.08)',
                      color: report.status === 'resolved' ? '#22C55E' : 'rgba(255,255,255,0.5)',
                      padding: '8px 14px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      alignSelf: 'flex-start',
                    }}>
                      {report.status}
                    </span>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
