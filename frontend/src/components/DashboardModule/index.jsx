import React from 'react';
import { Row, Col } from 'antd';
import CustomerPreviewCard from './components/CustomerPreviewCard';
import SummaryCard from './components/SummaryCard';
import RecentTable from './components/RecentTable';
import SponsorshipSummary from './components/SponsorshipSummary';

const DashboardModule = () => {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <CustomerPreviewCard /> {/* Existing welcome-like card */}
        </Col>
        <Col span={12}>
          <SummaryCard /> {/* Existing summary */}
        </Col>
        <Col span={12}>
          <SponsorshipSummary /> {/* New component */}
        </Col>
        <Col span={24}>
          <RecentTable /> {/* Updated with sponsor data */}
        </Col>
      </Row>
    </div>
  );
};

export default DashboardModule;
