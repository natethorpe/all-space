/*
 * File Path: frontend/src/apps/ErpApp.jsx
 * Purpose: Main application wrapper for Allur Space Console, providing context, layout, and routing.
 * How It Works:
 *   - Wraps the app in AppContextProvider and ConfigProvider for theme and context.
 *   - Renders Layout with Header, Sider (navigation), and Content for dashboard and routes.
 *   - Uses antd App component to enable dynamic theming for message API.
 * Dependencies:
 *   - React: Core library (version 18.3.1).
 *   - antd: ConfigProvider, App, Layout, Menu for UI and theming (version 5.24.6).
 *   - AppContextProvider: Application context.
 *   - AppRouter: Routing component.
 * Why It’s Here:
 *   - Serves as the top-level app component for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized app with context and routing.
 *   - 04/29/2025: Fixed antd message context warning.
 *   - 04/29/2025: Fixed context consumer errors.
 *   - 04/29/2025: Restored navigation, header, and dashboard layout.
 *     - Why: Updates stripped navigation and header, dashboard content failed to load (User, 04/29/2025).
 *     - How: Reintroduced Layout with Header, Sider, and Content, ensured AppRouter renders dashboard, fixed antd warning, preserved context and theming.
 *     - Test: Load /grok and /dashboard, verify navigation, header, and content render, no antd warnings.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok and /dashboard: Verify navigation bar, header, and content load, no antd message warnings.
 *   - Submit "Build CRM system": Confirm task appears, error messages display without warnings.
 *   - Check browser console: Confirm no context or antd-related errors.
 * Future Enhancements:
 *   - Add theme customization (Sprint 4).
 *   - Support internationalization (Sprint 5).
 * Self-Notes:
 *   - Nate: Restored full layout, fixed antd warning, preserved all functionality (04/29/2025).
 */
import React from 'react';
import { ConfigProvider, App, Layout, Menu } from 'antd';
import AppContextProvider from '../context/appContext';
import AppRouter from '../router/AppRouter';
import { useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const ErpApp = () => {
  const navigate = useNavigate();

  return (
    <AppContextProvider>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#339393',
            colorLink: '#1640D6',
            borderRadius: 0,
          },
        }}
      >
        <App>
          <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible>
              <Menu
                theme="dark"
                mode="inline"
                defaultSelectedKeys={['dashboard']}
                items={[
                  { key: 'dashboard', label: 'Dashboard', link: '/dashboard' },
                  { key: 'grok', label: 'Grok', link: '/grok' },
                  { key: 'settings', label: 'Settings', link: '/settings' },
                  { key: 'sponsor', label: 'Sponsor', link: '/sponsor/:id' },
                  { key: 'employee-log', label: 'Employee Log', link: '/employee-log' },
                ]}
                onClick={({ key }) => navigate(key)}
              />
            </Sider>
            <Layout>
              <Header style={{ background: '#fff', padding: 0, textAlign: 'center' }}>
                <h1>Allur Space Console</h1>
              </Header>
              <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
                <AppRouter />
              </Content>
            </Layout>
          </Layout>
        </App>
      </ConfigProvider>
    </AppContextProvider>
  );
};

export default ErpApp;
