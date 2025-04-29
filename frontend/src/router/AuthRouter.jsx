/*
 * File Path: frontend/src/router/AuthRouter.jsx
 * Purpose: Manages routing for unauthenticated users in IDURAR ERP CRM.
 * How It Works:
 *   - Renders routes for login, logout, password reset, and not-found pages.
 *   - Redirects authenticated users to /dashboard (default view).
 *   - Redirects unauthenticated users to /login for protected routes.
 * Dependencies:
 *   - react, react-router-dom: Routing and navigation (version 18.3.1, 6.22.0).
 *   - react-redux: useSelector for auth state (version 9.1.0).
 *   - antd: Lazy-loaded components (version 5.24.6).
 * Dependents:
 *   - IdurarOs.jsx: Renders AuthRouter for unauthenticated users.
 * Change Log:
 *   - 04/03/2025: Changed NotFound to lazy import, added logging.
 *   - 04/24/2025: Changed authenticated redirect to /grok.
 *   - 04/24/2025: Changed authenticated redirect to /dashboard.
 *     - Why: Dashboard is preferred default view post-login (User, 04/24/2025).
 *     - How: Updated Navigate to /dashboard for isLoggedIn: true, added debug logs.
 *     - Test: Run `npm run dev`, login, verify redirect to /dashboard, console logs “AuthRouter: Authenticated, redirecting to /dashboard”.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /: Verify redirect to /login if unauthenticated, /dashboard if authenticated.
 *   - Login with admin@idurarapp.com/admin123: Confirm redirect to /dashboard, console logs “AuthRouter: Authenticated, redirecting to /dashboard”.
 *   - Navigate to /forgetpassword: Verify ForgetPassword renders, no redirect if unauthenticated.
 *   - Check browser console: Confirm no routing errors, AuthRouter logs present.
 * Future Enhancements:
 *   - Add loading states for lazy-loaded components (Sprint 4).
 *   - Support multi-language routing for login pages (Sprint 5).
 * Self-Notes:
 *   - Nate: Updated redirect to /dashboard for authenticated users (04/24/2025).
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import { lazy } from 'react';

const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const ForgetPassword = lazy(() => import('@/pages/ForgetPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

export default function AuthRouter() {
  const { isLoggedIn } = useSelector(selectAuth);
  console.log('AuthRouter rendering, isLoggedIn:', isLoggedIn);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Navigate to="/login" replace />} />
      <Route path="/forgetpassword" element={<ForgetPassword />} />
      <Route path="/resetpassword/:userId/:resetToken" element={<ResetPassword />} />
      <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
