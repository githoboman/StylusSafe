---
name: Restrained Architectural Slate
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#bfc7d2'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#89929b'
  outline-variant: '#3f4850'
  surface-tint: '#93ccff'
  primary: '#93ccff'
  on-primary: '#003351'
  primary-container: '#3198dc'
  on-primary-container: '#002c47'
  inverse-primary: '#006398'
  secondary: '#c6c5cf'
  on-secondary: '#2f3038'
  secondary-container: '#4a4b53'
  on-secondary-container: '#bcbbc5'
  tertiary: '#ffb875'
  on-tertiary: '#4b2800'
  tertiary-container: '#d07d1c'
  on-tertiary-container: '#412200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#ffdcc0'
  tertiary-fixed-dim: '#ffb875'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6b3b00'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
  background-ink: '#18181b'
  surface-zinc: '#27272a'
  text-primary: '#f4f4f5'
  text-muted: '#71717a'
  accent-azure: '#0284c7'
  border-whisper: rgba(255, 255, 255, 0.08)
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

# Design System: StylusSafe

## 1. Visual Theme & Atmosphere
A restrained, gallery-airy interface with confident asymmetric layouts and fluid spring-physics motion. The atmosphere is clinical yet deeply tactile — like a well-lit Swiss architecture studio. It completely abandons the generic "Web3 neon" look in favor of a mature, premium banking experience. The design feels grounded, using strict typographic hierarchy and negative space to guide the user rather than glowing buttons.

## 2. Color Palette & Roles (Web vs. Mobile)
**Mobile App (Dark Theme - Target):**
- Primary Background: #18181B (Deep Charcoal Ink)
- Surface / Cards / Bottom Sheets: #27272A (Zinc Surface)
- Primary Text: #F4F4F5 (Off-White)
- Secondary / Meta Text: #71717A (Muted Steel)
- Border Division: rgba(226, 232, 240, 0.12) / rgba(255, 255, 255, 0.08) (Whisper Border)
- Accent: #0284C7 (Matte Azure) - strictly maximum 1 accent, saturation < 80%, no neon/purple gradients.

## 3. Typography Rules
- Display & Headings: Geist (track-tight, weight-driven hierarchy, never screaming)
- Body: Geist (relaxed leading, 65ch max-width, neutral Muted Steel color)
- Mono & Data: JetBrains Mono (strictly for wallet addresses, token balances, transaction hashes, metadata, timestamps)
- Strictly Banned: Inter, Times New Roman, system serif fonts.

## 4. Component Stylings
- Buttons: Flat, brutalist corners (4px / rounded-sm). No outer glow. Matte Azure (#0284C7) fill for primary, ghost/outline with whisper border for secondary.
- Cards: Generously rounded corners (1.5rem / 24px). Diffused whisper subtle shadow. For transaction lists: 1px border-top dividers and negative space.
- Inputs: Clean label above input, error text below. Focus ring in Matte Azure.
- Biometrics / Passkey: Fixed bottom sheet sliding up smoothly with subtle biometric pulse.
- Bottom Tab Bar: Clean, minimal bottom navigation dock.

## 5. Anti-Patterns
- NEVER use emojis anywhere.
- NEVER use Inter font.
- NEVER use pure black (#000000).
- NEVER use neon glows or purple/magenta gradients.
- NEVER use AI clichés ("Elevate", "Seamless", "Next-Gen", "Unleash").
- NEVER use filler UI text or bouncing arrows.
- NEVER overlap elements.
