import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
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
