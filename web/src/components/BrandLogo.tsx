import React from 'react';

type BrandLogoProps = {
  size?: number;
  className?: string;
  showText?: boolean;
};

export function BrandLogo({ size = 28, className = '', showText = true }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric Vector Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Outer Hexagonal Shield Foundation */}
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8"
          fill="#141418"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.5"
        />

        {/* Stylus "S" + Cross-Chain Intersecting Vectors */}
        <path
          d="M10 11.5C10 9.8 11.8 8.5 14.5 8.5H19C21.2 8.5 22.5 9.8 22.5 11.5C22.5 13.8 20.5 14.8 17.5 15.5L14.5 16.2C11.5 16.9 9.5 18 9.5 20.5C9.5 22.5 11.2 23.5 13.5 23.5H18C20.8 23.5 22.5 22 22.5 20"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dynamic Stylus Core Flame (Accent Orange) */}
        <circle cx="21.5" cy="11" r="2.2" fill="#ff4500" />
        <circle cx="10.5" cy="21" r="2.2" fill="#ff4500" />
      </svg>

      {showText && (
        <span className="font-semibold text-white tracking-tight text-[15px] leading-none">
          StylusSafe
        </span>
      )}
    </div>
  );
}

