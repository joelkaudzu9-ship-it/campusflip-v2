import { motion } from 'framer-motion';
import { BookOpen, Laptop, MoreHorizontal, ShoppingBasket, Shirt, Utensils } from 'lucide-react';

const cats = [
  ['All', ShoppingBasket],
  ['Books', BookOpen],
  ['Electronics', Laptop],
  ['Clothes', Shirt],
  ['Food', Utensils],
  ['More', MoreHorizontal],
];

export default function FilterBar({ cat, onCat }) {
  return (
    <>
        <nav className="cats cf-categories" aria-label="Categories">
          {cats.map(([name, Icon]) => {
            const active = cat === name;
            return (
              <motion.button
                whileTap={{ scale: 0.94 }}
                className={`cf-category${active ? ' active' : ''}`}
                onClick={() => onCat(name)}
                key={name}
                type="button"
                aria-pressed={active}
              >
                <Icon />
                <span>{name}</span>
              </motion.button>
            );
          })}
        </nav>
    </>
  );
}
