/*
 * File Path: frontend/vite.config.js
 * Purpose: Configures Vite for the frontend development server and build process in IDURAR ERP/CRM.
 * How It Works:
 *   - Loads environment variables based on mode (development, production).
 *   - Sets up Vite with React plugin for JSX support and Fast Refresh.
 *   - Defines aliases for imports (e.g., @ for src/).
 *   - Configures the development server with port, proxy, and HMR settings.
 *   - Optimizes dependencies (e.g., lodash, @vis.gl/react-maplibre, mapbox-gl) for build performance.
 * Dependencies:
 *   - vite: Core build tool (version ^5.4.8).
 *   - @vitejs/plugin-react: React support (version ^4.3.2).
 *   - path: Resolves aliases.
 * Change Log:
 *   - 04/03/2025: Disabled HMR to stabilize dev server.
 *   - 04/23/2025: Added lodash optimization for useLiveFeed.js.
 *   - 05/03/2025: Fixed WebSocket conflict and re-enabled HMR.
 *   - 05/08/2025: Aliased react-map-gl to @vis.gl/react-maplibre (Grok).
 *     - Why: Vite failed to resolve react-map-gl/maplibre due to nested specifier (User, 05/02/2025).
 *     - How: Added aliases for react-map-gl and react-map-gl/maplibre to @vis.gl/react-maplibre, updated optimizeDeps.
 *     - Test: Run `npm run dev`, verify Mapbox map renders, no Vite errors.
 *   - 05/08/2025: Reapplied to resolve CACError (Grok).
 *   - 05/08/2025: Disabled HMR to fix WebSocket issues (Grok).
 *     - Why: TaskList.jsx buttons not enabling due to HMR-induced WebSocket failures (User, 05/08/2025).
 *     - How: Set server.hmr to false, preserved proxy and optimizations.
 *     - Test: Run `npm run dev`, verify frontend loads, no WebSocket failures, buttons enable.
 * Test Instructions:
 *   - Run `npm run dev`: Verify dev server starts, no react-map-gl or WebSocket errors.
 *   - Navigate to /grok: Confirm Mapbox map renders, LiveFeed.jsx receives socket.io events.
 *   - Run `npm run build`: Verify build completes, check bundle size.
 * Rollback Instructions:
 *   - Revert to vite.config.js.bak (`copy frontend\vite.config.js.bak frontend\vite.config.js`).
 *   - Verify frontend builds without Mapbox integration.
 * Future Enhancements:
 *   - Add more aliases (e.g., @components, @utils).
 *   - Optimize build with minification, tree-shaking (Sprint 4).
 */

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Esbuild plugin for Windows path normalization
const windowsPathPlugin = {
  name: 'windows-path-normalization',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.path.includes('\\')) {
        return { path: args.path.replace(/\\/g, '/'), external: false };
      }
      return null;
    });
  },
};

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  const config = {
    plugins: [react(), windowsPathPlugin],
    resolve: {
      base: '/',
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'react-map-gl': '@vis.gl/react-maplibre', // Alias default import
        'react-map-gl/maplibre': '@vis.gl/react-maplibre', // Alias submodule import
      },
      conditions: ['development', 'module', 'browser'], // Prioritize ES modules
      mainFields: ['module', 'browser', 'main'], // Prioritize ESM entry points
    },
    server: {
      port: 3000,
      host: true,
      hmr: false, // Disable HMR to prevent WebSocket issues
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
      include: [
        'lodash/debounce',
        '@vis.gl/react-maplibre', // Direct module
        'mapbox-gl',
      ],
      force: true, // Force pre-bundling
      esbuildOptions: {
        target: 'esnext',
        platform: 'browser',
        resolveExtensions: ['.js', '.jsx', '.ts', '.tsx'],
        plugins: [windowsPathPlugin],
      },
    },
  };
  return defineConfig(config);
};
