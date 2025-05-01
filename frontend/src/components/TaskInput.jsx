/*
 * File Path: frontend/src/components/TaskInput.jsx
 * Purpose: Provides input field and file upload for submitting tasks in Allur Space Console.
 * How It Works:
 *   - Renders a TextArea for task prompts and an Upload button for files.
 *   - Submits prompt and files to /api/grok/edit via useTaskActions.js.
 *   - Displays loading states and errors using Ant Design components.
 * Mechanics:
 *   - Uses useTaskActions.js for task submission and clearing.
 *   - Validates input and prevents resubmissions during loading.
 *   - Deduplicates submissions with requestId and 1000ms debounce.
 * Dependencies:
 *   - react@18.3.1: Core library.
 *   - antd@5.22.2: Input, Button, Upload, Space, message.
 *   - uuid@11.1.0: Generates requestId.
 *   - lodash@4.17.21: Debounce for handleSubmit.
 *   - useTaskActions.js: submitTask, clearTasks.
 * Dependents:
 *   - GrokUI.jsx: Renders TaskInput in the main UI.
 * Why It’s Here:
 *   - Provides task submission UI for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized task input (Nate).
 *   - 05/07/2025: Added 1000ms debounce and localStorage requestId deduplication (Grok).
 *     - Why: Prevent duplicate task submissions (User, 05/01/2025).
 *     - How: Used lodash.debounce, persisted requestId in localStorage.
 *     - Test: Rapidly submit "Create an inventory system", verify single task, "Processing..." message.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok.
 *   - Submit "Create an inventory system" with a file, verify single task in idurar_db.tasks.
 *   - Rapidly submit the same prompt, confirm "Processing..." and single task.
 *   - Check browser console and idurar_db.logs for no duplicates.
 * Future Enhancements:
 *   - Add prompt suggestions (Sprint 3).
 *   - Support multiple file uploads with preview (Sprint 4).
 */

import React, { useState, useMemo } from 'react';
import { Input, Button, Upload, Space, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash/debounce';
import useTaskActions from '../hooks/useTaskActions';

const TaskInput = ({ messageApi }) => {
  const { submitTask, clearTasks } = useTaskActions();
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [recentRequests, setRecentRequests] = useState(() => {
    const stored = localStorage.getItem('recentRequests');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const debouncedHandleSubmit = useMemo(() => debounce(async () => {
    if (!prompt.trim() || loading) return;
    const newRequestId = uuidv4();
    setRequestId(newRequestId);
    if (recentRequests.has(newRequestId)) {
      messageApi.warning('This request was already submitted');
      return;
    }
    setLoading(true);
    messageApi.info('Processing...');
    setRecentRequests(prev => {
      const updated = new Set(prev).add(newRequestId);
      localStorage.setItem('recentRequests', JSON.stringify([...updated]));
      setTimeout(() => {
        updated.delete(newRequestId);
        localStorage.setItem('recentRequests', JSON.stringify([...updated]));
      }, 60 * 1000);
      return updated;
    });
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('requestId', newRequestId);
      files.forEach(file => formData.append('files', file.originFileObj));
      await submitTask(formData);
      setPrompt('');
      setFiles([]);
      messageApi.success('Task submitted successfully');
    } catch (error) {
      messageApi.error(`Failed to submit task: ${error.message}`);
    } finally {
      setLoading(false);
      setRequestId(null);
    }
  }, 1000), [prompt, loading, files, submitTask, recentRequests, messageApi]);

  const handleClearTasks = async () => {
    setLoading(true);
    try {
      await clearTasks();
      messageApi.success('All tasks cleared');
    } catch (error) {
      messageApi.error(`Failed to clear tasks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      setFiles(prev => [...prev, file]);
      return false; // Prevent auto-upload
    },
    onRemove: (file) => {
      setFiles(prev => prev.filter(f => f.uid !== file.uid));
    },
    fileList: files,
  };

  return (
    <div className="mb-6">
      <Upload {...uploadProps} style={{ marginBottom: 10 }}>
        <Button icon={<UploadOutlined />}>Upload Files</Button>
      </Upload>
      <Input.TextArea
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter task prompt (e.g., Create an inventory system)"
        style={{ marginBottom: 10 }}
      />
      <Space>
        <Button type="primary" onClick={debouncedHandleSubmit} loading={loading} disabled={loading}>
          Submit Task
        </Button>
        <Button type="primary" danger onClick={handleClearTasks} loading={loading} disabled={loading}>
          Clear All Tasks
        </Button>
      </Space>
    </div>
  );
};

export default TaskInput;
