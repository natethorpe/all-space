/* File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\main.jsx */

/* File Description:
 * - Purpose: Entry point for the Woodkey Festival and Hi-Way Drive-In CRM frontend, rendering the root React component (RootApp) into the DOM and setting up initial app configuration.
 * - Functionality:
 *   - Renders RootApp.jsx into the #root DOM element using React 18’s createRoot API.
 *   - Imports global CSS to apply app-wide styles and layout fixes.
 *   - Initializes Sentry for error monitoring.
 *   - Logs rendering for debugging purposes.
 * - Structure:
 *   - Uses createRoot from react-dom/client for modern React rendering.
 *   - Renders RootApp component as the root of the app.
 *   - Imports global.css for app-wide styling.
 * - Connections:
 *   - Parent: None (entry point).
 *   - Children: RootApp.jsx (root component).
 *   - Styles: global.css (global styles for layout fixes).
 * - Current Features:
 *   - Renders the app into #root element.
 *   - Logs rendering for debugging.
 *   - Sets up Sentry for error monitoring.
 * - Status:
 *   - As of 04/07/2025, confirmed as the sole entry point via index.html.
 * - Updates (04/07/2025):
 *   - Added Sentry initialization for error monitoring.
 *     - Why: To log errors as part of Phase 1 (April 6), and to fix import error in Dashboard.jsx.
 *     - How: Added Sentry.init with DSN and tracing configuration.
 *   - Next Steps: Verify Sentry logs errors, test app rendering.
 * - Future Enhancements:
 *   - Add strict mode for React debugging in development.
 *   - Implement service worker for offline support.
 *   - Add initial app loading animation.
 *   - Add error boundary wrapper for root render.
 *   - Add initial state hydration for faster app load.
 */

/* frontend/src/main.jsx */
import React from 'react';
import ReactDOM from 'react-dom/client';
import RootApp from './RootApp.jsx';
import './style/app.css';
import * as Sentry from '@sentry/react';

// Temporarily disable Sentry until a valid DSN is provided
// Sentry.init({
//   dsn: 'your-sentry-dsn', // Replace with actual DSN or remove
//   integrations: [Sentry.browserTracingIntegration()],
//   tracesSampleRate: 1.0,
// });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
