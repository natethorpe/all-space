/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\temp\EmployeeLog-v900.jsx
 * Purpose: Employee log page with clock-in/out and payroll management for Allur Space Console (staged).
 * Dependencies: react, antd, react-router-dom
 * Notes:
 *   - Staged in temp dir; moves to pages on approval.
 * Change Log:
 *   - 04/10/2025: Staged generation for approval workflow (New Chat, Post-Sprint 2).
 */
import React, { useState } from 'react';
import { Table, Button, Input, Form, Space, Layout } from 'antd';
import { Link } from 'react-router-dom';

const { Header, Content } = Layout;

const EmployeeLog = () => {
  const [employees, setEmployees] = useState([]);
  const [form] = Form.useForm();

  const handleAddEmployee = (values) => {
    const newEmployee = { ...values, id: Date.now(), clockIn: null, clockOut: null };
    setEmployees([...employees, newEmployee]);
    form.resetFields();
  };

  const handleClockIn = (id) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, clockIn: new Date().toLocaleString() } : emp));
  };

  const handleClockOut = (id) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, clockOut: new Date().toLocaleString() } : emp));
  };

  return (
    <Layout>
      <Header>
        <nav>
          <Link to="/">Home</Link> | 
          <Link to="/dashboard">Dashboard</Link> | 
          <Link to="/sponsor/1">Sponsor</Link> | 
          <Link to="/employee-log">Employee Log</Link> | 
          <Link to="/settings">Settings</Link>
        </nav>
      </Header>
      <Content style={{ padding: '20px' }}>
        <h1>Employee Log</h1>
        <Form form={form} onFinish={handleAddEmployee}>
          <Form.Item name="name" label="Name"><Input /></Form.Item>
          <Form.Item name="payroll" label="Payroll"><Input type="number" /></Form.Item>
          <Button type="primary" htmlType="submit">Add Employee</Button>
        </Form>
        <Table dataSource={employees} columns={[
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Payroll', dataIndex: 'payroll', key: 'payroll' },
          { title: 'Clock In', dataIndex: 'clockIn', key: 'clockIn' },
          { title: 'Clock Out', dataIndex: 'clockOut', key: 'clockOut' },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button onClick={() => handleClockIn(record.id)} disabled={record.clockIn}>Clock In</Button>
                <Button onClick={() => handleClockOut(record.id)} disabled={!record.clockIn || record.clockOut}>Clock Out</Button>
              </Space>
            )
          }
        ]} />
      </Content>
    </Layout>
  );
};

export default EmployeeLog;
    