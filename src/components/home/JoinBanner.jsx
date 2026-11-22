import { motion } from 'framer-motion';
import { ArrowRight, Users } from 'lucide-react';

export default function JoinBanner({ onSignUp }) {
  return (
      <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="join">
        <Users />
        <div>
          <b>Join the CampusFlip community</b>
          <span>Get the best deals, post freely!</span>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onSignUp}>
          Sign Up <ArrowRight />
        </motion.button>
      </motion.aside>
  );
}
