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
 * Compact, sleek rounded floating navigation pill inside a dedicated edge-blur dock.
 * Sits in its own flex-shrink-0 slot below every screen so it NEVER hides content or prompt bars.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, planTier, onSelect }) => {
  const isLite = planTier === 'lite';

  return (
    <nav
      aria-label="Primary Navigation"
      className="vl-bottom-dock relative z-40 shrink-0 border-t border-white/[0.06] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
    >
      {/* Subtle emerald hairline glow */}
      <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent" />

      <div className="mx-auto w-full max-w-[264px]">
        <GlassSurface borderRadius={999} blur={10} opacity={0.88} className="px-2 py-1">
          <div className="grid grid-cols-3 items-center gap-1">
            {/* Left: Settings */}
            <button
              type="button"
              onClick={() => onSelect('settings')}
              aria-label="Settings"
              className="group relative flex flex-col items-center justify-center rounded-full py-1.5 transition-colors focus:outline-none"
            >
              {activeTab === 'settings' && (
                <motion.span
                  layoutId="vl-nav-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="absolute inset-0 rounded-full border border-emerald-400/35 bg-emerald-500/18 shadow-[0_0_16px_rgba(16,185,129,0.28)]"
                />
              )}
              <Settings
                className={`relative z-10 h-[18px] w-[18px] transition-all duration-200 ${
                  activeTab === 'settings'
                    ? 'rotate-45 text-emerald-300'
                    : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />
              <span
                className={`relative z-10 mt-0.5 text-[9px] font-semibold tracking-wide ${
                  activeTab === 'settings' ? 'text-emerald-300' : 'text-zinc-500'
                }`}
              >
                Settings
              </span>
            </button>

            {/* Middle: Home */}
            <button
              type="button"
              onClick={() => onSelect('home')}
              aria-label="Home Camera"
              className="group relative flex flex-col items-center justify-center rounded-full py-1.5 transition-colors focus:outline-none"
            >
              {activeTab === 'home' && (
                <motion.span
                  layoutId="vl-nav-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="absolute inset-0 rounded-full border border-emerald-400/35 bg-emerald-500/18 shadow-[0_0_16px_rgba(16,185,129,0.28)]"
                />
              )}
              <Home
                className={`relative z-10 h-[18px] w-[18px] transition-all duration-200 ${
                  activeTab === 'home'
                    ? 'scale-105 text-emerald-300'
                    : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />
              <span
                className={`relative z-10 mt-0.5 text-[9px] font-semibold tracking-wide ${
                  activeTab === 'home' ? 'text-emerald-300' : 'text-zinc-500'
                }`}
              >
                Home
              </span>
            </button>

            {/* Right: Lensy AI */}
            <button
              type="button"
              onClick={() => onSelect('lensy')}
              aria-label="Lensy AI"
              className="group relative flex flex-col items-center justify-center rounded-full py-1 transition-colors focus:outline-none"
            >
              {activeTab === 'lensy' && (
                <motion.span
                  layoutId="vl-nav-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="absolute inset-0 rounded-full border border-emerald-400/40 bg-emerald-500/18 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                />
              )}
              <div className="relative z-10 flex items-center justify-center">
                <img
                  src="/lensy-logo.png"
                  alt="Lensy AI"
                  className={`h-[22px] w-[22px] rounded-full object-cover transition-all duration-200 ${
                    activeTab === 'lensy'
                      ? 'scale-105 ring-2 ring-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.75)]'
                      : 'opacity-85 ring-1 ring-white/20 group-hover:opacity-100'
                  }`}
                />
                {isLite && (
                  <span className="absolute -right-1.5 -top-1 flex h-3 w-3 items-center justify-center rounded-full border border-emerald-400/50 bg-zinc-950 text-emerald-300">
                    <Lock className="h-1.5 w-1.5" />
                  </span>
                )}
              </div>
              <span
                className={`relative z-10 mt-0.5 text-[9px] font-semibold tracking-wide ${
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
