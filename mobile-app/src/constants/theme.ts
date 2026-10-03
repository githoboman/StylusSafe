/**
 * StylusSafe Design System — Restrained Architectural Slate
 * Mirrors the web app's design tokens for a consistent cross-platform experience.
 */

import '@/global.css';
import { Platform } from 'react-native';

// ── Core Palette ──────────────────────────────────────────────────────────────
export const Colors = {
  // Backgrounds
  backgroundInk: '#000000',      // page background
  surfaceZinc: '#0A0A0A',        // card background
  surfaceContainer: '#111111',   // subtle container
  surfaceContainerHigh: '#1C1C1C', // hover state

  // Text
  textPrimary: '#FFFFFF',        // primary text
  textMuted: '#888888',          // secondary text

  // Semantic
  accentOrange: '#FF4500',       // action orange
  primary: '#FF4500',
  secondary: '#888888',
  tertiary: '#242424',
  error: '#FF4C4C',

  // Borders
  border: 'rgba(255,255,255,0.1)',
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'sans-serif',
    mono: 'monospace',
  },
});

// ── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

