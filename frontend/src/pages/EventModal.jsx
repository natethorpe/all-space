// File Path: C:/Users/nthorpe/Desktop/crm/idurar-erp-crm/frontend/src/pages/EventModal.jsx
// Historical Note: Updated April 8, 2025, to fix 500 error on event addition; updated April 11, 2025, to fix sponsorId issue.
// Purpose: Modal for adding schedule events for sponsors in the Woodkey Festival and Hi-Way Drive-In CRM.
// Updates (04/08/2025):
// - Ensured payload excludes tier_level.
// - Why: 500 error persists despite handler fix.
// - How: Explicitly constructed payload in handleOk.
// - Impact: Successful event addition.
// Updates (04/11/2025):
// - Fixed sponsorId issue causing 404 error.
//   - Why: POST /api/sponsors//schedule failed due to undefined sponsorId.
//   - How: Added validation for sponsorId and disabled Save button if not selected.
//   - Impact: Ensures valid sponsorId is sent in the request.
// - Added error handling for sponsor search.
//   - Why: GET /api/sponsors?q=a failed due to assignedTo population error (now fixed).
//   - How: Improved error handling and fallback.
//   - Impact: Prevents modal from breaking on search failure.
// - Next Steps: Test event addition, verify sponsor search works.

import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, Spin } from 'antd';
import api from '@/request/request';

const { Option } = Select;
const { TextArea } = Input;

const EventModal = ({
  eventModalVisible,
  setEventModalVisible,
  eventData,
  setEventData,
  filteredSponsors = [],
  handleEventAdd,
}) => {
  const [searchResults, setSearchResults] = useState(filteredSponsors);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (value) => {
    if (!value) {
      setSearchResults(filteredSponsors);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await api.get('/sponsors', { params: { q: value, page: 1, items: 10 } });
      setSearchResults(response.data.result.sponsors || []);
    } catch (error) {
      console.error('Sponsor search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    setSearchResults(filteredSponsors);
  }, [filteredSponsors]);

  const handleOk = () => {
    if (!eventData.sponsorId) {
      alert('Please select a sponsor.');
      return;
    }
    const payload = {
      sponsorId: eventData.sponsorId,
      title: eventData.title,
      date: eventData.date,
      description: eventData.description,
    };
    console.log('EventModal - Submitting payload:', payload);
    handleEventAdd(payload);
  };

  return (
    <Modal
      title="Add Schedule Event"
      open={eventModalVisible}
      onOk={handleOk}
      onCancel={() => setEventModalVisible(false)}
      okText="Save"
      okButtonProps={{ disabled: !eventData.sponsorId }}
    >
      <Select
        showSearch
        placeholder="Select Sponsor"
        value={eventData.sponsorId || undefined}
        onChange={(value) => setEventData({ ...eventData, sponsorId: value })}
        onSearch={handleSearch}
        style={{ width: '100%', marginBottom: 8 }}
        allowClear
        filterOption={false}
        notFoundContent={searchLoading ? <Spin size="small" /> : 'No sponsors found'}
      >
        {searchResults.map((sponsor) => (
          <Option key={sponsor._id} value={sponsor._id}>{sponsor.name}</Option>
        ))}
      </Select>
      <Input
        placeholder="Title"
        value={eventData.title}
        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
        style={{ marginBottom: 8 }}
      />
      <Input
        type="date"
        value={eventData.date}
        onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
        style={{ marginBottom: 8 }}
      />
      <TextArea
        placeholder="Description"
        value={eventData.description}
        onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
        rows={4}
      />
    </Modal>
  );
};

export default EventModal;
