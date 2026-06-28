/**
 * CERTEN Design System — corporate/enterprise SaaS theme, fully derived from `brand.ts`.
 *
 * This file builds the MUI theme and the design tokens the components consume. It contains NO
 * literal brand colors of its own — everything flows from the single `BRAND` config in `brand.ts`,
 * so the entire cockpit can be re-themed for a different client by editing that one file.
 *
 * Look & feel: light, neutral-first, restraint over drama. Slate carries ~95% of the UI; the
 * brand accent appears only on the primary action and active state. No neon gradients, no glow
 * shadows — hairline borders and soft, low-contrast elevation. (A deliberate pivot away from the
 * earlier edgy dark control-room aesthetic, toward established B2B software.)
 *
 * Export names are kept stable (CERTEN_COLORS, NEUTRAL, SHADOW, SURFACE, theme, RADII, MOTION,
 * MONO_FAMILY, hashDisplaySx) so existing component imports keep working.
 */

import { createTheme, Theme, ThemeOptions, alpha } from '@mui/material/styles';
import { BRAND } from './brand';

/**
 * Brand + semantic colors, derived from `BRAND`. Tuned for legibility on a LIGHT canvas:
 * `.main` is on-surface text/icon-safe, `.dark` is for small text on tinted fills,
 * `.light` is fill-only (too pale for text on white).
 */
export const CERTEN_COLORS = {
  primary: { ...BRAND.accent, contrastText: BRAND.accent.contrastText ?? '#ffffff' },
  // "secondary" is intentionally neutral slate — neutral-first means lingering secondary
  // usages should read as quiet gray, never as a second brand color.
  secondary: { main: BRAND.neutral[600], light: BRAND.neutral[500], dark: BRAND.neutral[700], contrastText: '#ffffff' },
  success: BRAND.status.success,
  error: BRAND.status.error,
  warning: BRAND.status.warning,
  info: BRAND.status.info,
};

/** Neutral slate ramp — the workhorse of the corporate look. */
export const NEUTRAL = BRAND.neutral;

const SURFACES = {
  default: BRAND.surfaces.canvas,
  paper: BRAND.surfaces.paper,
  raised: BRAND.surfaces.paper,
  subtle: BRAND.surfaces.subtle,
  overlay: BRAND.surfaces.overlay,
  sunken: BRAND.surfaces.sunken,
  border: BRAND.surfaces.border,
};

/** Soft, neutral elevation — corporate restraint, never accent-tinted glow. */
export const SHADOW = {
  xs: '0 1px 2px rgba(16,24,40,0.05)',
  sm: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.08)',
  md: '0 2px 4px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.08)',
  lg: '0 8px 24px rgba(16,24,40,0.10)',
};

export const RADII = BRAND.radii;

