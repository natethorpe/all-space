// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\components\DataTable\DataTable.jsx
// Historical Note: Core table component, updated April 6, 2025, to fix Vite import error, remove PageHeader for antd v5 compatibility, debug rendering issue, and fix search functionality.
// Updated: 04/18/2025 - Added note for Grok integration
// Future Direction: Add sorting, filtering, and Grok-driven insights (e.g., sponsor fit scores) in table rows.
// Purpose: Renders a reusable table for entity data (e.g., sponsors) in the Woodkey Festival and Hi-Way Drive-In CRM.
// Functionality:
//   - Displays a table with configurable columns, pagination, and optional search/add features.
//   - Supports custom data via props or Redux-fetched data (not implemented here for simplicity).
//   - Uses CrudContext for modal actions (e.g., add/edit/delete).
// Structure:
//   - Uses a styled div instead of PageHeader (title, search, actions) and an Ant Design Table.
//   - AddNewItem sub-component handles the "Add" button with CrudContext-driven modal.
// Connections:
//   - Parent: SponsorHub.jsx (passes sponsors as dataSource, config, and columns).
//   - Context: src/context/crud/index.jsx (CrudContextProvider for modal states).
// Dependencies:
//   - react: Core library.
//   - antd: Table, Input, Button, Dropdown for UI.
//   - @ant-design/icons: Icons for actions.
//   - src/context/crud: useCrudContext for modal management.
//   - shortid: Unique keys for dynamic elements.
// Props:
//   - config: Object (entity, DATATABLE_TITLE, searchConfig) for table setup.
//   - dataTableColumns: Array of column definitions.
//   - dataSource: Custom data array (e.g., sponsors).
//   - showAddButton: Boolean to toggle "Add" button (default: true).
//   - loading: Boolean for loading state.
//   - rowKey: Function/string for row keys.
//   - pagination: Object for pagination settings.
//   - onChange: Function for table changes.
//   - setSearchTerm: Function to update search term (added for search functionality).
// Current Features:
//   - Renders table with custom columns and data.
//   - Supports add action via CrudContext.
// Status:
//   - As of 04/06/2025, search functionality fixed; useCrudContext error persists without CrudContextProvider.
// Updates (04/06/2025):
//   - Removed PageHeader import, replaced with styled div.
//     - Why: antd v5.14.1 (package.json) doesn’t export PageHeader; earlier v4 assumption was incorrect.
//     - How: Used a div with basic styling to mimic PageHeader layout.
//     - Impact: Resolves export error, maintains functionality.
//   - Confirmed CrudContextProvider compatibility.
//     - Why: src/context/crud/index.jsx matches expected structure.
//     - Impact: Ensures useCrudContext works when wrapped.
//   - Added debug logging for dataSource.
//     - Why: DataTable not rendering updated sponsors.
//     - How: Added useEffect to log dataSource on change.
//     - Impact: Confirms if DataTable receives updated data.
//   - Added key prop to Table to force re-render.
//     - Why: Table not re-rendering when dataSource updates.
//     - How: Added key={dataSource?.length || 0} to Table.
//     - Impact: Ensures Table re-renders with updated data.
//   - Fixed search functionality.
//     - Why: Search bar was not filtering the sponsor list.
//     - How: Added setSearchTerm prop and updated handleSearch to use it.
//     - Impact: Search now filters the sponsor list.
// Updates (04/18/2025):
//   - Added note for Grok integration.
//     - Why: Next step is to use GrokUI to fix useCrudContext error.
//     - How: Plan to submit prompt "Wrap DataTable in CrudContextProvider" via GrokUI.
//     - Impact: Prepares for automated fix in next session.
// Next Steps:
//   - Test rendering with SponsorHub after Grok fixes useCrudContext.
//   - Verify search functionality post-fix.
// Future Enhancements:
//   - Grok Integration: Add AI-driven column (e.g., "Suggested Action") via grokSlice.
//   - Scalability: Lazy-load data for large datasets.
//   - UX: Add inline editing, export to CSV.
// Dependencies on This File:
//   - SponsorHub.jsx: Renders DataTable for sponsor list.
// This File Depends On:
//   - antd: UI components.
//   - src/context/crud: CrudContext for modals.

import React, { useEffect } from 'react';
import { Table, Input, Button, Dropdown } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, RedoOutlined } from '@ant-design/icons';
import { generate as uniqueId } from 'shortid';
import { useCrudContext } from '@/context/crud';

function AddNewItem({ config = {}, showAddButton = true }) {
  const { crudContextAction } = useCrudContext();
  const { collapsedBox, panel } = crudContextAction;
  const { ADD_NEW_ENTITY = 'Add New Item' } = config;

  const handleClick = () => {
    panel.open();
    collapsedBox.close();
  };

  if (!showAddButton) return null;

  return (
    <Button onClick={handleClick} type="primary">
      {ADD_NEW_ENTITY}
    </Button>
  );
}

export default function DataTable({
  config = {},
  extra = [],
  dataTableColumns,
  dataSource: customDataSource = [],
  loading: customLoading,
  rowKey,
  pagination,
  showAddButton = true,
  onChange,
  setSearchTerm, // Added to update search term
}) {
  useEffect(() => {
    console.log('DataTable - Received dataSource:', customDataSource);
  }, [customDataSource]);

  const { entity = 'unknown', DATATABLE_TITLE = 'Data Table', searchConfig = { searchFields: '' }, search = true } = config;
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, modal, readBox, editBox, advancedBox } = crudContextAction;

  const items = [
    { label: 'Show', key: 'read', icon: <EyeOutlined /> },
    { label: 'Edit', key: 'edit', icon: <EditOutlined /> },
    ...extra,
    { type: 'divider' },
    { label: 'Delete', key: 'delete', icon: <DeleteOutlined /> },
  ];

  const handleSearch = (value) => {
    if (setSearchTerm) {
      setSearchTerm(value);
    }
  };

  const handleRefresh = () => {
    if (setSearchTerm) {
      setSearchTerm('');
    }
  };

  return (
    <div>
      <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{DATATABLE_TITLE}</h2>
        <div>
          {search && (
            <Input
              key="searchFilterDataTable"
              placeholder="Search"
              allowClear
              style={{ width: 200, marginRight: 8 }}
              onChange={(e) => handleSearch(e.target.value)}
            />
          )}
          <Button key={uniqueId()} icon={<RedoOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
          <AddNewItem key={uniqueId()} config={config} showAddButton={showAddButton} />
        </div>
      </div>
      <Table
        key={customDataSource?.length || 0} // Force re-render when dataSource length changes
        columns={dataTableColumns}
        rowKey={rowKey || ((item) => item.id || item._id)}
        dataSource={customDataSource}
        loading={customLoading}
        pagination={pagination}
        onChange={onChange}
      />
    </div>
  );
}
