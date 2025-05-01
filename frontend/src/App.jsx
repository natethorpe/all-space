/*
 * File Path: frontend/src/App.jsx
 * Purpose: Main application entry point for Allur Space Console, defining routes and wrapping with Ant Design's App component.
 * How It Works:
 *   - Sets up React Router with routes for GrokUI, EmployeeLog, and other pages.
 *   - Wraps the app in Ant Design's App component to provide dynamic theming for message, notification, and modal components.
 * Dependencies:
 *   - React: Component rendering (version 18.3.1).
 *   - react-router-dom: Client-side routing (version 6.29.0).
 *   - antd: App component for theming (version 5.24.6).
 *   - GrokUI.jsx: Main dashboard component.
 *   - EmployeeLog.jsx: Employee log page component.
 * Why It’s Here:
 *   - Serves as the root component for Sprint 2, integrating routing and theming (04/30/2025).
 * Change Log:
 *   - 04/30/2025: Added Ant Design App component to fix message warning (Grok).
 *     - Why: [antd: message] warning in useTasks.js due to missing dynamic theme context (User, 04/30/2025).
 *     - How: Wrapped Router in App component, preserved existing routes.
 *     - Test: Load /grok, submit task, verify no [antd: message] warning in console.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit "Build CRM system".
 *   - Verify no [antd: message] warning in browser console.
 *   - Navigate to /employeelog, confirm EmployeeLog renders.
 *   - Check browser console for routing or rendering errors.
 * Rollback Instructions:
 *   - Revert to App.jsx.bak (`mv frontend/src/App.jsx.bak frontend/src/App.jsx`).
 *   - Verify /grok loads and tasks can be submitted.
 * Future Enhancements:
 *   - Add authentication middleware for protected routes (Sprint 3).
 *   - Support dynamic theme switching (Sprint 5).
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { App } from 'antd';
import GrokUI from './pages/GrokUI';
import EmployeeLog from './pages/EmployeeLog'; // Use the latest version, avoiding versioned files

const routes = [
  { path: '/', name: 'Home', element: <GrokUI /> },
  { path: '/grok', name: 'Grok', element: <GrokUI /> },
  { path: '/employeelog', name: 'EmployeeLog', element: <EmployeeLog /> },
];

function AppComponent() {
  return (
    <App>
      <Router>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </Router>
    </App>
  );
}

export default AppComponent;
