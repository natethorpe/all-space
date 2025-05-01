/*
 * File Path: frontend/src/router/AppRouter.jsx
 * Purpose: Defines authenticated routes for Allur Space Console, rendering components like GrokUI.jsx and Dashboard.jsx.
 * How It Works:
 *   - Uses react-router-dom to define routes for authenticated users (e.g., /grok, /dashboard).
 *   - Wraps routes in a Suspense component with PageLoader fallback for lazy-loaded components.
 *   - Applies Ant Design theme via ConfigProvider (colorPrimary: #339393).
 * Mechanics:
 *   - Lazy-loads components (e.g., GrokUI.jsx, Dashboard.jsx) to optimize performance.
 *   - Uses Routes, Route, Navigate from react-router-dom for path-based routing.
 *   - Checks isAuthenticated to prevent unauthorized access, redirecting to /login.
 * Dependencies:
 *   - react, react-router-dom: Routing and navigation (version 18.3.1, 6.22.0).
 *   - antd: ConfigProvider for UI consistency (version 5.24.6).
 *   - react-redux: useSelector for auth state (version 9.1.0).
 *   - PageLoader/index.jsx: Loading spinner for Suspense fallback.
 *   - GrokUI.jsx: Rendered at /grok.
 *   - Dashboard.jsx: Rendered at /dashboard.
 * Dependents:
 *   - ErpApp.jsx: Uses AppRouter for authenticated routing.
 *   - IdurarOs.jsx: Indirectly renders AppRouter via ErpApp for authenticated users.
 * Why It’s Here:
 *   - Manages navigation for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized with routes for /grok, /dashboard.
 *   - 04/23/2025: Fixed SyntaxError by removing AppContext import.
 *   - 04/24/2025: Fixed redirect to /login despite valid token.
 *   - 04/24/2025: Fixed Navigate is not defined error.
 *   - 04/24/2025: Integrated full Dashboard.jsx for /dashboard route.
 *   - 04/29/2025: Enhanced error handling and logging.
 *     - Why: Persistent 404 errors and dashboard issues reported (User, 04/29/2025).
 *     - How: Added detailed logging, ensured dashboard route stability, preserved all routes and auth checks.
 *     - Test: Run `npm run dev`, login, navigate to /dashboard, verify Dashboard.jsx renders, console logs “AppRouter: Rendering routes”.
 * Test Instructions:
 *   - Run `npm run dev`, login, navigate to /grok: Verify GrokUI.jsx renders, console logs “AppRouter: Rendering routes, authenticated: true”.
 *   - Navigate to /dashboard: Verify Dashboard.jsx renders with sponsor summary, SponsorHub, Calendar, console logs “AppRouter: Rendering routes”.
 *   - Clear localStorage.auth, navigate to /grok: Confirm redirect to /login, console logs “AppRouter: Not authenticated, redirecting to /login”.
 *   - Check browser console: Confirm no errors, GrokUI.jsx and Dashboard.jsx logs present.
 * Future Enhancements:
 *   - Add dynamic route permissions based on user role (Sprint 5).
 * Self-Notes:
 *   - Nate: Enhanced logging, ensured dashboard stability, preserved all functionality (04/29/2025).
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { useSelector } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import PageLoader from '@/components/PageLoader';

const GrokUI = lazy(() => import('@/pages/GrokUI'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

export default function AppRouter() {
  const { isAuthenticated } = useSelector(selectAuth);
  const navigate = useNavigate();
  console.log('AppRouter: Rendering routes, authenticated:', isAuthenticated);

  // Handle unauthorized access
  React.useEffect(() => {
    if (!isAuthenticated) {
      console.log('AppRouter: Not authenticated, redirecting to /login');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  try {
    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#339393',
            colorLink: '#1640D6',
            borderRadius: 0,
          },
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/grok" element={<GrokUI />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sponsor/:id" element={<div>SponsorProfile Placeholder</div>} />
            <Route path="/employee-log" element={<div>EmployeeLog Placeholder</div>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
        </Suspense>
      </ConfigProvider>
    );
  } catch (err) {
    console.error('AppRouter: Runtime error:', err);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Routing Error</h2>
        <p>{err.message}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }
}
