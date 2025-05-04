/* File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\components\Notification\Notification.jsx */
import React from 'react';
import { Alert } from 'antd';

const Notification = ({ message, type = 'info', sponsorId, taskId }) => {
  return (
    <Alert
      message={message}
      type={type}
      showIcon
      style={{ marginBottom: 8, whiteSpace: 'normal', wordBreak: 'break-word' }}
    />
  );
};

export default Notification;
