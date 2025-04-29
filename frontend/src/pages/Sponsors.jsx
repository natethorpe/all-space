import React from 'react';
import { Typography, List } from 'antd';
import ErpLayout from '../layout/ErpLayout';
import SponsorList from '../modules/SponsorModule/SponsorList';

const { Title } = Typography;

const SponsorsPage = () => {
  const sponsors = [
    { id: 1, name: 'TechCorp', amount: '$10,000' },
    { id: 2, name: 'GreenEnergy', amount: '$5,000' },
  ];

  // Define Sponsors component
  const Sponsors = () => (
    <ErpLayout>
      <SponsorList />
    </ErpLayout>
  );

  return (
    <div>
      <Title level={2}>Sponsors</Title>
      <List
        dataSource={sponsors}
        renderItem={(item) => (
          <List.Item>
            {item.name} - {item.amount}
          </List.Item>
        )}
        locale={{ emptyText: 'No sponsors available yet.' }}
      />
      {/* Optionally render Sponsors component */}
      {/* <Sponsors /> */}
    </div>
  );
};

export default SponsorsPage;
