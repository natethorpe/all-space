/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\temp\EmployeeLog.jsx
 * Purpose: Generated component for Allur Space Console with system-wide navigation (staged).
 * Dependencies: react, antd, react-router-dom
 * Notes:
 *   - Staged in temp dir; moves to pages on approval.
 * Change Log:
 *   - 04/10/2025: Staged generation for approval workflow (New Chat, Post-Sprint 2).
 */
import React from 'react';
import { Layout } from 'antd';
import { Link } from 'react-router-dom';

const { Header, Content } = Layout;

const EmployeeLog = () => {
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
        <h1>EmployeeLog Page</h1>
      </Content>
    </Layout>
  );
};

export default EmployeeLog;
    