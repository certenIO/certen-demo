import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Build stamp. Vite emits new hashed filenames every build, so a cached index.html silently
// serves an old bundle — which has repeatedly looked like a bug that was already fixed. Showing
// this in the UI makes "am I on the current build?" a five-second check.
const BUILD_ID = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react()],
  resolve: {
    alias: {
      // the cockpit reuses the orchestrator's (now isomorphic) scenario engine directly
      '@engine': fileURLToPath(new URL('../orchestrator/src', import.meta.url)),
    },
  },
  server: {
    port: 3001,
    strictPort: false,
    // allow importing the shared engine + contracts/deployments.json from outside the cockpit root
    fs: { allow: ['..'] },
  },
  preview: { port: 3001 },
});
