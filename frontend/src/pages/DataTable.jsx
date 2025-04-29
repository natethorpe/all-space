// File Path: C:/Users/nthorpe/Desktop/crm/idurar-erp-crm/frontend/src/pages/DataTable.jsx
// Historical Note: Created April 7, 2025, to resolve import error in SponsorHub.jsx; fixed syntax April 8, 2025.
// Purpose: Renders a table of sponsors for the Woodkey Festival and Hi-Way Drive-In CRM.
// Functionality: Displays sponsor data in an Ant Design Table with pagination.
// Structure: Uses Ant Design Table component, integrates with CrudContext.
// Connections: Used by SponsorHub.jsx; depends on antd and crud context.
// Dependencies: react, antd (Table).
// Status: Fixed syntax errors to provide default export.
// Updates (04/08/2025):
// - Corrected syntax errors in function definition and JSX.
// - Why: SyntaxError prevented default export, crashing SponsorHub import.
// - How: Fixed arrow function, closed JSX tags, corrected onChange lambda.
// - Impact: Frontend runs, sponsor table renders.
// - Next Steps: Verify 120 sponsors load in Dashboard.

import React from 'react';
import { Table } from 'antd';

const DataTable = ({ config, dataTableColumns, dataSource, loading, pagination, onChange, setSearchTerm }) => {
  return (
    <Table
      columns={dataTableColumns}
      dataSource={dataSource}
      loading={loading}
      pagination={{
        ...pagination,
        showSizeChanger: false,
        onChange: (page) => onChange({ current: page }),
      }}
      rowKey={(record) => record._id || record.id} // Assuming _id from MongoDB
      title={() => config.DATATABLE_TITLE}
    />
  );
};

export default DataTable;
