/**
 * LAKNES Footer Component
 * Quiet, professional footer adhering to Stitch guidelines.
 */

import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';

interface FooterProps {
  onNavigate: (view: string) => void;
  onOpenArchitecture?: () => void;
}

export function Footer({ onNavigate, onOpenArchitecture }: FooterProps) {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-surface-container-lowest py-space-xl px-margin-mobile lg:px-margin text-on-surface-variant">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-space-lg text-xs">
        <div className="flex items-center gap-3">
          <BrandLogo size={28} />
          <div>
            <span className="font-headline-sm text-sm text-on-surface font-semibold tracking-wider">LAKNES</span>
            <span className="text-outline mx-2">&bull;</span>
            <span className="font-label-mono text-[11px] text-on-surface-variant">Elysium Ecosystem Gateway</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-space-lg text-slate-400 font-label-mono text-[12px]">
          <button onClick={() => onNavigate('explore')} className="hover:text-primary transition-colors">
            Explore
          </button>
          <button onClick={() => onNavigate('projects')} className="hover:text-primary transition-colors">
            Projects
          </button>
          <button onClick={() => onNavigate('quests')} className="hover:text-primary transition-colors">
            Quests
          </button>
          <button onClick={() => onNavigate('submit-project')} className="hover:text-primary transition-colors">
            Submit
          </button>
          {onOpenArchitecture && (
            <button
              onClick={onOpenArchitecture}
              className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] flex items-center gap-1 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Architecture Suite
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-outline font-label-mono">
          <span>Synced with Elysium Block</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>© {new Date().getFullYear()} LAKNES</span>
        </div>
      </div>
    </footer>
  );
}
