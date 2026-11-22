import { AnimatePresence, motion } from 'framer-motion';
import { springPhysics } from '../../lib/motion';

export default function Splash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="cf-splash"
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPhysics, delay: 0.1 }}
            className="cf-splash-logo"
          >
            <span className="mark">CF</span>
            <span>Campus<span style={{ color: 'var(--cf-blue)' }}>Flip</span></span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="cf-splash-tagline"
          >
            Buy. Sell. Meet.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
            style={{ marginTop: 20 }}
          >
            <span className="cf-block-loader"></span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
