// C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\BusinessProfile.jsx
import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const BusinessProfile = ({ sponsor }) => {
  return (
    <div>
      <Title level={3}>Business Profile</Title>
      <p>Name: {sponsor?.name || 'N/A'}</p>
      <p>Tier: {sponsor?.tier_level || 'N/A'}</p>
    </div>
  );
};

export default BusinessProfile;
