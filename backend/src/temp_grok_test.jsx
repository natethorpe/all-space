// File Path: C:/Users/nthorpe/Desktop/crm/idurar-erp-crm/frontend/src/pages/SponsorHub.jsx
// Historical Note: Updated April 8, 2025, to add table features; updated April 9, 2025, to fix Assigned To and add edit buttons; updated April 10, 2025, to add edit modal; updated April 11, 2025, to pass dispatch; updated April 12, 2025, to pass messageApi and add image and actions; updated April 13, 2025, to fix pagination; updated April 14, 2025, to improve table experience; updated April 15, 2025, to fix table scrolling; updated April 16, 2025, to fix horizontal scrolling and button visibility; updated April 17, 2025, to fix image loading errors; updated April 18, 2025, to refine mobile layout.
// Updated: 04/23/2025 - Removed CrudContextProvider wrapper for Grok edit testing.
// Purpose: Displays sponsor list in a table with search, tier filtering, and pagination.
// Updates (04/08/2025):
// - Added Assigned To column and action column for edit.
// - Why: Table missing expected features.
// - How: Updated columns array, added action render.
// - Impact: Shows Assigned To and edit buttons.
// Updates (04/09/2025):
// - Enhanced Assigned To rendering and added edit button.
// - Why: Assigned To column not showing; edit buttons missing.
// - How: Fixed render function, added edit button with placeholder action.
// - Impact: Displays Assigned To and edit functionality.
// Updates (04/10/2025):
// - Added edit modal trigger.
// - Why: Edit buttons not functional.
// - How: Added state for edit modal and passed to SponsorModal.
// - Impact: Allows editing sponsors.
// - Passed dispatch to handleEditSubmit.
// - Why: Needed for updateSponsor action.
// - How: Used useDispatch hook.
// - Impact: Enables sponsor editing.
// Updates (04/12/2025):
// - Passed messageApi to edit modal.
//   - Why: ReferenceError: messageApi is not defined when editing.
//   - How: Added messageApi prop and passed it to SponsorModal.
//   - Impact: Editing works with notifications.
// - Added image column and more actions.
//   - Why: User requested image and additional actions for sponsors.
//   - How: Added image column and actions (View Details, Delete, Email, Edit).
//   - Impact: Enhances sponsor table functionality.
// Updates (04/13/2025):
// - Fixed pagination/scrolling issue.
//   - Why: User couldn’t scroll or paginate to see more sponsors.
//   - How: Ensured handleTableChange updates currentPage correctly and table height is constrained.
//   - Impact: Allows pagination and scrolling in the sponsor table.
// - Fixed image loading error.
//   - Why: ERR_NAME_NOT_RESOLVED for placeholder images.
//   - How: Used a working placeholder image from Unsplash.
//   - Impact: Sponsor images load correctly.
// Updates (04/14/2025):
// - Improved sponsor table experience.
//   - Why: User reported a "bad feeling" experience with the table.
//   - How: Removed maxHeight constraint, added table styling, improved pagination UI.
//   - Impact: Enhances user experience with the sponsor table.
// - Added mobile-friendly styles.
//   - Why: Mobile view not app-like.
//   - How: Added media queries to adjust table layout for mobile.
//   - Impact: Improves mobile user experience.
// Updates (04/15/2025):
// - Fixed table scrolling issues.
//   - Why: User didn’t like vertical and horizontal scrolling.
//   - How: Simplified table for mobile by hiding columns, ensured table fits viewport.
//   - Impact: Improves table usability on desktop and mobile.
// Updates (04/16/2025):
// - Fixed horizontal scrolling.
//   - Why: Table content still too wide, causing page to scroll left to right.
//   - How: Adjusted column widths, ensured table fits within viewport.
//   - Impact: Removes horizontal scrollbar.
// - Fixed sponsor buttons visibility on mobile.
//   - Why: Sponsor buttons hidden due to overflow on mobile.
//   - How: Reduced button sizes, ensured button container wraps properly.
//   - Impact: Sponsor buttons are visible and usable on mobile.
// Updates (04/17/2025):
// - Fixed image loading errors.
//   - Why: ERR_NAME_NOT_RESOLVED for via.placeholder.com/50 persists.
//   - How: Ensured all image sources use the correct Unsplash URL.
//   - Impact: Sponsor images load correctly.
// Updates (04/18/2025):
// - Refined mobile layout for edge-to-edge display and button/pagination visibility.
//   - Why: Mobile layout has padding, buttons/pagination not fully visible.
//   - How: Removed all padding, adjusted table and button sizes for mobile.
//   - Impact: Mobile layout is edge-to-edge, buttons/pagination are visible.
// Updates (04/23/2025):
// - Removed CrudContextProvider wrapper.
//   - Why: Test Grok’s ability to detect and propose adding it back.
//   - How: Removed <CrudContextProvider> tags around DataTable, kept import.
//   - Impact: Allows Grok to propose and apply the wrapper via edit.
// Next Steps:
//   - Test with Grok to confirm edit proposal and approval.
//   - Verify layout on different screen sizes, confirm button functionality, ensure no horizontal scrolling.

import React, { useEffect, useState } from 'react';
import { Input, Select, Button, Space, Popconfirm, Image } from 'antd';
import { useDispatch } from 'react-redux';
import DataTable from './DataTable';
import { CrudContextProvider } from '@/context/crud'; // Import retained, not used in return
import SponsorModal from './SponsorModal';
import { handleEditSponsor } from './handlers';

