import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AnimatedModal } from '../MotionUI';
import AuthPanel from '../AuthPanel';

export default function AuthModal({ open, onClose, onToast, onAuthenticated }) {
  return (
    <AnimatedModal open={open} onClose={onClose} className="cf-auth-modal">
      <div className="cf-auth-modal-heading">
        <div>
          <span className="cf-eyebrow">WELCOME TO CAMPUSFLIP</span>
          <h2>Join your campus marketplace.</h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          className="cf-icon-close"
          onClick={onClose}
          aria-label="Close sign in"
        >
          <X size={19} />
        </motion.button>
      </div>
      <AuthPanel onToast={onToast} onAuthenticated={onAuthenticated} />
    </AnimatedModal>
  );
}
