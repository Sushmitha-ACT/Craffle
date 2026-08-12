/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FF6B35] text-white font-sans overflow-hidden select-none">
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_20%,rgba(0,0,0,0.15)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center text-center px-6 relative z-10"
      >
        {/* Animated Icon Container */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
          className="w-20 h-20 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-xl relative overflow-hidden"
        >
          <ShoppingBag className="w-10 h-10 text-white" />
          <motion.div 
            className="absolute inset-0 bg-white/10"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Brand Title */}
        <h1 className="text-5xl font-extrabold tracking-tight mb-2 select-text font-serif">
          Craffle
        </h1>
        
        {/* Tagline */}
        <p className="text-orange-100 font-medium text-base md:text-lg max-w-sm tracking-wide leading-relaxed select-text font-sans">
          Connecting Home Creators with Nearby Customers
        </p>

        {/* Simple Loading Spinner & Status text */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-200 border-t-white rounded-full animate-spin" />
          <span className="text-orange-100/85 text-[11px] font-semibold tracking-widest uppercase">
            Securing Connection...
          </span>
        </div>
      </motion.div>
      
      {/* Background design elements */}
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
