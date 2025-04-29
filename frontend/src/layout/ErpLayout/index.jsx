// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\layout\ErpLayout\index.jsx
/* [Previous documentation remains the same until Updates section] */
/* - Updates (04/17/2025):
 *   - Reverted desktop layout to working state (April 16, 2025).
 *     - Why: Latest changes broke desktop layout.
 *     - How: Reverted to April 16, 2025 state and applied mobile-specific fixes.
 *     - Impact: Restores working desktop layout.
 *   - Fixed mobile padding to edge-to-edge.
 *     - Why: Mobile layout has padding, not flush with edges.
 *     - How: Removed all padding/margins on mobile, ensured 100vw width.
 *     - Impact: Mobile layout is flush with screen edges.
 * - Updates (04/18/2025):
 *   - Refined mobile layout for edge-to-edge display.
 *     - Why: Mobile layout still has slight padding.
 *     - How: Removed all remaining padding/margins, adjusted content width.
 *     - Impact: Mobile layout is fully edge-to-edge.
 *   - Added Grok Interface to menu and routing.
 *     - Why: Integrate new Grok UI page.
 *     - How: Added menu item and relies on AppRouter.jsx for routing.
 *     - Impact: Grok UI accessible via sidebar.
 *   - Fixed syntax error in menuItems.
 *     - Why: VSCode flagged error in 'Home' onClick handler.
 *     - How: Corrected arrow function syntax from 'onClick: =>' to 'onClick: () =>'.
 *     - Impact: Resolves syntax error, ensures navigation works.
 *   - Next Steps: Test layout on different screen sizes, verify button functionality, confirm no horizontal scrolling.
 * - Future Enhancements:
 *   - Add dynamic menu items based on user role.
 *   - Integrate ALLU branding in the logo (e.g., animated logo for SPHERE).
 *   - Add a collapsible sidebar toggle for better mobile UX.
 * - Dependencies on This Component:
 *   - AppRouter.jsx: Wraps authenticated routes.
 *   - Dashboard.jsx: Renders in the content area.
 *   - GrokUI.jsx: New page for Grok interface.
 * - This Component Depends On:
 *   - global.css: For layout styles.
 *   - Redux: For auth state.
 *   - React Router: For navigation.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import { logout } from '@/redux/auth/actions';

const { Header, Sider, Content } = Layout;

const ErpLayout = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authState = useSelector(selectAuth);
  const user = authState.current || { name: 'Unknown', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop' };
  const contentRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { key: 'home', label: 'Home', onClick: () => navigate('/home') }, // Fixed syntax error
    { key: 'sponsors', label: 'Sponsors', onClick: () => navigate('/sponsor-hub') },
    { key: 'events', label: 'Events', onClick: () => navigate('/events') },
    { key: 'grok', label: 'Grok Interface', onClick: () => navigate('/grok') },
    { key: 'settings', label: 'Settings', onClick: () => navigate('/settings') },
  ];

  const userMenuItems = [
    { key: 'settings', label: 'Settings', onClick: () => navigate('/settings') },
    { key: 'admin', label: 'Admin', onClick: () => navigate('/admin') },
    { key: 'logout', label: 'Logout', onClick: () => {
      dispatch(logout());
      navigate('/logout');
    } },
  ];

  useEffect(() => {
    if (contentRef.current) {
      const computedStyle = window.getComputedStyle(contentRef.current);
      console.log('ErpLayout - Computed styles for main.ant-layout-content:', {
        width: computedStyle.width,
        margin: computedStyle.margin,
        padding: computedStyle.padding,
        maxWidth: computedStyle.maxWidth,
        flex: computedStyle.flex,
        display: computedStyle.display,
      });
    }
  }, []);

  return (
    <>
      {/* Ensure proper viewport scaling on mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <Layout className="erp-layout" style={{ minHeight: '100vh', display: 'flex', width: '100%', margin: 0, padding: 0 }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={200}
          className="site-layout-background"
          breakpoint="lg"
          collapsedWidth="0"
          onBreakpoint={(broken) => {
            console.log('Sider breakpoint:', broken);
            setCollapsed(broken);
          }}
          style={{
            position: 'fixed',
            height: '100vh',
            zIndex: 2,
            overflow: 'auto',
            margin: 0,
            padding: 0,
          }}
        >
          <Menu
            mode="inline"
            defaultSelectedKeys={['dashboard']}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout
          className="erp-inner-layout"
          style={{
            flex: 1,
            minWidth: '100%',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            marginLeft: collapsed ? 0 : 200,
            transition: 'margin-left 0.2s',
            padding: 0,
          }}
        >
          <Header
            className="site-layout-background"
            style={{
              padding: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 1,
              width: '100%',
              boxSizing: 'border-box',
              margin: 0,
            }}
          >
            <div className="logo" style={{ marginLeft: 16 }}>Idurar ERP CRM</div>
            <div style={{ marginRight: 16, display: 'flex', alignItems: 'center' }}>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Avatar
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop'}
                  style={{ cursor: 'pointer' }}
                />
              </Dropdown>
            </div>
          </Header>
          <Content
            ref={contentRef}
            className="erp-content"
            style={{
              width: '100%',
              maxWidth: '100%',
              margin: 0,
              padding: 0,
              flex: 1,
              minWidth: '100%',
              boxSizing: 'border-box',
              display: 'block',
              overflowX: 'hidden',
            }}
          >
            {children}
          </Content>
        </Layout>

        {/* Global styles */}
        <style>{`
          @media (max-width: 992px) {
            .erp-layout {
              flex-direction: column;
              width: 100vw !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .site-layout-background {
              width: 100vw !important;
              position: fixed;
              z-index: 2;
              top: 0;
              left: 0;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .erp-inner-layout {
              margin-left: 0 !important;
              margin-top: 64px; /* Height of the header */
              width: 100vw !important;
              padding: 0 !important;
            }
            .erp-content {
              padding: 0 !important;
              width: 100vw !important;
              margin: 0 !important;
            }
            .logo {
              font-size: 16px !important;
            }
          }
          @media (min-width: 993px) {
            .erp-content {
              padding: 16px !important;
            }
          }
        `}</style>
      </Layout>
    </>
  );
};

export default ErpLayout;
