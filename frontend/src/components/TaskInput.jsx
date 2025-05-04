/*
 * File Path: frontend/src/components/TaskInput.jsx
 * Purpose: Provides a form for submitting tasks in Allur Space Console, supporting text prompts and file uploads.
 * How It Works:
 *   - Uses Ant Design Form for input validation and submission.
 *   - Submits tasks via useTasks.js submitTask function, passing prompt and uploaded files.
 *   - Displays success/error messages via messageApi.
 * Mechanics:
 *   - Manages form state with useForm, validating prompt input.
 *   - Handles file uploads with Ant Design Upload component.
 *   - Submits task to /api/grok/edit endpoint via useTasks.js.
 * Dependencies:
 *   - React: useState, useEffect for state management (version 18.3.1).
 *   - antd: Form, Input, Button, Upload for UI (version 5.24.6).
 *   - useTasks.js: Task submission logic.
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - GrokUI.jsx: Renders TaskInput for task submission.
 * Why It’s Here:
 *   - Enables task submission for Sprint 2, integrating with backend task processing (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized task input form with prompt and file upload (Nate).
 *   - 04/29/2025: Added file upload validation and error handling (Nate).
 *   - 05/03/2025: Integrated with useTasks.js for task submission (Nate).
 *   - 05/04/2025: Fixed TypeError for undefined prompt (Grok).
 *     - Why: TypeError: Cannot read properties of undefined (reading 'trim') (User, 05/04/2025).
 *     - How: Added guards for undefined prompt, enhanced form state debugging.
 *   - 05/04/2025: Fixed TypeError for useTasksHook (Grok).
 *     - Why: TypeError: useTasksHook is not a function (User, 05/04/2025).
 *     - How: Changed useTasksHook prop to useTasks, ensured prop is function.
 *   - 05/04/2025: Fixed missing textbox due to undefined props (Grok).
 *     - Why: Prompt textbox not visible, PropType warnings for token and useTasks (User, 05/04/2025).
 *     - How: Added fallback rendering, moved messageApi error to useEffect, preserved functionality.
 *     - Test: Load /grok, verify textbox visible, submit task, no PropType warnings.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, verify TaskInput textbox visible.
 *   - Enter "Build CRM system", submit, verify no TypeError, task appears in TaskList.jsx.
 *   - Upload a file, submit, confirm file is sent to /api/grok/edit.
 *   - Check console for 'TaskInput: Submitting task' logs.
 * Rollback Instructions:
 *   - Revert to TaskInput.jsx.bak (`mv frontend/src/components/TaskInput.jsx.bak frontend/src/components/TaskInput.jsx`).
 *   - Verify /grok loads, task submission works (may have TypeError or missing textbox).
 * Future Enhancements:
 *   - Add task category selection (Sprint 4).
 *   - Support drag-and-drop file uploads (Sprint 5).
 *   - Integrate ALL Token rewards for task submission (Sprint 3).
 */

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import { logClientError } from '../utils/logClientError';

const TaskInput = ({ token, useTasks, messageApi }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  // Handle invalid props
  useEffect(() => {
    if (!token || typeof token !== 'string') {
      console.warn('TaskInput: Invalid token', { token: token || 'missing', timestamp: new Date().toISOString() });
      logClientError({
        message: 'Invalid token',
        context: 'TaskInput',
        details: { token: token || 'missing', timestamp: new Date().toISOString() },
      });
      messageApi.error('Authentication token is missing. Please log in again.');
    }
    if (typeof useTasks !== 'function') {
      console.error('TaskInput: useTasks is not a function', {
        useTasksType: typeof useTasks,
        timestamp: new Date().toISOString(),
      });
      logClientError({
        message: 'useTasks is not a function',
        context: 'TaskInput',
        details: { useTasksType: typeof useTasks, timestamp: new Date().toISOString() },
      });
      messageApi.error('Task submission is unavailable due to configuration error');
    }
  }, [token, useTasks, messageApi]);

  // Fallback if props are invalid
  if (!token || typeof useTasks !== 'function') {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Task input is unavailable. Please refresh the page or log in again.
      </div>
    );
  }

  const { submitTask } = useTasks({ token, messageApi });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const prompt = values.prompt;

      // Debug form state
      console.log('TaskInput: Submitting task', {
        prompt: prompt || 'missing',
        fileCount: fileList.length,
        timestamp: new Date().toISOString(),
      });

      // Guard against undefined prompt
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt is undefined or invalid');
      }

      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) {
        throw new Error('Prompt is empty after trimming');
      }

      const files = fileList.map(file => ({
        uid: file.uid,
        name: file.name,
        status: file.status,
        url: file.url || null,
        response: file.response || null,
      }));

      await submitTask(trimmedPrompt, files);
      form.resetFields();
      setFileList([]);
      messageApi.success('Task submitted successfully');
    } catch (err) {
      const errorMessage = err.message || 'Failed to submit task';
      console.error('TaskInput: Submit failed', {
        error: errorMessage,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      logClientError({
        message: errorMessage,
        context: 'TaskInput',
        details: { error: err.message, stack: err.stack, timestamp: new Date().toISOString() },
      });
      messageApi.error(errorMessage);
    }
  };

  const uploadProps = {
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      console.log('TaskInput: File list updated', {
        fileCount: newFileList.length,
        files: newFileList.map(f => f.name),
        timestamp: new Date().toISOString(),
      });
    },
    beforeUpload: () => false, // Prevent auto-upload
    fileList,
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        name="prompt"
        label="Task Prompt"
        rules={[{ required: true, message: 'Please enter a task prompt' }]}
      >
        <Input.TextArea rows={4} placeholder="Enter your task prompt here" />
      </Form.Item>
      <Form.Item label="Upload Files">
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>Upload Files</Button>
        </Upload>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Submit Task
        </Button>
      </Form.Item>
    </Form>
  );
};

TaskInput.propTypes = {
  token: PropTypes.string.isRequired,
  useTasks: PropTypes.func.isRequired,
  messageApi: PropTypes.object.isRequired,
};

export default TaskInput;
