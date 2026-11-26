import React from 'react';
import { motion } from 'framer-motion';
import { Home, Lock, Settings } from 'lucide-react';
import { PlanTier } from '../api/client';
import GlassSurface from './GlassSurface';

export type NavTab = 'settings' | 'home' | 'lensy';

interface BottomNavProps {
  activeTab: NavTab;
  planTier: PlanTier;
  onSelect: (tab: NavTab) => void;
}

/**
 * Mobile-first floating GlassSurface bottom navigation bar with exact 3 icons:
 * Left: Gear (Settings) | Middle: Home (Main Default Camera) | Right: Lensy Bot logo
 */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, planTier, onSelect }) => {
  const isLite = planTier === 'lite';

  return (
    <nav
      aria-label="Primary Navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto w-full max-w-[330px]">
        <GlassSurface borderRadius={32} blur={12} opacity={0.86} className="px-3 py-2">
          <div className="grid grid-cols-3 items-center gap-2">
            {/* Left: Settings (Gear icon) */}
            <button
              type="button"
              onClick={() => onSelect('settings')}
              aria-label="Settings"
              className="group relative flex flex-col items-center justify-center rounded-2xl py-2 transition-colors focus:outline-none"
            >
              {activeTab === 'settings' && (
                <motion.span
                  layoutId="vl-nav-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.28)]"
                />
              )}
              <Settings
                className={`relative z-10 h-6 w-6 transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'rotate-45 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.75)]'
                    : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />
              <span
                className={`relative z-10 mt-0.5 text-[10px] font-medium tracking-wide ${
                  activeTab === 'settings' ? 'text-emerald-300' : 'text-zinc-500'
                }`}
              >
                Settings
              </span>
            </button>

            {/* Middle: Home (Main Default Page) */}
            <button
              type="button"
              onClick={() => onSelect('home')}
              aria-label="Home Camera"
              className="group relative flex flex-col items-center justify-center rounded-2xl py-2 transition-colors focus:outline-none"
            >
              {activeTab === 'home' && (
                <motion.span
                  layoutId="vl-nav-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.28)]"
                />
              )}
              <Home
                className={`relative z-10 h-6 w-6 transition-all duration-200 ${
                  activeTab === 'home'
                    ? 'scale-105 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.75)]'
                    : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />
              <span
                className={`relative z-10 mt-0.5 text-[10px] font-medium tracking-wide ${
                  activeTab === 'home' ? 'text-emerald-300' : 'text-zinc-500'
                }`}
              >
                Home
              </span>
            </button>

            {/* Right: Lensy AI (Extracted circular Lensy Bot image) */}
            <button
              type="button"
              onClick={() => onSelect('lensy')}
              aria-label="Lensy AI"
              className="group relative flex flex-col items-center justify-center rounded-2xl py-1.5 transition-colors focus:outline-none"
            >
              {activeTab === 'lensy' && (
                <motion.span
                  layoutId="vl-nav-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                />
              )}
              <div className="relative z-10 flex items-center justify-center">
                <img
                  src="/lensy-logo.png"
                  alt="Lensy AI"
                  className={`h-7 w-7 rounded-full object-cover transition-all duration-200 ${
                    activeTab === 'lensy'
                      ? 'scale-110 ring-2 ring-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.8)]'
                      : 'opacity-85 ring-1 ring-white/20 group-hover:opacity-100'
                  }`}
                />
                {isLite && (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-emerald-400/50 bg-zinc-950 text-emerald-300">
                    <Lock className="h-2 w-2" />
                  </span>
                )}
              </div>
              <span
                className={`relative z-10 mt-0.5 text-[10px] font-medium tracking-wide ${
                  activeTab === 'lensy' ? 'text-emerald-300' : 'text-zinc-500'
                }`}
              >
                Lensy
              </span>
            </button>
          </div>
        </GlassSurface>
      </div>
    </nav>
  );
};

export default BottomNav;
