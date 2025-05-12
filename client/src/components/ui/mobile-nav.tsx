import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

export function MobileNav({ isMobileMenuOpen, toggleMobileMenu }: MobileNavProps) {
  const [location] = useLocation();

  return (
    <div className="md:hidden">
      <button
        onClick={toggleMobileMenu}
        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/70"
        aria-label={isMobileMenuOpen ? "Chiudi menu" : "Apri menu"}
      >
        <motion.div
          animate={isMobileMenuOpen ? "open" : "closed"}
          className="w-6 h-6 flex flex-col justify-center items-center"
          transition={{ duration: 0.12 }}
        >
          <motion.span
            variants={{
              closed: { rotate: 0, y: 0 },
              open: { rotate: 45, y: 7 },
            }}
            transition={{ duration: 0.12, type: "spring", stiffness: 500 }}
            className="w-6 h-0.5 bg-gray-600 block mb-1.5 rounded-full"
          />
          <motion.span
            variants={{
              closed: { opacity: 1 },
              open: { opacity: 0 },
            }}
            transition={{ duration: 0.08 }}
            className="w-6 h-0.5 bg-gray-600 block mb-1.5 rounded-full"
          />
          <motion.span
            variants={{
              closed: { rotate: 0, y: 0 },
              open: { rotate: -45, y: -7 },
            }}
            transition={{ duration: 0.12, type: "spring", stiffness: 500 }}
            className="w-6 h-0.5 bg-gray-600 block rounded-full"
          />
        </motion.div>
      </button>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={toggleMobileMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}