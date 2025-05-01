// C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\forms\LoginForm.jsx
// Notes:
// - Purpose: Renders login form fields.
// - Updates (04/03/2025): Added autoComplete="current-password" to Input.Password.
// - Why: Fixes DOM warning, improves UX per browser standards.
// - How: Updated password field directly, no prop needed.
// - Next Steps: Test login, verify warning disappears.

import React from 'react';
import { Form, Input, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';

export default function LoginForm() {
  const translate = useLanguage();
  return (
    <div>
      <Form.Item
        label={translate('email')}
        name="email"
        rules={[
          { required: true, message: translate('Please input your email!') },
          { type: 'email', message: translate('Please enter a valid email!') },
        ]}
      >
        <Input
          prefix={<UserOutlined className="site-form-item-icon" />}
          placeholder="admin@demo.com"
          type="email"
          size="large"
        />
      </Form.Item>
      <Form.Item
        label={translate('password')}
        name="password"
        rules={[
          { required: true, message: translate('Please input your password!') },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          placeholder="admin123"
          size="large"
          autoComplete="current-password" // Added
        />
      </Form.Item>
      <Form.Item>
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox>{translate('Remember me')}</Checkbox>
        </Form.Item>
        <a className="login-form-forgot" href="/forgetpassword" style={{ marginLeft: '0px' }}>
          {translate('Forgot password')}
        </a>
      </Form.Item>
    </div>
  );
}
