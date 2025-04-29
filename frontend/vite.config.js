/*
 * File Path: frontend/vite.config.js
 * Purpose: Configures Vite for the frontend development server and build process in IDURAR ERP/CRM.
 * How It Works:
 *   - Loads environment variables based on mode (development, production).
 *   - Sets up Vite with React plugin for JSX support and Fast Refresh.
 *   - Defines aliases for imports (e.g., @ for src/).
 *   - Configures the development server with port, proxy, and HMR settings.
 *   - Optimizes dependencies (e.g., lodash) for build performance.
 * Dependencies:
 *   - vite: Core build tool (version ^5.4.8).
 *   - @vitejs/plugin-react: React support (version ^4.3.2).
 *   - path: Resolves aliases.
 * Change Log:
 *   - 04/03/2025: Disabled HMR to stabilize dev server.
 *   - 04/23/2025: Added lodash optimization for useLiveFeed.js.
 *     - Why: Resolve lodash.debounce import error and optimize bundle (User, 04/23/2025).
 *     - How: Added optimizeDeps.include for lodash/debounce.
 *   - 05/03/2025: Fixed WebSocket conflict and re-enabled HMR.
 *     - Why: Vite WebSocket on port 3000 conflicted with socket.io on port 8888 (User, 05/03/2025).
 *     - How: Added /socket.io proxy to http://localhost:8888, re-enabled HMR on port 3001.
 *     - Test: Run `npm run dev`, verify no WebSocket errors, LiveFeed.jsx receives socket.io events.
 * Test Instructions:
 *   - Run `npm run dev`: Verify dev server starts, no lodash or WebSocket errors.
 *   - Navigate to /grok: Confirm LiveFeed.jsx renders, search works, socket.io events received.
 *   - Run `npm run build`: Verify build completes, check bundle size for lodash.
 * Future Enhancements:
 *   - Add more aliases (e.g., @components, @utils).
 *   - Optimize build with minification, tree-shaking (Sprint 4).
 * Self-Notes:
 *   - Nate: Added lodash optimization to fix useLiveFeed.js import error (04/23/2025).
 *   - Nate: Fixed WebSocket conflict with socket.io proxy and HMR port (05/03/2025).
 */
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const config = {
    plugins: [react()],
    resolve: {
      base: '/',
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 3000,
      host: true,
      hmr: {
        port: 3001, // Distinct port for HMR WebSocket
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:8888',
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 3000,
    },
    optimizeDeps: {
      include: ['lodash/debounce'], // Optimize lodash for useLiveFeed.js
    },
  };
  return defineConfig(config);
};
