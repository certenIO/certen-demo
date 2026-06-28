import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { BRAND } from './brand';
import { App } from './App';

// ── Drive the document chrome from the single BRAND source ──────────────────────────────────────
// Tab title, web-font loading, and the first-paint canvas color all flow from brand.ts, so a client
// rebrand never has to touch index.html — editing brand.ts re-themes everything, including these.
document.title = `${BRAND.name} · ${BRAND.productLabel}`;
document.documentElement.style.backgroundColor = BRAND.surfaces.canvas;
if (BRAND.typography.fontImportHref) {
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = BRAND.typography.fontImportHref;
  document.head.appendChild(fontLink);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
