/*
 * File: Login-v1.jsx
 * Path: frontend/src/pages/Login-v1.jsx
 * Purpose: Enhanced login page with modern UI, AI suggestions, and Redux integration.
 * Dependencies: react, antd, axios, @tensorflow/tfjs, react-redux, react-router-dom
 * Change Log:
 *   - 04/07/2025: Enhanced by Grok with AI and UI upgrades
 *   - 04/08/2025: Added versioning and Redux navigation
 */
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as tf from '@tensorflow/tfjs';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '@/redux/auth/actions';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const loginAttempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');
    if (loginAttempts.length > 2) {
      const xs = tf.tensor2d(loginAttempts.map((_, i) => [i]), [loginAttempts.length, 1]);
      const ys = tf.tensor2d(loginAttempts.map(t => [t.success ? 1 : 0]), [loginAttempts.length, 1]);
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
      model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
      model.fit(xs, ys, { epochs: 5 }).then(() => {
        const next = model.predict(tf.tensor2d([[loginAttempts.length]], [1, 1]));
        setAiTip(next.dataSync()[0] > 0.5 ? 'AI Tip: Double-check your credentials!' : 'AI Tip: Try resetting your password.');
      });
    }
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        email: values.email,
        password: values.password
      });
      const loginData = { email: values.email, password: values.password };
      await dispatch(login({ loginData })).unwrap();
      message.success('Login successful!');
      const attempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');
      localStorage.setItem('loginAttempts', JSON.stringify([...attempts, { success: true, time: new Date() }]));
      navigate('/dashboard');
    } catch (err) {
      message.error('Login failed: ' + (err.response?.data?.message || 'Unknown error'));
      const attempts = JSON.parse(localStorage.getItem('loginAttempts') || '[]');
      localStorage.setItem('loginAttempts', JSON.stringify([...attempts, { success: false, time: new Date() }]));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <Title level={2} style={{ textAlign: 'center' }}>Welcome Back</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" rules={[{ required: true, message: 'Please enter your email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          {aiTip && <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{aiTip}</Text>}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block style={{ borderRadius: 4 }}>
              Log In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