const { Search } = Input;
const { Option } = Select;

const SponsorHub = ({
  sponsors,
  loading,
  total,
  searchTerm,
  setSearchTerm,
  tierFilter,
  setTierFilter,
  tierOptions,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  refreshSponsors,
  setAddModalVisible,
  messageApi,
}) => {
  const dispatch = useDispatch();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSponsorData, setEditSponsorData] = useState(null);

  const handleEdit = (sponsor) => {
    console.log('Edit clicked for sponsor:', sponsor._id); // Debug log
    setEditSponsorData(sponsor);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (updatedData, form) => {
    await handleEditSponsor(updatedData, setEditModalVisible, messageApi, form, dispatch);
    refreshSponsors();
  };

  const handleViewDetails = (sponsor) => {
    console.log('View Details clicked for sponsor:', sponsor._id); // Debug log
    // Implement navigation to a details page if needed
  };

  const handleDelete = (sponsor) => {
    console.log('Delete clicked for sponsor:', sponsor._id); // Debug log
    // Implement delete logic (e.g., dispatch a delete action)
    refreshSponsors();
  };

  const handleEmail = (sponsor) => {
    console.log('Email clicked for sponsor:', sponsor._id); // Debug log
    // Implement email logic (e.g., open an email modal)
  };

  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image) => (
        <Image
          src={image || 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?w=50&h=50&fit=crop'}
          width={40}
          height={40}
          style={{ objectFit: 'cover', borderRadius: '50%' }}
        />
      ),
      width: 60,
      responsive: ['md'],
    },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name), width: 120 },
    { title: 'Tier', dataIndex: 'tier_level', key: 'tier_level', sorter: (a, b) => a.tier_level.localeCompare(b.tier_level), width: 80 },
    { title: 'Likeliness', dataIndex: 'likeliness', key: 'likeliness', sorter: (a, b) => a.likeliness - b.likeliness, width: 100, responsive: ['md'] },
    { title: 'Estimated Cost', dataIndex: 'est_cost', key: 'est_cost', sorter: (a, b) => a.est_cost - b.est_cost, width: 120, responsive: ['lg'] },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 150, responsive: ['lg'] },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (assignedTo) => assignedTo?.name || 'Unassigned',
      width: 120,
      responsive: ['md'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" onClick={() => handleViewDetails(record)}>View Details</Button>
          <Button size="small" onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" onClick={() => handleEmail(record)}>Email</Button>
          <Popconfirm
            title="Are you sure to delete this sponsor?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
      width: 200,
    },
  ];

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
    refreshSponsors();
  };

  return (
    <div className="sponsor-hub">
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
        <Search
          placeholder="Search sponsors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: 200, flex: '1 1 auto', margin: 0 }}
        />
        <Select
          placeholder="Filter by tier"
          value={tierFilter}
          onChange={setTierFilter}
          style={{ width: '100%', maxWidth: 120, flex: '1 1 auto', margin: 0 }}
          allowClear
        >
          {tierOptions.map((tier) => (
            <Option key={tier} value={tier}>{tier}</Option>
          ))}
        </Select>
        <Button onClick={() => setAddModalVisible(true)} style={{ flex: '0 0 auto', margin: 0 }}>Add Sponsor</Button>
      </div>
      
  <CrudContextProvider>
  <DataTable
        config={{ entity: 'sponsors', DATATABLE_TITLE: 'Sponsors' }}
        dataTableColumns={columns}
        dataSource={sponsors}
        loading={loading}
        pagination={{ current: currentPage, pageSize: itemsPerPage, total, showSizeChanger: true, position: ['bottomCenter'] }}
        onChange={handleTableChange}
        setSearchTerm={setSearchTerm}
        rowKey="_id"
        style={{ width: '100%', overflowX: 'auto' }}
      />
</CrudContextProvider>
      {editModalVisible && (
        <SponsorModal
          mode="edit"
          visible={editModalVisible}
          setVisible={setEditModalVisible}
          sponsorData={editSponsorData}
          setSponsorData={setEditSponsorData}
          tierOptions={tierOptions}
          handleSubmit={handleEditSubmit}
          messageApi={messageApi}
        />
      )}

      {/* Global styles */}
      <style>{`
        @media (max-width: 768px) {
          .sponsor-hub {
            padding: 0;
            width: 100vw !important;
            margin: 0 !important;
          }
          .ant-table {
            font-size: 12px;
            width: 100vw !important;
            overflow-x: hidden !important;
          }
          .ant-table-thead > tr > th {
            padding: 4px !important;
            font-size: 12px !important;
          }
          .ant-table-tbody > tr > td {
            padding: 4px !important;
            font-size: 12px !important;
          }
          .ant-space {
            flex-wrap: wrap;
          }
          .ant-space-item {
            margin-bottom: 4px !important;
          }
          .ant-table-wrapper {
            overflow-x: hidden !important;
            width: 100vw !important;
          }
          .ant-table-pagination {
            width: 100% !important;
            text-align: center !important;
          }
          .ant-btn {
            padding: 0 6px !important;
            font-size: 10px !important;
          }
        }
        @media (min-width: 769px) {
          .ant-table-thead > tr > th {
            padding: 16px !important;
          }
          .ant-table-tbody > tr > td {
            padding: 16px !important;
          }
          .ant-table-wrapper {
            width: 100% !important;
            overflow-x: hidden !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SponsorHub;
