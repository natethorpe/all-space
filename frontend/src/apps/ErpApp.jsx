/*
 * File Path: frontend/src/apps/ErpApp.jsx
 * Purpose: Renders authenticated routes for IDURAR ERP CRM via AppRouter.jsx with navigation.
 * How It Works:
 *   - Wraps AppRouter.jsx in Ant Design Layout with Sider for navigation.
 *   - Integrates with Redux for auth state and theme settings.
 *   - Delegates routing to AppRouter.jsx, which uses routes.jsx for paths like /grok, /dashboard.
 * Dependencies:
 *   - react: Core library (version 18.3.1).
 *   - antd: Layout, ConfigProvider, Menu for UI and theming (version 5.24.6).
 *   - react-redux: useSelector for auth state (version 9.1.0).
 *   - react-router-dom: useNavigate, useLocation for navigation (version 6.22.0).
 *   - AppRouter.jsx: Defines authenticated routes.
 *   - routes.jsx: Provides route definitions.
 * Dependents:
 *   - IdurarOs.jsx: Renders ErpApp for authenticated users.
 * Why It’s Here:
 *   - Provides authenticated routing and navigation for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/23/2025: Reconstructed to fix 'React is not defined' error.
 *   - 04/24/2025: Updated to use AppRouter.jsx with routes.jsx.
 *   - 04/24/2025: Added Sider with Menu for navigation.
 *   - 04/24/2025: Fixed Sider import error.
 *     - Why: SyntaxError: antd does not provide export named 'Sider' (User, 04/24/2025).
 *     - How: Changed import to Layout.Sider, retained navigation Menu.
 *     - Test: Run `npm run dev`, login, navigate to /dashboard, verify Sider with Menu, click /grok, confirm GrokUI.jsx renders.
 * Test Instructions:
 *   - Run `npm run dev`, login, navigate to /dashboard: Verify Sider with Menu, Dashboard.jsx renders, console logs “ErpApp: Rendering AppRouter”.
 *   - Click /grok in Menu: Verify GrokUI.jsx renders, console logs “AppRouter: Rendering routes, authenticated: true”.
 *   - Check browser console: Confirm no Sider import errors, navigation works.
 * Future Enhancements:
 *   - Add dynamic theme switching (Sprint 4).
 *   - Support multi-tenant routing (Sprint 6).
 * Self-Notes:
 *   - Nate: Fixed Sider import to restore login and navigation (04/24/2025).
 * Rollback Instructions:
 *   - If UI fails: Copy ErpApp.jsx.bak to ErpApp.jsx (`copy frontend\src\apps\ErpApp.jsx.bak frontend\src\apps\ErpApp.jsx`).
 *   - Verify /grok and /dashboard render after rollback.
 */
import React from 'react';
import { Layout, ConfigProvider, Menu } from 'antd';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { selectAuth } from '@/redux/auth/selectors';
import AppRouter from '@/router/AppRouter';

const { Header, Content, Footer, Sider } = Layout;

const ErpApp = () => {
  const { theme } = useSelector(selectAuth);
  const navigate = useNavigate();
  const location = useLocation();
  console.log('ErpApp: Rendering AppRouter with theme:', theme, 'Current route:', location.pathname);

  const menuItems = [
    { key: '/dashboard', label: 'Dashboard' },
    { key: '/grok', label: 'Console' },
    { key: '/sponsor/:id', label: 'Sponsor Profile' },
    { key: '/employee-log', label: 'Employee Log' },
  ];

  try {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: theme?.colorPrimary || '#339393' } }}>
        <Layout className="erp-layout" style={{ minHeight: '100vh' }}>
          <Sider width={200} style={{ background: '#001529' }}>
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ height: '100%', borderRight: 0, color: '#fff' }}
              theme="dark"
            />
          </Sider>
          <Layout>
            <Header style={{ background: '#001529', color: '#fff', display: 'flex', alignItems: 'center' }}>
              <div className="logo">IDURAR ERP CRM</div>
            </Header>
            <Content className="erp-content" style={{ margin: '16px' }}>
              <AppRouter />
            </Content>
            <Footer style={{ textAlign: 'center' }}>
              IDURAR ERP CRM ©2025 Created by Allur Team
            </Footer>
          </Layout>
        </Layout>
      </ConfigProvider>
    );
  } catch (err) {
    console.error('ErpApp: Runtime error:', err);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Application Error</h2>
        <p>{err.message}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }
};

export default ErpApp;
