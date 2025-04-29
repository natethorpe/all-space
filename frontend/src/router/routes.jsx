/*
 * Change Log:
 *   - 04/21/2025: Removed duplicate /employeelog routes and EmployeeLog-vXXX imports.
 *     - Why: Routing conflicts from multiple EmployeeLog versions (User, 04/21/2025).
 *     - How: Kept single EmployeeLog.jsx route, ensured lazy loading.
 *     - Test: Navigate to /employee-log, verify single EmployeeLog.jsx loads.
 */

import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));
const DashboardWithBoundary = lazy(() => import('@/pages/Dashboard'));
const GrokUI = lazy(() => import('@/pages/GrokUI'));
const SponsorProfile = lazy(() => import('@/pages/SponsorProfile'));
const EmployeeLog = lazy(() => import('@/pages/EmployeeLog'));

let routes = {
  expense: [],
  default: [
    { path: '/login', element: null },
    { path: '/logout', element: <Logout /> },
    { path: '/', element: <DashboardWithBoundary />, layout: 'erp' },
    { path: '/dashboard', element: <DashboardWithBoundary />, layout: 'erp' },
    { path: '/grok', element: <GrokUI />, layout: 'erp' },
    { path: '/sponsor/:id', element: <SponsorProfile />, layout: 'erp' },
    { path: '/employee-log', element: <EmployeeLog />, layout: 'erp' },
    { path: '*', element: <NotFound /> },
  ],
};

export default routes;
