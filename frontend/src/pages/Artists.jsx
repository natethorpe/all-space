import React from 'react';
import { Typography, List } from 'antd';

const { Title } = Typography;

const ArtistsPage = () => {
  const artists = [
    { id: 1, name: 'Jane Doe', specialty: 'Painting' },
    { id: 2, name: 'John Smith', specialty: 'Sculpture' },
  ];

  return (
    <div>
      <Title level={2}>Artists</Title>
      <List
        dataSource={artists}
        renderItem={(item) => (
          <List.Item>
            {item.name} - {item.specialty}
          </List.Item>
        )}
        locale={{ emptyText: 'No artists available yet.' }}
      />
    </div>
  );
};

export default ArtistsPage;