export const MOTION = {
  ease: {
    productive: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
    expressive: 'cubic-bezier(0.4, 0.14, 0.3, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  duration: { instant: '100ms', quick: '150ms', moderate: '250ms', expressive: '400ms', dramatic: '600ms' },
};

export const MONO_FAMILY = BRAND.typography.monoFamily;

export const hashDisplaySx = {
  fontFamily: MONO_FAMILY,
  fontSize: '0.8125rem',
  letterSpacing: '0.02em',
  wordBreak: 'break-all' as const,
  px: 1.5,
  py: 0.75,
  borderRadius: `${RADII.sm}px`,
  border: '1px solid',
  borderColor: SURFACES.border,
  bgcolor: NEUTRAL[50],
  color: NEUTRAL[700],
};

const HEADING = BRAND.typography.headingWeight;

const typography: ThemeOptions['typography'] = {
  fontFamily: BRAND.typography.fontFamily,
  h1: { fontWeight: HEADING, fontSize: '2.5rem', lineHeight: 1.15, letterSpacing: '-0.025em' },
  h2: { fontWeight: HEADING, fontSize: '1.875rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  h3: { fontWeight: HEADING, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35, letterSpacing: '-0.01em' },
  h5: { fontWeight: 600, fontSize: '1.0625rem', lineHeight: 1.5 },
  h6: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.5, letterSpacing: '0' },
  body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  button: { textTransform: 'none' as const, fontWeight: 600, fontSize: '0.875rem' },
  caption: { fontSize: '0.75rem', lineHeight: 1.4 },
  overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
};

const getComponentOverrides = (): ThemeOptions['components'] => {
  const surfaces = SURFACES;
  const productive = `${MOTION.duration.quick} ${MOTION.ease.productive}`;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        body: {
          scrollbarColor: `${NEUTRAL[300]} ${surfaces.default}`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': { width: 8, height: 8 },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            backgroundColor: NEUTRAL[300],
            borderRadius: 4,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: RADII.sm, padding: '8px 16px', fontWeight: 600, transition: `all ${productive}` },
        contained: {
          boxShadow: SHADOW.xs,
          '&:hover': { boxShadow: SHADOW.sm },
        },
        outlined: {
          borderColor: surfaces.border,
          color: NEUTRAL[700],
          '&:hover': { borderColor: NEUTRAL[300], backgroundColor: NEUTRAL[50] },
        },
        text: { color: NEUTRAL[700], '&:hover': { backgroundColor: NEUTRAL[100] } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: RADII.lg,
          backgroundImage: 'none',
          backgroundColor: surfaces.paper,
          boxShadow: SHADOW.sm,
          border: `1px solid ${surfaces.border}`,
          transition: `all ${productive}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: surfaces.paper },
        outlined: { borderColor: surfaces.border },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: RADII.sm, fontWeight: 600 },
        outlined: { borderColor: surfaces.border },
        colorPrimary: { backgroundColor: alpha(CERTEN_COLORS.primary.main, 0.10), color: CERTEN_COLORS.primary.dark },
        colorSecondary: { backgroundColor: NEUTRAL[100], color: NEUTRAL[700] },
        colorSuccess: { backgroundColor: alpha(CERTEN_COLORS.success.main, 0.10), color: CERTEN_COLORS.success.dark },
        colorError: { backgroundColor: alpha(CERTEN_COLORS.error.main, 0.10), color: CERTEN_COLORS.error.dark },
        colorWarning: { backgroundColor: alpha(CERTEN_COLORS.warning.main, 0.10), color: CERTEN_COLORS.warning.dark },
        colorInfo: { backgroundColor: alpha(CERTEN_COLORS.info.main, 0.10), color: CERTEN_COLORS.info.dark },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          color: NEUTRAL[500],
          borderColor: surfaces.border,
          '&.Mui-selected': {
            color: CERTEN_COLORS.primary.dark,
            backgroundColor: alpha(CERTEN_COLORS.primary.main, 0.08),
            '&:hover': { backgroundColor: alpha(CERTEN_COLORS.primary.main, 0.12) },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 8, backgroundColor: NEUTRAL[200] },
        bar: { borderRadius: 6 },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: surfaces.border } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: NEUTRAL[800], color: '#fff', borderRadius: RADII.sm, fontSize: '0.75rem', padding: '8px 12px' },
        arrow: { color: NEUTRAL[800] },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: RADII.lg, boxShadow: SHADOW.lg } } },
    MuiPopover: { styleOverrides: { paper: { borderRadius: RADII.md, boxShadow: SHADOW.md, border: `1px solid ${surfaces.border}` } } },
  };
};

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: CERTEN_COLORS.primary,
    secondary: CERTEN_COLORS.secondary,
    background: { default: SURFACES.default, paper: SURFACES.paper },
    text: { primary: NEUTRAL[900], secondary: NEUTRAL[500], disabled: NEUTRAL[400] },
    error: CERTEN_COLORS.error,
    warning: CERTEN_COLORS.warning,
    success: CERTEN_COLORS.success,
    info: CERTEN_COLORS.info,
    divider: SURFACES.border,
    action: { hover: 'rgba(15, 23, 42, 0.04)', selected: 'rgba(15, 23, 42, 0.06)' },
  },
  typography,
  shape: { borderRadius: RADII.md },
  components: getComponentOverrides(),
});

export const SURFACE = SURFACES;
export const theme = lightTheme;
