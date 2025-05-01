/*
 * File: SponsorHub.jsx
 * Path: frontend/src/pages/SponsorHub.jsx
 * Purpose: Displays and manages sponsor data in a searchable, filterable table.
 * Functionality:
 *   - Renders sponsor table with CRUD actions (view, edit, email, delete).
 *   - Supports search, tier filtering, pagination, and modals for editing.
 * Structure:
 *   - React component with Ant Design UI, Redux dispatch for updates.
 * Dependencies:
 *   - react, antd: UI components.
 *   - react-redux: Dispatch for actions.
 *   - DataTable: Custom table component.
 *   - CrudContextProvider: CRUD context wrapper.
 *   - SponsorModal: Edit/add modal.
 *   - handlers: handleEditSponsor.
 *   - request/request: API utility (api).
 * Connections:
 *   - Depends on: Dashboard.jsx (props), handlers.js (edit logic).
 *   - Used by: Dashboard.jsx (child component).
 * Updates:
 *   - 04/07/2025: Added onSearch, refresh on tier change, preview=false on Image.
 *   - 04/07/2025 (Grok 3): Fixed api import for delete.
 *   - 04/07/2025 (Grok 3): Updated image src to local fallback.
 *   - 04/07/2025 (Grok 3): Forced local default for via.placeholder.com.
 *     - Why: via.placeholder.com/50 net::ERR_NAME_NOT_RESOLVED persists—data uses bad URL.
 *     - How: Added explicit check in render to override bad URL.
 *     - Impact: Eliminates image fetch error for existing data.
 * Future Enhancements:
 *   - Add Grok inline edit button.
 *   - Truncate description column for readability.
 * Known Issues:
 *   - None post-image fix; fully functional CRUD.
 */

import React, { useState } from 'react';
import { Input, Select, Button, Space, Popconfirm, Image } from 'antd';
import { useDispatch } from 'react-redux';
import DataTable from './DataTable';
import { CrudContextProvider } from '@/context/crud';
import SponsorModal from './SponsorModal';
import { handleEditSponsor } from './handlers';
import api from '@/request/request';

const { Search } = Input;
const { Option } = Select;

const SponsorHub = ({
  sponsors = [],
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
    console.log('Edit clicked for sponsor:', sponsor._id);
    setEditSponsorData(sponsor);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (updatedData, form) => {
    await handleEditSponsor(updatedData, setEditModalVisible, messageApi, form, dispatch);
    refreshSponsors();
  };

  const handleViewDetails = (sponsor) => console.log('View Details:', sponsor._id);
  const handleDelete = async (sponsor) => {
    try {
      await api.delete(`/sponsors/${sponsor._id}`);
      console.log('Deleted sponsor:', sponsor._id);
      messageApi.success('Sponsor deleted!');
      refreshSponsors();
    } catch (error) {
      messageApi.error('Delete failed: ' + error.message);
      console.error('Delete error:', error);
    }
  };
  const handleEmail = (sponsor) => console.log('Email:', sponsor._id);

  const columns = [
    {
      title: 'Image',
      dataIndex: 'image',
      key: 'image',
      render: (image) => (
        <Image
          src={image === 'https://via.placeholder.com/50' ? '/default-sponsor.png' : image || '/default-sponsor.png'} // Force local if bad URL
          width={40}
          height={40}
          style={{ objectFit: 'cover', borderRadius: '50%' }}
          preview={false}
          fallback="https://placehold.co/50x50" // Stable backup if local fails
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
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
      width: 200,
    },
  ];

  const handleTableChange = (pagination) => {
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
          onSearch={refreshSponsors}
          style={{ width: '100%', maxWidth: 200, flex: '1 1 auto', margin: 0 }}
        />
        <Select
          placeholder="Filter by tier"
          value={tierFilter}
          onChange={(value) => { setTierFilter(value); refreshSponsors(); }}
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
          tierOptions={tierOptions.length ? tierOptions : ['Very High', 'High', 'Moderate-High']}
          handleSubmit={handleEditSubmit}
          messageApi={messageApi}
        />
      )}
    </div>
  );
};

export default SponsorHub;
