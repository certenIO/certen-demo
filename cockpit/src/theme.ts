/**
 * CERTEN Design System — ported from certen-web-app/src/theme.ts so the cockpit is visually
 * indistinguishable from the production app (dual-tone orange/purple, 5-tier dark depth,
 * unified motion language, monospace stack for hashes).
 */

import { createTheme, Theme, ThemeOptions, alpha } from '@mui/material/styles';

export const CERTEN_COLORS = {
  primary: { main: '#E67E22', light: '#F5A623', dark: '#B85C18', contrastText: '#ffffff' },
  secondary: { main: '#7C5CFC', light: '#9B82FD', dark: '#5A3DD6', contrastText: '#ffffff' },
  success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A' },
  error: { main: '#F43F5E', light: '#FB7185', dark: '#E11D48' },
  warning: { main: '#FACC15', light: '#FDE047', dark: '#EAB308' },
  info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9' },
};

const SURFACES = {
  dark: {
    default: '#0E0F16',
    paper: '#161822',
    raised: '#1E2030',
    overlay: '#262840',
    sunken: '#0C0D12',
  },
};

export const RADII = { sm: 8, md: 12, lg: 16, full: 9999 };

export const MOTION = {
  ease: {
    productive: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
    expressive: 'cubic-bezier(0.4, 0.14, 0.3, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  duration: { instant: '100ms', quick: '150ms', moderate: '250ms', expressive: '400ms', dramatic: '600ms' },
};

export const MONO_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace";

export const hashDisplaySx = {
  fontFamily: MONO_FAMILY,
  fontSize: '0.8125rem',
  letterSpacing: '0.02em',
  wordBreak: 'break-all' as const,
  px: 1.5,
  py: 0.75,
  borderRadius: `${RADII.sm}px`,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
};

const typography: ThemeOptions['typography'] = {
  fontFamily: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
  h1: { fontWeight: 800, fontSize: '2.75rem', lineHeight: 1.1, letterSpacing: '-0.03em' },
  h2: { fontWeight: 800, fontSize: '2rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.35, letterSpacing: '-0.01em' },
  h5: { fontWeight: 600, fontSize: '1.0625rem', lineHeight: 1.5 },
  h6: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.5, letterSpacing: '0.01em' },
  body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  button: { textTransform: 'none' as const, fontWeight: 600, fontSize: '0.875rem' },
  caption: { fontSize: '0.75rem', lineHeight: 1.4 },
  overline: { fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const },
};

const getComponentOverrides = (): ThemeOptions['components'] => {
  const surfaces = SURFACES.dark;
  const dividerColor = 'rgba(230, 126, 34, 0.12)';
  const productive = `${MOTION.duration.quick} ${MOTION.ease.productive}`;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        body: {
          scrollbarColor: `#2d2f45 ${surfaces.paper}`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': { width: 8, height: 8 },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            backgroundColor: '#2d2f45',
            borderRadius: 4,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: RADII.sm, padding: '12px 24px', fontWeight: 700, transition: `all ${productive}` },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: `0 6px 18px ${alpha(CERTEN_COLORS.primary.main, 0.35)}`, transform: 'translateY(-1px)' },
        },
        outlined: { borderWidth: 2, '&:hover': { borderWidth: 2 } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: RADII.lg,
          backgroundImage: 'none',
          boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,
          border: `1px solid rgba(255,255,255,0.06)`,
          transition: `all ${productive}`,
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: RADII.sm, fontWeight: 600 },
        colorPrimary: { backgroundColor: alpha(CERTEN_COLORS.primary.main, 0.15), color: CERTEN_COLORS.primary.main },
        colorSecondary: { backgroundColor: alpha(CERTEN_COLORS.secondary.main, 0.15), color: CERTEN_COLORS.secondary.light },
        colorSuccess: { backgroundColor: alpha(CERTEN_COLORS.success.main, 0.15), color: CERTEN_COLORS.success.main },
        colorError: { backgroundColor: alpha(CERTEN_COLORS.error.main, 0.15), color: CERTEN_COLORS.error.main },
        colorWarning: { backgroundColor: alpha(CERTEN_COLORS.warning.main, 0.15), color: CERTEN_COLORS.warning.main },
        colorInfo: { backgroundColor: alpha(CERTEN_COLORS.info.main, 0.15), color: CERTEN_COLORS.info.main },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
        bar: { borderRadius: 6 },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: dividerColor } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: surfaces.overlay, borderRadius: RADII.sm, fontSize: '0.75rem', padding: '8px 12px', border: `1px solid rgba(255,255,255,0.06)` },
      },
    },
  };
};

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: CERTEN_COLORS.primary,
    secondary: CERTEN_COLORS.secondary,
    background: { default: SURFACES.dark.default, paper: SURFACES.dark.paper },
    text: { primary: '#E8E8ED', secondary: '#A3A7BA' },
    error: CERTEN_COLORS.error,
    warning: CERTEN_COLORS.warning,
    success: CERTEN_COLORS.success,
    info: CERTEN_COLORS.info,
    divider: 'rgba(230, 126, 34, 0.12)',
    action: { hover: 'rgba(230, 126, 34, 0.06)' },
  },
  typography,
  shape: { borderRadius: RADII.md },
  components: getComponentOverrides(),
});

export const SURFACE = SURFACES.dark;
export const theme = darkTheme;
