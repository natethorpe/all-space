// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\EmployeeDash.jsx
// File Description:
// - Purpose: Displays a simple employee dashboard within the Dashboard.jsx component of the Woodkey Festival and Hi-Way Drive-In CRM, showing the user’s role and loading state.
// - Functionality:
//   - Renders the employee’s role (e.g., manager) and a loading message if applicable.
//   - Receives user and loading props from Dashboard.jsx.
// - Structure:
//   - Uses Ant Design’s Typography for consistent styling.
//   - Displays a title and role information.
//   - Shows a loading message if loading is true.
// - Connections:
//   - Parent: Dashboard.jsx (passes user and loading props).
//   - Child: None.
//   - Props: user (object with name and role), loading (boolean).
//   - Styles: Inline styles for visibility and layout; global.css (visibility fixes).
// - Current Features:
//   - Displays employee role and loading state.
// - Status:
//   - As of 04/04/2025, renders correctly within Dashboard.jsx after visibility fixes.
// - Updates (04/04/2025):
//   - Restored temporary test-content div to debug layout issues.
//   - Why: Layout broke after attempting to remove "Dashboard" menu item; restoring to working state at end of Prompt 4.
//   - How: Re-added the test-content div as it was present at the end of Prompt 4.
// - Future Enhancements:
//   - Add employee-specific tasks or actions.
//   - Display additional user info (e.g., email, last login).
//   - Add styling for better visual hierarchy (e.g., card layout).
// - Next Steps:
//   - Verify the component renders with the test div.
//   - Plan for task list integration.
import React, { useState, useEffect } from 'react';
import { Typography, Table, Button } from 'antd';
import moment from 'moment';

const { Title } = Typography;

const EmployeeDash = ({ user, loading }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Mock fetch; replace with real API later
    setLogs(JSON.parse(localStorage.getItem('employeeLogs') || '[]'));
  }, []);

  const logEvent = (type) => {
    const lastLog = logs[logs.length - 1];
    const log = {
      time: moment().format('YYYY-MM-DD HH:mm:ss'),
      type,
      hours: type === 'logout' && lastLog ? moment().diff(moment(lastLog.time), 'hours', true) : 0,
    };
    const updatedLogs = [...logs, log];
    setLogs(updatedLogs);
    localStorage.setItem('employeeLogs', JSON.stringify(updatedLogs));
  };

  const columns = [
    { title: 'Time', dataIndex: 'time', key: 'time' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Hours Worked', dataIndex: 'hours', key: 'hours', render: h => h.toFixed(2) },
  ];

  return (
    <div style={{ padding: '16px', background: '#fff', border: '1px solid #ddd' }}>
      <Title level={3}>Employee Dashboard</Title>
      <p>Role: {user?.role || 'Loading...'}</p>
      {loading && <p>Loading tasks...</p>}
      <Button onClick={() => logEvent('login')} style={{ marginRight: 8 }}>Log In</Button>
      <Button onClick={() => logEvent('logout')}>Log Out</Button>
      <Table dataSource={logs} columns={columns} rowKey="time" style={{ marginTop: 16 }} />
    </div>
  );
};

export default EmployeeDash;
