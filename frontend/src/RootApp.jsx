/* File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\RootApp.jsx */

/* File Description:
 * - Purpose: Root entry point, sets up Redux, routing, and suspense for lazy-loaded IdurarOs.
 * - Functionality:
 *   - Wraps the app in Redux Provider, BrowserRouter, and App (Ant Design) for global state, routing, and UI components.
 *   - Renders IdurarOs as the main app component with Suspense for lazy loading.
 * - Structure:
 *   - Uses Provider from react-redux for Redux store.
 *   - Uses BrowserRouter from react-router-dom for routing.
 *   - Uses App from antd for Ant Design components.
 *   - Uses Suspense for lazy loading IdurarOs.
 * - Connections:
 *   - Child: IdurarOs.jsx (main app component).
 *   - Redux: store from redux/store.js.
 * - Current Features:
 *   - Sets up global providers for the app.
 *   - Handles lazy loading with Suspense.
 * - Status:
 *   - As of 04/07/2025, renders correctly with fixed routing.
 * - Updates (04/07/2025):
 *   - Ensured React Router future flags are applied to suppress warnings.
 *     - Why: Warnings about v7_startTransition and v7_relativeSplatPath persisted.
 *     - How: Added future prop to BrowserRouter with v7_startTransition and v7_relativeSplatPath set to true.
 *   - Next Steps: Verify warnings are suppressed, monitor for routing issues.
 * - Future Enhancements:
 *   - Add global error boundary to catch render errors.
 *   - Implement theme provider for dynamic theming (e.g., dark mode).
 *   - Add initial state check to redirect logged-in users on app load.
 *   - Add analytics tracking for app usage metrics.
 *   - Implement service worker for offline support.
 *   - Add global loading state for initial app load.
 *   - Add support for multiple languages in initial render.
 * - Known Issues:
 *   - IdurarOs.jsx doesn't re-render post-login, blocking navigation until refresh.
 *   - Possible suspense or routing context issue preventing route updates.
 */

import './style/app.css';
import { Suspense, lazy } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '@/redux/store';
import { App } from 'antd';
import PageLoader from '@/components/PageLoader';

const IdurarOs = lazy(() => import('./apps/IdurarOs'));

export default function RootApp() {
  console.log('RootApp rendering');
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Provider store={store}>
        <App>
          <Suspense fallback={<PageLoader />}>
            {/* Note: IdurarOs.jsx handles state-based routing; Login.jsx triggers navigation */}
            <IdurarOs />
          </Suspense>
        </App>
      </Provider>
    </BrowserRouter>
  );
}
