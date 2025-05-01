/*
 * File Path: frontend/src/components/PageLoader/index.jsx
 * Purpose: Renders a centered loading spinner for IDURAR ERP CRM during app initialization or auth sync.
 * How It Works:
 *   - Displays an Ant Design Spin component with a 64px LoadingOutlined icon.
 *   - Uses centerAbsolute class from global.css for absolute centering (position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)).
 *   - Rendered by ErpApp.jsx during settings fetch and IdurarOs.jsx during auth sync.
 * Mechanics:
 *   - Applies centerAbsolute styling to ensure spinner is centered in the viewport.
 *   - Uses Ant Design’s LoadingOutlined icon for consistent UI.
 * Dependencies:
 *   - antd: Spin, LoadingOutlined for loading UI (version 5.22.2).
 *   - global.css: centerAbsolute class for styling.
 * Dependents:
 *   - ErpApp.jsx: Renders PageLoader during settingsAction.list.
 *   - IdurarOs.jsx: Renders PageLoader during auth loading.
 * Why It’s Here:
 *   - Provides visual feedback during app initialization for Sprint 2 usability (04/07/2025).
 *   - Verifies PageLoader integration and styling for Sprint 2 (04/23/2025).
 * Key Info:
 *   - Centered using global.css centerAbsolute, compatible with transition.css fade.
 *   - No direct Socket.IO or API dependencies, purely UI-focused.
 * Change Log:
 *   - 04/07/2025: Initialized with Ant Design Spin and centerAbsolute styling.
 *   - 04/23/2025: Added debug logging for PageLoader rendering.
 *     - Why: Verify PageLoader integration for Sprint 2, ensure centering (User, 04/23/2025).
 *     - How: Added console.log for rendering, confirmed centerAbsolute styling from global.css.
 *     - Test: Run `npm run dev`, throttle network, verify PageLoader renders centered in ErpApp.jsx and IdurarOs.jsx, check console for render logs.
 * Test Instructions:
 *   - Run `npm run dev`: Verify PageLoader renders during ErpApp.jsx settings fetch, centered with 64px LoadingOutlined icon, console logs “PageLoader rendering”.
 *   - Navigate to /login in IdurarOs.jsx: Confirm PageLoader renders during auth sync, centered, console logs “PageLoader rendering”.
 *   - Throttle network (e.g., 3G in dev tools): Verify PageLoader remains centered, no overlap with transition.css fade, check global.css centerAbsolute application.
 *   - Check browser console: Confirm “PageLoader rendering with centerAbsolute styling” log during load.
 * Future Enhancements:
 *   - Add customizable spinner themes via Localization.jsx (Sprint 4).
 *   - Support loading progress indicators (Sprint 5).
 * Self-Notes:
 *   - Nate: Initialized PageLoader with Ant Design Spin for consistent UI (04/07/2025).
 *   - Nate: Added debug logging to verify rendering and centering for Sprint 2 (04/23/2025).
 *   - Nate: Triple-checked styling with global.css and integration with ErpApp.jsx, IdurarOs.jsx (04/23/2025).
 * Rollback Instructions:
 *   - If PageLoader fails to render or styling breaks: Copy PageLoader/index.jsx.bak to PageLoader/index.jsx (`mv frontend/src/components/PageLoader/index.jsx.bak frontend/src/components/PageLoader/index.jsx`).
 *   - Verify PageLoader renders centered during settings fetch and auth sync after rollback.
 */
import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const PageLoader = () => {
  console.log('PageLoader rendering with centerAbsolute styling');
  const antIcon = <LoadingOutlined style={{ fontSize: 64 }} spin />;
  return (
    <div className="centerAbsolute">
      <Spin indicator={antIcon} />
    </div>
  );
};

export default PageLoader;
