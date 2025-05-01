// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\columns.jsx
// File Description:
// - Purpose: Defines the columns for the Ant Design Table in SponsorHub.jsx, providing custom renderers for sponsor data and actions in the Woodkey Festival and Hi-Way Drive-In CRM.
// - Functionality:
//   - Exports a sponsorColumns function that returns an array of columns for the Table component, including fields like picture, name, tier, likeliness, cost, fit score, owner, and actions.
//   - Includes custom renderers for action buttons (email, schedule, edit).
// - Structure:
//   - Exports a named sponsorColumns function that takes props for action handlers.
//   - Defines columns with Ant Design Table column properties (title, dataIndex, key, render).
// - Connections:
//   - Used by: SponsorHub.jsx (imports columns for Table component).
//   - Props: Receives action handlers and dispatch from SponsorHub.jsx.
//   - Redux: loadSponsors from sponsors/actions.js (used in action handlers).
// - Current Features:
//   - Defines columns for sponsor data display.
//   - Provides action buttons for email, scheduling, and editing.
// - Status:
//   - As of 04/04/2025, updated to fix import issue in SponsorHub.jsx.
// - Updates (04/04/2025):
//   - Adjusted to handle null form prop.
//   - Why: SponsorHub.jsx does not pass a form prop, causing potential errors.
//   - How: Added conditional check for form before using setFieldsValue.
// - Future Enhancements:
//   - Add sorting functionality to columns (e.g., sort by fit score).
//   - Enhance action buttons with additional features (e.g., delete sponsor).
//   - Allur Crypto: Add wallet column, payment button.
//   - AI: Add priority score column from ai.js.
// - Next Steps:
//   - Verify columns render correctly in SponsorHub.jsx.
//   - Test action buttons for functionality.

import React from 'react';
import { Button, Space } from 'antd';
import { loadSponsors } from '@/redux/sponsors/actions';

export const sponsorColumns = (
  setEmailModalVisible,
  setEmailData,
  setEventModalVisible,
  setEventData,
  setEditModalVisible,
  setSponsorData,
  form,
  userRole
) => {
  const columns = [
    {
      title: 'Picture',
      dataIndex: 'profile_picture',
      key: 'profile_picture',
      render: (url) =>
        url ? (
          <img
            src={url}
            alt="Sponsor"
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            onError={(e) => {
              console.error('Image load failed for URL:', url);
              e.target.src = 'https://via.placeholder.com/40';
            }}
          />
        ) : 'N/A',
    },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Tier', dataIndex: 'tier_level', key: 'tier_level', sorter: (a, b) => (a.tier_level || '').localeCompare(b.tier_level || '') },
    { title: 'Likeliness', dataIndex: 'likeliness', key: 'likeliness', sorter: (a, b) => (a.likeliness || 0) - (b.likeliness || 0) },
    { title: 'Cost', dataIndex: 'est_cost', key: 'est_cost', sorter: (a, b) => (a.est_cost || 0) - (b.est_cost || 0), render: (cost) => `$${cost?.toLocaleString() || 0}` },
    { title: 'Fit Score', dataIndex: 'fit_score', key: 'fit_score', sorter: (a, b) => (a.fit_score || 0) - (b.fit_score || 0), render: (score) => score?.toFixed(1) || 'N/A' },
  ];

  if (userRole === 'manager') {
    columns.push({
      title: 'Owner',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (assignedTo) => (assignedTo ? assignedTo.name : 'Unassigned'),
    });
  }

  columns.push({
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (
      <Space size="middle">
        <Button
          onClick={() => {
            setEmailModalVisible(true);
            setEmailData({ sponsorId: record._id, subject: `Sponsorship Opportunity - ${record.name}`, body: record.emailDraft || 'No AI draft available' });
          }}
          disabled={!record.email}
        >
          Send AI Email
        </Button>
        <Button
          onClick={() => {
            setEventModalVisible(true);
            setEventData({ sponsorId: record._id, title: '', date: '', description: '' });
          }}
        >
          Schedule
        </Button>
        <Button
          onClick={() => {
            setEditModalVisible(true);
            setSponsorData({ ...record });
            if (form) {
              form.setFieldsValue(record);
            }
          }}
        >
          Edit
        </Button>
      </Space>
    ),
  });

  return columns;
};
