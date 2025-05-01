/*
 * File: SponsorModal.jsx
 * Path: frontend/src/pages/SponsorModal.jsx
 * Purpose: Modal for adding/editing sponsor data in IDURAR ERP CRM.
 * Functionality:
 *   - Displays form for sponsor CRUD (create/update).
 *   - Handles image upload, form submission with validation.
 * Structure:
 *   - React component with Ant Design Form, Modal, and Upload.
 * Dependencies:
 *   - react, antd: UI components (Modal, Form, Input, etc.).
 *   - @ant-design/icons: UploadOutlined icon.
 *   - request/request: API utility (api).
 * Connections:
 *   - Used by: Dashboard.jsx (add), SponsorHub.jsx (edit).
 *   - Depends on: handlers.js (handleAddSponsor, handleEditSponsor).
 * Updates:
 *   - 04/07/2025: Added form.setFieldsValue on visible, reset on cancel.
 *   - 04/07/2025 (Grok 3): Updated to format likeliness as string with %.
 *   - 04/07/2025 (Grok 3): Fixed email and tier_level issues.
 *     - Why: 400 Bad Request—missing email, invalid tier_level enum.
 *     - How: Added email field with required rule, synced tierOptions with schema enum.
 *     - Impact: Ensures valid data sent to backend, fixes POST/PUT failures.
 * Future Enhancements:
 *   - Fetch real admins from API instead of mock data.
 *   - Add Grok auto-fill for sponsor fields.
 * Known Issues:
 *   - None post-fixes; previously sent invalid tier_level, omitted email.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import api from '@/request/request';

const { Option } = Select;

const SponsorModal = ({
  mode,
  visible,
  setVisible,
  sponsorData,
  setSponsorData,
  tierOptions = ['Very High', 'High', 'Moderate-High'], // Default to schema enum
  handleSubmit,
  messageApi,
}) => {
  const [form] = Form.useForm();
  const [admins, setAdmins] = useState([]);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    const mockAdmins = [{ _id: '67eb66ce0e94a818311c2938', name: 'Admin User' }];
    setAdmins(mockAdmins);
    if (visible && sponsorData.image) {
      setFileList([{ uid: '-1', name: 'image.png', status: 'done', url: sponsorData.image }]);
    } else {
      setFileList([]);
    }
    if (visible) {
      form.setFieldsValue({
        ...sponsorData,
        likeliness: sponsorData.likeliness ? sponsorData.likeliness.replace('%', '') : '', // Strip % for editing
      });
    }
  }, [visible, sponsorData, form]);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.url;
    } catch (error) {
      messageApi?.error('Image upload failed: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };

  const onFinish = async () => {
    try {
      const values = await form.validateFields();
      let imageUrl = sponsorData.image;
      if (fileList.length > 0 && fileList[0].status !== 'done') {
        imageUrl = await handleUpload(fileList[0].originFileObj);
      } else if (fileList.length === 0) {
        imageUrl = null;
      }
      const updatedData = {
        ...sponsorData,
        ...values,
        likeliness: values.likeliness ? `${parseInt(values.likeliness)}%` : sponsorData.likeliness || '50%', // Ensure string with %
        est_cost: values.est_cost ? parseInt(values.est_cost) : sponsorData.est_cost || 0,
        image: imageUrl,
      };
      await handleSubmit(updatedData, form);
      setVisible(false);
      form.resetFields();
      setFileList([]);
    } catch (error) {
      console.error('SponsorModal - Form submission failed:', error);
      messageApi?.error('Form submission failed: ' + (error.message || 'Unknown error'));
    }
  };

  const uploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
      setFileList([file]);
      return false;
    },
    fileList,
  };

  return (
    <Modal
      title={mode === 'add' ? 'Add Sponsor' : 'Edit Sponsor'}
      open={visible}
      onOk={onFinish}
      onCancel={() => { setVisible(false); setFileList([]); form.resetFields(); }}
      okText="Save"
    >
      <Form form={form} layout="vertical" initialValues={sponsorData}>
        <Form.Item 
          name="name" 
          label="Name" 
          rules={[{ required: true, message: 'Please enter the sponsor name' }]}
        >
          <Input onChange={(e) => setSponsorData({ ...sponsorData, name: e.target.value })} />
        </Form.Item>
        <Form.Item 
          name="email" 
          label="Email" 
          rules={[{ required: true, message: 'Please enter the sponsor email' }, { type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input onChange={(e) => setSponsorData({ ...sponsorData, email: e.target.value })} />
        </Form.Item>
        <Form.Item 
          name="tier_level" 
          label="Tier Level" 
          rules={[{ required: true, message: 'Please select a tier' }]}
        >
          <Select onChange={(value) => setSponsorData({ ...sponsorData, tier_level: value })}>
            {tierOptions.map((tier) => (
              <Option key={tier} value={tier}>{tier}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="likeliness" label="Likeliness">
          <Input type="number" onChange={(e) => setSponsorData({ ...sponsorData, likeliness: e.target.value })} />
        </Form.Item>
        <Form.Item name="est_cost" label="Estimated Cost">
          <Input type="number" onChange={(e) => setSponsorData({ ...sponsorData, est_cost: e.target.value })} />
        </Form.Item>
        <Form.Item name="assignedTo" label="Assigned To">
          <Select
            placeholder="Select an admin"
            value={sponsorData.assignedTo}
            onChange={(value) => setSponsorData({ ...sponsorData, assignedTo: value })}
            allowClear
          >
            {admins.map((admin) => (
              <Option key={admin._id} value={admin._id}>{admin.name}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Image">
          <Upload {...uploadProps} listType="picture" maxCount={1}>
            <Button icon={<UploadOutlined />}>Upload Image</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SponsorModal;
