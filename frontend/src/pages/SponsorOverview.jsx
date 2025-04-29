// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\SponsorOverview.jsx
// Description:
// - Purpose: Component for the "Sponsor Overview" section in Dashboard.jsx.
// - Functionality: Displays summary statistics and top prospects.
// - Updates (04/02/2025): Created to extract Sponsor Overview section from Dashboard.jsx (Nate’s instruction).
// - Connections:
//   - Components: Dashboard.jsx (uses this component).
// - Next Steps: Test component in Dashboard.jsx, ensure summary displays correctly.

import React from 'react';
import { Card, Col } from 'antd';

const SponsorOverview = ({ summary, loading }) => {
  return (
    <Col span={24}>
      <Card title="Sponsor Overview" loading={loading}>
        {summary && Object.keys(summary).length > 0 ? (
          <>
            <p>Total Sponsors: {summary.totalSponsors || 0}</p>
            <p>Avg Fit Score: {(summary.avgFitScore || 0).toFixed(2)}</p>
            <p>Total Est. Cost: ${(summary.totalEstCost || 0).toLocaleString()}</p>
            <p>Tiers: {(summary.tiers || []).map(t => `${t._id}: ${t.count}`).join(', ')}</p>
            <h3>Top Prospects</h3>
            <ul>
              {summary.topProspects?.map((prospect, index) => (
                <li key={index}>
                  {prospect.name} (Fit: {prospect.fit_score}, Likeliness: {prospect.likeliness})
                </li>
              )) || <li>No prospects available</li>}
            </ul>
          </>
        ) : (
          <p>Fetching summary data...</p>
        )}
      </Card>
    </Col>
  );
};

export default SponsorOverview;
