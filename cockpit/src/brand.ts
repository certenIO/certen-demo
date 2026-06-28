/**
 * brand.ts — THE re-theming surface for the Authorization Cockpit.
 * ════════════════════════════════════════════════════════════════════════════════════════════
 * This is the ONE file you edit to rebrand the entire demo for a different client.
 * Nothing else in the app hardcodes a color, font, radius, or shadow — every component reads
 * tokens that are derived from the `BRAND` object below. Change it here; the whole cockpit follows.
 *
 * ── QUICK RETHEME (90% of clients only touch these) ──────────────────────────────────────────
 *   1. `name` / `productLabel`         → the wordmark + tab title in the header
 *   2. `accent`                        → the single brand color (CTAs, active rail, key highlights)
 *   3. `markIcon`                      → the logo glyph (any MUI icon)
 *   4. `typography.fontImportHref` + `fontFamily` → the brand font (the href LOADS it; see main.tsx)
 *   5. (optional) `status` / `neutral` → only if a client has strict brand status colors / gray ramp
 *
 * Everything above is read from this one file — no component, no index.html, hardcodes any of it.
 *
 * To ship a client build: either edit CERTEN_BRAND, or add a new preset (copy CERTEN_BRAND, change
 * the values) and set `export const BRAND = <YourClient>_BRAND` at the bottom. An ACME example is
 * included to show how little it takes.
 * ════════════════════════════════════════════════════════════════════════════════════════════
 */

import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import type { SvgIconComponent } from '@mui/icons-material';

/** A color plus the shades the UI needs. `main`=on-white text/icon-safe, `dark`=text on tinted fills, `light`=fill-only. */
export interface ColorSet {
  main: string;
  light: string;
  dark: string;
  contrastText?: string;
}

/** 0–900 slate-style ramp. 0=white … 900=near-black. Carries ~95% of the corporate UI. */
export interface NeutralRamp {
  0: string; 50: string; 100: string; 200: string; 300: string;
  400: string; 500: string; 600: string; 700: string; 800: string; 900: string;
}

export interface BrandConfig {
  /** Wordmark + product label shown in the header / launcher. */
  name: string;
  productLabel: string;
  /** Optional one-liner used on the launcher hero (falls back to a default if empty). */
  tagline?: string;
  /** The logo glyph in the brand mark — any MUI icon component (e.g. swap for a client's mark). */
  markIcon: SvgIconComponent;

  /** The single brand accent. Used SPARINGLY — primary action, active state, one highlight. */
  accent: ColorSet;
  /** Neutral slate ramp — borders, text, structure, secondary chips. The workhorse. */
  neutral: NeutralRamp;
  /** Semantic status colors (verdicts / health only). Muted for a light canvas. */
  status: { success: ColorSet; error: ColorSet; warning: ColorSet; info: ColorSet };

  /** Surfaces — derived from neutral by default; override only for a bespoke canvas tint. */
  surfaces: {
    canvas: string;  // app background
    paper: string;   // cards / panels
    subtle: string;  // inset fills, code blocks, zebra
    sunken: string;
    overlay: string; // popovers / drawers
    border: string;  // hairline
  };

  typography: {
    fontFamily: string;
    monoFamily: string;
    /** Max heading weight. 600–700 reads corporate; 800 reads startup. */
    headingWeight: 600 | 700 | 800;
    /**
     * Stylesheet URL that actually LOADS `fontFamily` + `monoFamily` (e.g. a Google Fonts link).
     * Injected at startup from this one place — so swapping the brand font is a single-file change.
     * Leave undefined if the fonts are self-hosted / already available to the page.
     */
    fontImportHref?: string;
  };

  radii: { sm: number; md: number; lg: number; full: number };
}

/** Default slate ramp (Tailwind slate) — neutral, professional, client-agnostic. */
const SLATE: NeutralRamp = {
  0: '#FFFFFF',
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
};

const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace";

// ─────────────────────────────────────────────────────────────────────────────────────────────
// CERTEN — the default brand. Serious enterprise software: near-monochrome slate, one restrained
// deep-navy accent, refined (not heavy) headings, tight instrument-grade geometry. No flash.
// ─────────────────────────────────────────────────────────────────────────────────────────────
export const CERTEN_BRAND: BrandConfig = {
  name: 'CERTEN',
  productLabel: 'Authorization Cockpit',
  tagline:
    'Nothing high-value executes until policy is satisfied and proven — whether the actor is a person, a multisig, or an AI.',
  markIcon: VerifiedUserRoundedIcon,

  // Deep, desaturated navy — the accent of financial/security infrastructure. Used SPARINGLY:
  // primary action, active rail, one highlight. Everything else is quiet slate.
  accent: { main: '#1F4E79', light: '#A7BED4', dark: '#173B5C', contrastText: '#FFFFFF' },
  neutral: SLATE,
  // Semantic status only (verdicts / health) — sobered so they read as serious signals, not candy.
  status: {
    success: { main: '#157347', light: '#2E9E5B', dark: '#10532F' },
    error: { main: '#B42318', light: '#D14438', dark: '#8A1B12' },
    warning: { main: '#B45309', light: '#D58A2C', dark: '#8A3F08' },
    info: { main: '#1F6F8B', light: '#4F97AC', dark: '#17576B' },
  },
  surfaces: {
    canvas: '#F5F7FA',
    paper: '#FFFFFF',
    subtle: SLATE[50],
    sunken: SLATE[100],
    overlay: '#FFFFFF',
    border: '#E2E6EC',
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    monoFamily: MONO,
    headingWeight: 600,
    fontImportHref:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
  },
  radii: { sm: 4, md: 6, lg: 8, full: 9999 },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// EXAMPLE client preset — shows how little it takes to rebrand (a distinct teal accent).
// Copy this block, rename, change `accent` (+ `name`), then activate it at the bottom.
// ─────────────────────────────────────────────────────────────────────────────────────────────
export const ACME_BRAND: BrandConfig = {
  ...CERTEN_BRAND,
  name: 'ACME',
  productLabel: 'Authorization Console',
  accent: { main: '#0F766E', light: '#5EEAD4', dark: '#115E59', contrastText: '#FFFFFF' },
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// ACTIVE BRAND — switch this single line to ship a different client's theme.
// ════════════════════════════════════════════════════════════════════════════════════════════
export const BRAND: BrandConfig = CERTEN_BRAND;
