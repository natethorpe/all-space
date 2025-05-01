/*
 * File: Dashboard.jsx
 * Path: frontend/src/pages/Dashboard.jsx
 * Purpose: Main dashboard UI for sponsor management in IDURAR ERP CRM.
 * Functionality:
 *   - Displays sponsor summary, SponsorHub table, Calendar, and Grok analysis.
 *   - Manages modals for adding sponsors and events.
 * Structure:
 *   - React component with Ant Design UI, Redux state via useSponsorDashboard.
 * Dependencies:
 *   - react, antd: UI components.
 *   - useSponsorDashboard: Data hook for sponsors/summary.
 *   - SponsorHub, SponsorshipSummary, Calendar, EventModal, SponsorModal, PendingNotifications: Child components.
 *   - handlers: handleAddSponsor, handleEventAdd.
 *   - request/request: API utility (api).
 * Connections:
 *   - Depends on: useSponsorDashboard.js (state), handlers.js (actions).
 *   - Used by: AppRouter.jsx (rendered at /dashboard).
 * Updates:
 *   - 04/07/2025: Updated with latest props from useSponsorDashboard.
 *   - 04/07/2025 (Grok 3): No changes—verified prop consistency, logs alignment.
 *   - 05/03/2025: Added SponsorshipSummary.jsx with /api/sponsors/summary (Grok).
 *     - Why: Align with updated SponsorshipSummary and fix 404 errors (User, 05/03/2025).
 *     - How: Replaced summary Card with SponsorshipSummary.jsx.
 *     - Test: Load /dashboard, verify summary displays without 404 errors.
 * Future Enhancements:
 *   - Add Grok UI integration button for inline analysis.
 *   - Responsive layout tweaks for mobile.
 * Known Issues:
 *   - None post-backend fixes; previously blocked by missing POST/PUT routes.
 */

import React, { useState } from 'react';
import { Row, Col, Typography, message, Input, Button, Spin } from 'antd';
import useSponsorDashboard from './useSponsorDashboard';
import SponsorHub from './SponsorHub';
import SponsorshipSummary from '../components/SponsorshipSummary';
import Calendar from './Calendar';
import EventModal from './EventModal';
import SponsorModal from './SponsorModal';
import PendingNotifications from './PendingNotifications';
import { handleAddSponsor, handleEventAdd } from './handlers';
import api from '@/request/request';

const { Title } = Typography;
const { TextArea } = Input;

const Dashboard = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const {
    filteredSponsors,
    summary,
    loading,
    total,
    addModalVisible,
    setAddModalVisible,
    sponsorData,
    setSponsorData,
    tierOptions,
    searchTerm,
    setSearchTerm,
    tierFilter,
    setTierFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    refreshSponsors,
  } = useSponsorDashboard();

  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventData, setEventData] = useState({ sponsorId: '', title: '', date: '', description: '' });
  const [grokInput, setGrokInput] = useState('');
  const [grokResponse, setGrokResponse] = useState('');

  const handleDateClick = (info) => {
    setEventData({ ...eventData, date: info.dateStr });
    setEventModalVisible(true);
  };

  const handleEventClick = (info) => {
    const [sponsorId, eventId] = info.event.id.split('-');
    setEventData({
      sponsorId,
      title: info.event.title.split(' - ')[1],
      date: info.event.startStr,
      description: info.event.extendedProps.description,
    });
    setEventModalVisible(true);
  };

  const handleAddSponsorSubmit = async (data, form) => {
    await handleAddSponsor(data, setAddModalVisible, messageApi, form);
    refreshSponsors();
  };

  const handleEventAddWrapper = async (data) => {
    await handleEventAdd(data, setEventModalVisible, messageApi);
    refreshSponsors();
  };

  const handleGrokAnalyze = async () => {
    try {
      const response = await api.post('/grok/analyze', { data: grokInput });
      setGrokResponse(response.data.result);
      messageApi.success('Grok analysis completed!');
    } catch (error) {
      messageApi.error('Grok analysis failed: ' + error.message);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: 'auto', paddingTop: '20%' }} />;

  return (
    <>
      {contextHolder}
      <div style={{ padding: '20px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
        <Title level={2}>Dashboard</Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <SponsorshipSummary />
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col span={12} style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <SponsorHub
              sponsors={filteredSponsors}
              loading={loading}
              total={total}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              tierFilter={tierFilter}
              setTierFilter={setTierFilter}
              tierOptions={tierOptions}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              itemsPerPage={itemsPerPage}
              refreshSponsors={refreshSponsors}
              setAddModalVisible={setAddModalVisible}
              messageApi={messageApi}
            />
          </Col>
          <Col span={12}>
            <Calendar
              sponsors={filteredSponsors}
              loading={loading}
              handleDateClick={handleDateClick}
              handleEventClick={handleEventClick}
            />
            <div style={{ marginTop: 16 }}>
              <PendingNotifications />
            </div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Title level={4}>Grok Analysis</Title>
            <TextArea
              placeholder="Enter data to analyze with Grok"
              value={grokInput}
              onChange={(e) => setGrokInput(e.target.value)}
              rows={4}
              style={{ marginBottom: 8 }}
            />
            <Button onClick={handleGrokAnalyze}>Analyze</Button>
            {grokResponse && (
              <div style={{ marginTop: 16 }}>
                <strong>Grok Response:</strong>
                <p>{grokResponse}</p>
              </div>
            )}
          </Col>
        </Row>
        <SponsorModal
          mode="add"
          visible={addModalVisible}
          setVisible={setAddModalVisible}
          sponsorData={sponsorData}
          setSponsorData={setSponsorData}
          tierOptions={tierOptions}
          handleSubmit={handleAddSponsorSubmit}
          messageApi={messageApi}
        />
        <EventModal
          eventModalVisible={eventModalVisible}
          setEventModalVisible={setEventModalVisible}
          eventData={eventData}
          setEventData={setEventData}
          filteredSponsors={filteredSponsors}
          handleEventAdd={handleEventAddWrapper}
        />
      </div>
    </>
  );
};

export default Dashboard;
