// C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\AdminSettings.jsx
// File Description:
// - Purpose: Displays admin settings within the Dashboard.jsx component of the Woodkey Festival and Hi-Way Drive-In CRM, providing controls for scheduling and other admin tasks (visible to admins only).
// - Functionality:
//   - Renders a title and a button for optimizing schedules (currently disabled).
//   - Receives dispatch and loading props from Dashboard.jsx.
// - Structure:
//   - Uses Ant Design’s Typography and Button for consistent styling.
//   - Displays a title and a disabled button.
// - Connections:
//   - Parent: Dashboard.jsx (passes dispatch and loading props).
//   - Styles: global.css (visibility fixes).
// - Current Features:
//   - Displays admin settings title and a placeholder button.
// - Status:
//   - As of 04/03/2025, logs confirm rendering, but content is not visible in Dashboard.jsx.
// - Updates (04/03/2025):
//   - Added test div to confirm rendering.
//   - Added test-content class for global CSS override.
// - Why: Debugs why AdminSettings content isn’t visible, ensures render.
// - How: Added test content, kept existing logic.
// - Future Enhancements:
//   - Add functional buttons for scheduling optimization.
//   - Support tier auto-assignment for sponsors.
// - Next Steps:
//   - Test with test div to confirm visibility.
//   - Inspect DOM if content is still hidden.

import React from 'react';
import { Typography, Button } from 'antd';

const { Title } = Typography;

const AdminSettings = ({ dispatch, loading }) => {
  console.log('AdminSettings rendering with props:', { dispatch, loading });

  return (
    <div>
      <Title level={3}>Admin Settings</Title>
      <div className="test-content" style={{ background: 'lightgray', padding: '20px', marginBottom: '20px', border: '2px solid gray', height: '100px', width: '100%' }}>
        AdminSettings Test Content - Should Be Visible
      </div>
      <Button disabled={loading}>Optimize Schedules</Button>
    </div>
  );
};

export default AdminSettings;
