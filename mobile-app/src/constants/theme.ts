/**
 * StylusSafe Design System — Restrained Architectural Slate
 * Mirrors the web app's design tokens for a consistent cross-platform experience.
 */

import '@/global.css';
import { Platform } from 'react-native';

// ── Core Palette ──────────────────────────────────────────────────────────────
export const Colors = {
  // Backgrounds
  backgroundInk: '#0A0A0A',      // page background
  surfaceZinc: '#121212',        // card background
  surfaceContainer: '#1E1E1E',   // subtle container
  surfaceContainerHigh: '#242424', // hover state

  // Text
  textPrimary: '#FAFAFA',        // primary text
  textMuted: '#A1A1AA',          // secondary text

  // Semantic
  accentAzure: '#0284C7',        // action azure
  error: '#DC2626',

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

