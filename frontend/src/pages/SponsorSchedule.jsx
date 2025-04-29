// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\SponsorSchedule.jsx
// Description:
// - Purpose: Component for the "Sponsor Schedule" section in Dashboard.jsx.
// - Functionality: Displays a calendar with sponsor events.
// - Updates (04/02/2025): Adjusted layout to fix rendering issues (Nate’s instruction).
// - Connections:
//   - Components: Dashboard.jsx (uses this component), SponsorCalendar.jsx (displays calendar).
//   - Handlers: handlers.js (uses handleDateClick, handleEventClick).
// - Next Steps: Test component in Dashboard.jsx, ensure calendar displays correctly.

import React from 'react';
import { Card, Col, Alert } from 'antd';
import SponsorCalendar from '@/modules/sponsorModule/sponsorCalander';

const SponsorSchedule = ({ events, loading, handleDateClick, handleEventClick }) => {
  return (
    <Col span={12}>
      <Card title="Sponsor Schedule">
        {loading ? (
          <Alert message="Loading calendar..." type="info" showIcon />
        ) : events.length > 0 ? (
          <SponsorCalendar
            events={events}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        ) : (
          <p>No scheduled events</p>
        )}
      </Card>
    </Col>
  );
};

export default SponsorSchedule;
