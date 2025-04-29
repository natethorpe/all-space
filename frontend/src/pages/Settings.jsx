/*
 * File: Settings.jsx
 * Path: frontend/src/pages/Settings.jsx
 * Purpose: CRM settings management with Redux integration and Allur payment setup.
 * Dependencies: react, antd, react-redux, axios
 * Change Log:
 *   - 04/08/2025: Added by Grok for CRM settings and payment integration
 */
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectSettings } from '@/redux/settings/selectors';
import axios from 'axios';

const { Title } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { settings, isLoading } = useSelector(selectSettings);
  const [allurStatus, setAllurStatus] = useState('Not Connected');

  useEffect(() => {
    dispatch(settingsAction.list({ entity: 'settings' }));
  }, [dispatch]);

  useEffect(() => {
    if (settings.length) {
      form.setFieldsValue({
        appName: settings.find(s => s.settingKey === 'appName')?.settingValue || 'Festival CRM',
        currency: settings.find(s => s.settingKey === 'currency')?.settingValue || 'USD',
      });
    }
  }, [settings, form]);

  const onFinish = async (values) => {
    try {
      await dispatch(settingsAction.updateManySetting({
        entity: 'settings',
        jsonData: [
          { settingKey: 'appName', settingValue: values.appName },
          { settingKey: 'currency', settingValue: values.currency },
        ]
      })).unwrap();
      message.success('Settings updated!');
    } catch (err) {
      message.error('Failed to update settings');
    }
  };

  const connectAllur = async () => {
    try {
      const res = await axios.post('/api/allur/pay', { action: 'connect' });
      setAllurStatus('Connected');
      message.success('Allur wallet connected!');
    } catch (err) {
      setAllurStatus('Connection Failed');
      message.error('Failed to connect Allur wallet');
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f0f2f5' }}>
      <Title level={2}>Settings</Title>
      <Card style={{ borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="appName" label="App Name" rules={[{ required: true }]}>
            <Input placeholder="Festival CRM" />
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
            <Input placeholder="USD" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} style={{ borderRadius: 4 }}>
              Save Settings
            </Button>
          </Form.Item>
        </Form>
        <div style={{ marginTop: 16 }}>
          <h3>Allur Payment Integration</h3>
          <p>Status: {allurStatus}</p>
          <Button onClick={connectAllur} style={{ borderRadius: 4 }}>Connect Allur Wallet</Button>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
