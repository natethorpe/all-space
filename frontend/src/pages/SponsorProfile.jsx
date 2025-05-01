/*
 * File: SponsorProfile.jsx
 * Path: frontend/src/pages/SponsorProfile.jsx
 * Purpose: Displays a single sponsor's profile with details and comments
 * Dependencies: antd, request/request
 * Change Log:
 *  - 04/06/2025: Created by Grok (v18)
 *  - 04/10/2025: Fixed generation errors (Grok 3)
 */
import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Input, List, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import api from '@/request/request';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SponsorProfile = () => {
  const [sponsor, setSponsor] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSponsor = async () => {
      try {
        const res = await api.get('/api/sponsors/1');
        setSponsor(res.data || { name: 'Default Sponsor', fit_score: 50, assignedTo: { name: 'Unassigned' } });
        setComments(res.data?.comments || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setSponsor({ name: 'Default Sponsor', fit_score: 50, assignedTo: { name: 'Unassigned' } });
      } finally {
        setLoading(false);
      }
    };
    fetchSponsor();
  }, []);

  const handleComment = async () => {
    if (!newComment.trim()) return;
    const updatedComments = [...comments, { text: newComment, date: new Date(), author: 'User' }];
    try {
      await api.put('/api/sponsors/1', { comments: updatedComments });
      setComments(updatedComments);
    } catch (err) {
      console.error('Comment error:', err);
      setComments(updatedComments.map(c => c.author === 'User' ? { ...c, author: 'User (Offline)' } : c));
    }
    setNewComment('');
  };

  if (loading) return <div>Loading sponsor profile...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>{sponsor.name}</Title>
      <Card>
        <Descriptions bordered>
          <Descriptions.Item label="Tier">{sponsor.tier_level || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Fit Score">{sponsor.fit_score}%</Descriptions.Item>
          <Descriptions.Item label="Assigned To">{sponsor.assignedTo.name}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Comments" style={{ marginTop: 24 }}>
        <List
          dataSource={comments}
          renderItem={item => (
            <List.Item>
              <Text>{item.text} - <i>{item.author}, {new Date(item.date).toLocaleString()}</i></Text>
            </List.Item>
          )}
        />
        <TextArea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={4}
          style={{ marginTop: 16 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleComment}
          style={{ marginTop: 8 }}
        >
          Post Comment
        </Button>
      </Card>
    </div>
  );
};

export default SponsorProfile;