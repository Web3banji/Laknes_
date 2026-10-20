/**
 * LAKNES Official Brand Logo Component
 * Replicates the glowing folded cyan-to-azure geometric "L" monogram.
 */

import React from 'react';

interface BrandLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function BrandLogo({
  size = 36,
  className = '',
  showText = false,
  textClassName = 'font-headline-sm text-headline-sm tracking-wider text-on-surface',
}: BrandLogoProps) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* High-Fidelity Monogram SVG */}
      <svg
        style={{ width: pixelSize, height: pixelSize }}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_12px_rgba(0,210,255,0.4)]"
      >
        <defs>
          {/* Subtle Ambient Radial Glow */}
          <radialGradient id="laknes-ambient-glow" cx="45%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0f141b" stopOpacity="0" />
          </radialGradient>

          {/* Vertical Leaf / Wing Gradient: Top-Cyan down to deep Royal Blue */}
          <linearGradient id="laknes-stem-grad" x1="60%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9deaff" />
            <stop offset="25%" stopColor="#38d4ff" />
            <stop offset="65%" stopColor="#0284fe" />
            <stop offset="100%" stopColor="#0047cc" />
          </linearGradient>

          {/* Horizontal Swept Wing Gradient: Royal Blue curving into Cyan Tip */}
          <linearGradient id="laknes-wing-grad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0035a8" />
            <stop offset="20%" stopColor="#0266ff" />
            <stop offset="65%" stopColor="#00c8f5" />
            <stop offset="100%" stopColor="#8eedff" />
          </linearGradient>

          {/* Crease Shadow Depth */}
          <linearGradient id="laknes-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#001438" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#003399" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Ambient Halo */}
        <circle cx="256" cy="256" r="230" fill="url(#laknes-ambient-glow)" />

        {/* Horizontal Wing (Lower Base) */}
        <path
          d="M 174 358
             C 188 326 226 292 278 290
             L 370 290
             L 304 358
             C 255 358 205 358 174 358 Z"
          fill="url(#laknes-wing-grad)"
        />

        {/* Vertical Swept Stem (Upper Blade) */}
        <path
          d="M 264 128
             L 194 170
             C 176 182 173 208 173 246
             L 173 358
             C 175 348 186 322 214 294
             C 245 260 264 220 264 180
             L 264 128 Z"
          fill="url(#laknes-stem-grad)"
        />

        {/* Overlapping Shadow Crease */}
        <path
          d="M 173 358
             C 190 326 228 298 274 291
             C 230 306 195 330 173 358 Z"
          fill="url(#laknes-shadow)"
        />
      </svg>

      {showText && (
        <span className={`${textClassName} group-hover:text-primary transition-colors`}>
          LAKNES
        </span>
      )}
    </div>
  );
}
