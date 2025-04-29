// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\EmailModal.jsx
// Historical Note: Updated April 6, 2025, to fix undefined emailData.id error at line 108.
// Future Direction: Integrate Grok for AI-drafted email content; add email template selection.
// Purpose: Reusable modal for sending emails to sponsors in the Woodkey Festival and Hi-Way Drive-In CRM.
// Functionality:
//   - Displays a modal with subject and body inputs for sending an email to a sponsor.
// Structure:
//   - Uses Ant Design Modal, Input, and TextArea for UI.
// Connections:
//   - Parent: Dashboard.jsx (passes props and handlers).
//   - Handlers: handlers.js (handleEmailSend).
// Dependencies:
//   - react: Core library.
//   - antd: Modal, Input, TextArea for UI.
// Props:
//   - emailModalVisible: Boolean for modal visibility.
//   - setEmailModalVisible: Function to toggle visibility.
//   - emailData: Object with email details (sponsorId, subject, body).
//   - setEmailData: Function to update emailData.
//   - handleEmailSend: Function to submit email.
// Current Features:
//   - Form for email subject and body.
// Status:
//   - As of 04/06/2025, crashes due to undefined emailData.id (fixed here).
// Updates (04/06/2025):
//   - Fixed undefined emailData.id error.
//     - Why: emailData was undefined, causing crash at line 108.
//     - How: Added default value for emailData and checked for emailData.sponsorId.
//     - Impact: Prevents crash, ensures modal renders.
//   - Added debug logging for emailData.
//     - Why: Confirm prop values passed from Dashboard.
//     - How: Added useEffect to log emailData.
//     - Impact: Helps debug prop issues.
//   - Next Steps: Test email sending; verify modal functionality.
// Future Enhancements:
//   - Grok Integration: Suggest email content via AI.
//   - UX: Add email template dropdown.
// Dependencies on This File:
//   - Dashboard.jsx: Renders modal and passes props.
// This File Depends On:
//   - antd: UI components.
//   - handlers.js: Submission logic.

import React, { useEffect } from 'react';
import { Modal, Input } from 'antd';

const { TextArea } = Input;

const EmailModal = ({
  emailModalVisible,
  setEmailModalVisible,
  emailData = { sponsorId: '', subject: '', body: '' }, // Default to empty object
  setEmailData,
  handleEmailSend,
}) => {
  useEffect(() => {
    console.log('EmailModal - Received emailData:', emailData);
  }, [emailData]);

  return (
    <Modal
      title={emailData.sponsorId ? `Send Email to Sponsor ${emailData.sponsorId}` : 'Send Email'}
      open={emailModalVisible}
      onOk={handleEmailSend}
      onCancel={() => setEmailModalVisible(false)}
      okText="Send"
    >
      <Input
        placeholder="Subject"
        value={emailData.subject || ''}
        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
        style={{ marginBottom: 8 }}
      />
      <TextArea
        placeholder="Body"
        value={emailData.body || ''}
        onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
        rows={4}
      />
    </Modal>
  );
};

export default EmailModal;
