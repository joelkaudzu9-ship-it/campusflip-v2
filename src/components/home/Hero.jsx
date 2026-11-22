import { motion } from 'framer-motion';
import { ArrowRight, Users } from 'lucide-react';
import { springPhysics } from '../../lib/motion';

export default function Hero({ totalListings }) {
  return (
      <motion.section
        className="cf-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPhysics, delay: 0.05 }}
      >
        <div className="cf-hero-glow cf-hero-glow-one" />
        <div className="cf-hero-glow cf-hero-glow-two" />

        <div className="cf-hero-copy">
          <span className="cf-hero-eyebrow">THE KUHeS MARKETPLACE</span>
          <h1>
            Everything campus.
            <span>One marketplace.</span>
          </h1>
          <p>
            Buy what you need. Sell what you don't.
            <br className="cf-hero-desktop-break" /> Connect with your campus community.
          </p>
          <motion.button
            type="button"
            className="cf-hero-cta"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              document.querySelector('.cf-categories')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }}
          >
            Explore marketplace <ArrowRight size={18} />
          </motion.button>
          <div className="cf-hero-stats">
            <span className="cf-live-dot" />
            <span>
              {totalListings} active listing{totalListings === 1 ? '' : 's'} on campus
            </span>
          </div>
        </div>

        <div className="cf-hero-art" aria-hidden="true">
          <div className="cf-hero-art-orbit" />
          <div className="cf-hero-art-spark cf-hero-art-spark-one">✦</div>
          <div className="cf-hero-art-spark cf-hero-art-spark-two">✳</div>
          <div className="cf-hero-product cf-hero-product-bag">
            <span>🎒</span>
            <small>CAMPUS GEAR</small>
          </div>
          <div className="cf-hero-product cf-hero-product-laptop">
            <span>💻</span>
          </div>
          <div className="cf-hero-product cf-hero-product-books">
            <span>📚</span>
            <small>STUDY ESSENTIALS</small>
          </div>
          <div className="cf-hero-product cf-hero-product-bottle">
            <span>🧴</span>
          </div>
          <div className="cf-hero-art-caption">
            <span className="cf-hero-caption-icon"><Users size={15} /></span>
            <span>{totalListings} item{totalListings === 1 ? '' : 's'} from your campus community</span>
          </div>
        </div>
      </motion.section>
  );
}
