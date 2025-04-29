import React from 'react';
import { Typography, List } from 'antd';

const { Title } = Typography;

const BusinessContactsPage = () => {
  const contacts = [
    { id: 1, name: 'Alice Brown', company: 'BizInc', email: 'alice@bizinc.com' },
    { id: 2, name: 'Bob White', company: 'TradeCo', email: 'bob@tradeco.com' },
  ];

  return (
    <div>
      <Title level={2}>Business Contacts</Title>
      <List
        dataSource={contacts}
        renderItem={(item) => (
          <List.Item>
            {item.name} - {item.company} ({item.email})
          </List.Item>
        )}
        locale={{ emptyText: 'No business contacts available yet.' }}
      />
    </div>
  );
};

export default BusinessContactsPage;
