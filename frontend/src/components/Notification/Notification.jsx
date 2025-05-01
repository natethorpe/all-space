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
