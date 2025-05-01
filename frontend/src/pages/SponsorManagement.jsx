// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\SponsorManagement.jsx
// Description:
// - Purpose: Component for the "Sponsor Management" section in Dashboard.jsx.
// - Functionality: Displays the sponsor list with search, tier filter, pagination, and add button.
// - Updates (04/02/2025): Disabled AddNewItem button in DataTable to remove mystery button (Nate’s instruction).
// - Connections:
//   - Components: Dashboard.jsx (uses this component), DataTable.jsx (displays sponsor list).
//   - Handlers: handlers.js (uses handlePageChange).
// - Next Steps: Test component in Dashboard.jsx, ensure search, filter, pagination, and Owner column work.

import React from 'react';
import { Card, Button, Select, Col, Input } from 'antd';
import DataTable from '@/components/DataTable/DataTable';

const { Option } = Select;
const { Search } = Input;

const SponsorManagement = ({
  setAddModalVisible,
  searchTerm,
  setSearchTerm,
  tierFilter,
  setTierFilter,
  tierOptions,
  currentPage,
  setCurrentPage,
  summary,
  itemsPerPage,
  filteredSponsors,
  loading,
  sponsorColumns,
  handlePageChange,
  userRole,
}) => {
  return (
    <Col span={24}>
      <Card title="Sponsor Management">
        <Button type="primary" onClick={() => setAddModalVisible(true)} style={{ marginBottom: 16 }}>
          Add Sponsor
        </Button>
        <Search
          placeholder="Search sponsors by name or tier"
          onSearch={value => setSearchTerm(value)}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 200, marginBottom: 16 }}
        />
        <Select
          placeholder="Filter by Tier"
          allowClear
          style={{ width: 120, marginLeft: 16, marginBottom: 16 }}
          onChange={value => setTierFilter(value)}
          value={tierFilter}
        >
          {tierOptions.map(tier => (
            <Option key={tier} value={tier}>{tier}</Option>
          ))}
        </Select>
        <Button onClick={() => handlePageChange('prev', currentPage, setCurrentPage, summary, itemsPerPage)} disabled={currentPage === 1} style={{ marginRight: 8 }}>
          Previous
        </Button>
        <span>Page {currentPage} of {Math.ceil((summary.totalSponsors || 0) / itemsPerPage)}</span>
        <Button onClick={() => handlePageChange('next', currentPage, setCurrentPage, summary, itemsPerPage)} disabled={currentPage === Math.ceil((summary.totalSponsors || 0) / itemsPerPage)} style={{ marginLeft: 8 }}>
          Next
        </Button>
        <DataTable
          key={searchTerm + (tierFilter || '')} // Force re-render on search or filter change
          config={{ entity: 'sponsors', search: false }}
          dataTableColumns={sponsorColumns(userRole)}
          dataSource={filteredSponsors}
          loading={loading}
          rowKey="_id"
          pagination={false}
          showAddButton={false} // Disable the AddNewItem button
        />
      </Card>
    </Col>
  );
};

export default SponsorManagement;
