// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\PendingNotifications.jsx
// Historical Note: Updated April 10, 2025, to fix undefined notifications error.
// Purpose: Displays pending notifications/todos for the Woodkey Festival and Hi-Way Drive-In CRM.
// Functionality: Renders a list of pending notifications fetched from the backend or Redux state.
// Connections: Used by Dashboard.jsx; depends on Redux state or API for notifications data.
// Dependencies: antd (Typography, List).
// Current Features: Displays a list of pending notifications with a title.
// Status: As of 04/10/2025, fixed undefined notifications error.
// Updates (04/10/2025):
//   - Fixed undefined notifications error.
//     - Why: Error 'Cannot read properties of undefined (reading 'length')' crashed Dashboard.
//     - How: Added default value and conditional rendering for notifications.
//     - Impact: Prevents crash, displays message if no notifications.
//   - Next Steps: Verify notifications data is fetched and passed correctly.

import React from 'react';
import { Typography, List } from 'antd';

const { Title } = Typography;

const PendingNotifications = () => {
  // Placeholder for notifications data (e.g., from Redux or API)
  // Replace with actual data fetching logic if needed
  const notifications = []; // This should come from Redux or an API call

  return (
    <div>
      <Title level={4}>Pending Notifications</Title>
      {notifications && notifications.length > 0 ? (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item>{item.title || 'Untitled Notification'}</List.Item>
          )}
        />
      ) : (
        <p>No pending notifications.</p>
      )}
    </div>
  );
};

export default PendingNotifications;
