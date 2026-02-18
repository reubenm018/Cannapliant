import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy /api to the backend.
// VITE_API_URL can be set in a .env.local to point at a remote backend
// (e.g. your Railway URL) while still running the Vite dev server locally.
// Falls back to localhost:3001 when unset.
const apiTarget = process.env.VITE_API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
