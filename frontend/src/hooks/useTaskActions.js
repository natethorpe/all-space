/*
 * File Path: frontend/src/hooks/useTaskActions.js
 * Purpose: Custom hook for managing task actions in Allur Space Console.
 * How It Works:
 *   - Provides action handlers for task operations (submit, test, approve, deny, delete, clear, diff).
 *   - Integrates with apiClient for API calls (/grok/edit, /grok/test, /grok/approve, /grok/deny, /grok/tasks).
 *   - Manages loading states for buttons to prevent duplicate actions.
 *   - Updates live feed with action results for real-time feedback.
 * Mechanics:
 *   - Uses axios for API requests with JWT token from localStorage.
 *   - Handles errors with detailed logging to LiveFeed.jsx and console.
 *   - Ensures UI refresh on deletion to prevent tasks reappearing.
 * Dependencies:
 *   - React: useState, useCallback for state and memoized handlers (version 18.3.1).
 *   - antd: message for notifications (version 5.24.6).
 *   - axios: API requests (version 1.8.4).
 *   - moment: Timestamp formatting (version 2.30.1).
 *   - ../config/serverApiConfig: apiClient for API calls.
 *   - ../utils/logClientError: Client-side error logging.
 * Dependents:
 *   - useTasks.js: Uses action handlers for task operations.
 *   - TaskList.jsx: Calls handlers for button actions.
 *   - TaskInput.jsx: Uses handleSubmit and clearTasks.
 * Why It’s Here:
 *   - Modularizes task action logic from useTasks.js, reducing its size to ~200 lines for Sprint 2 hook splitting (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created by extracting action logic from useTasks.js.
 *   - 04/24/2025: Added error handling for 401 Unauthorized and network errors.
 *   - 04/25/2025: Fixed React warning by ensuring strings/objects in setLiveFeed.
 *   - 05/XX/2025: Fixed deletion issues and UI refresh for Sprint 2.
 *     - Why: Prevent tasks reappearing after deletion (User, 05/XX/2025).
 *     - How: Added fetchTasks after deletion, increased retry attempts, ensured state refresh.
 *     - Test: Click "Delete" in TaskList, verify task removed, no reappearance on refresh, green log in LiveFeed.
 * Test Instructions:
 *   - Run `npm start` (backend) and `npm run dev` (frontend), navigate to /grok: Verify TaskList buttons trigger actions.
 *   - Submit "Build CRM system" via TaskInput: Confirm task created, blue log in LiveFeed.
 *   - Click "Test" in TaskList: Verify test runs, blue log in LiveFeed.
 *   - Click "Approve" or "Deny": Confirm status updates, green/red log in LiveFeed.
 *   - Click "Delete" or "Clear All Tasks": Confirm tasks removed, no reappearance on refresh, green log in LiveFeed.
 *   - Check browser console: Confirm no "Functions are not valid as a React child" warnings.
 * Future Enhancements:
 *   - Add bulk task actions (Sprint 4).
 *   - Support task retry with feedback (Sprint 6).
 * Self-Notes:
 *   - Nate: Extracted action logic from useTasks.js for modularity (04/23/2025).
 *   - Nate: Fixed React warning with proper liveFeed handling (04/25/2025).
 *   - Nate: Fixed deletion and UI refresh issues for Sprint 2 (05/XX/2025).
 * Rollback Instructions:
 *   - If actions fail: Copy useTaskActions.js.bak to useTaskActions.js (`mv frontend/src/hooks/useTaskActions.js.bak frontend/src/hooks/useTaskActions.js`).
 *   - Verify TaskList actions work after rollback.
 */
import { useState, useCallback } from 'react';
import { message } from 'antd';
import axios from 'axios';
import moment from 'moment';
import apiClient from '../config/serverApiConfig';
import { logClientError } from '../utils/logClientError';

const useTaskActions = ({
  setTasks,
  setSelectedTask,
  setPrompt,
  setTaskError,
  setFileError,
  setLiveFeed,
  navigate,
  messageApi,
}) => {
  const [buttonLoading, setButtonLoading] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get('/grok/tasks');
      setTasks(response.data.tasks || []);
    } catch (err) {
      console.error('useTaskActions: Failed to fetch tasks:', err.message);
      logClientError('Failed to fetch tasks', 'useTaskActions', { error: err.message });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Failed to fetch tasks`,
          color: 'red',
          details: JSON.stringify({ error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    }
  }, [setTasks, setLiveFeed]);

  const handleSubmit = useCallback(async (prompt) => {
    setIsSubmitting(true);
    setButtonLoading((prev) => ({ ...prev, submit: true }));
    try {
      const response = await apiClient.post('/grok/edit', { prompt });
      setPrompt('');
      setTasks((prev) => [
        ...prev,
        { ...response.data.task, prompt: prompt || 'Untitled' },
      ]);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task submitted: ${prompt}`,
          color: 'blue',
          details: JSON.stringify({ taskId: response.data.task.taskId }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.success('Task submitted successfully');
    } catch (err) {
      console.error('useTaskActions: Task submission failed:', err.message);
      logClientError('Task submission failed', 'useTaskActions', { error: err.message });
      setTaskError(err.response?.data?.error || 'Failed to submit task');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task submission failed`,
          color: 'red',
          details: JSON.stringify({ error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      if (err.response?.status === 401) {
        messageApi.error('Session expired. Please log in again.');
        navigate('/login');
      }
    } finally {
      setIsSubmitting(false);
      setButtonLoading((prev) => ({ ...prev, submit: false }));
    }
  }, [setPrompt, setTasks, setTaskError, setLiveFeed, messageApi, navigate]);

  const handleTestTask = useCallback(async (taskId) => {
    setButtonLoading((prev) => ({ ...prev, [`test_${taskId}`]: true }));
    try {
      const response = await apiClient.get(`/grok/test/${taskId}`);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} tested`,
          color: 'blue',
          details: JSON.stringify({ taskId, testUrl: response.data.testUrl }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.success('Task tested successfully');
    } catch (err) {
      console.error('useTaskActions: Task test failed:', err.message);
      logClientError('Task test failed', 'useTaskActions', { taskId, error: err.message });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task test failed`,
          color: 'red',
          details: JSON.stringify({ taskId, error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.error('Failed to test task');
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`test_${taskId}`]: false }));
    }
  }, [setLiveFeed, messageApi]);

  const handleApproveTask = useCallback(async (taskId) => {
    setButtonLoading((prev) => ({ ...prev, [`approve_${taskId}`]: true }));
    try {
      await apiClient.post('/grok/approve', { taskId });
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: 'applied' } : t));
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} approved`,
          color: 'green',
          details: JSON.stringify({ taskId }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.success('Task approved successfully');
    } catch (err) {
      console.error('useTaskActions: Task approval failed:', err.message);
      logClientError('Task approval failed', 'useTaskActions', { taskId, error: err.message });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task approval failed`,
          color: 'red',
          details: JSON.stringify({ taskId, error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.error('Failed to approve task');
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`approve_${taskId}`]: false }));
    }
  }, [setTasks, setLiveFeed, messageApi]);

  const handleDenyTask = useCallback(async (taskId) => {
    setButtonLoading((prev) => ({ ...prev, [`deny_${taskId}`]: true }));
    try {
      await apiClient.post('/grok/deny', { taskId });
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: 'denied' } : t));
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} denied`,
          color: 'red',
          details: JSON.stringify({ taskId }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.success('Task denied successfully');
    } catch (err) {
      console.error('useTaskActions: Task denial failed:', err.message);
      logClientError('Task denial failed', 'useTaskActions', { taskId, error: err.message });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task denial failed`,
          color: 'red',
          details: JSON.stringify({ taskId, error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.error('Failed to deny task');
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`deny_${taskId}`]: false }));
    }
  }, [setTasks, setLiveFeed, messageApi]);

  const deleteTask = useCallback(async (taskId) => {
    setButtonLoading((prev) => ({ ...prev, [`delete_${taskId}`]: true }));
    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      try {
        await apiClient.delete(`/grok/tasks/${taskId}`);
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
        await fetchTasks(); // Refresh tasks to prevent reappearance
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} deleted`,
            color: 'green',
            details: JSON.stringify({ taskId }),
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
        messageApi.success('Task deleted successfully');
        return;
      } catch (err) {
        retries++;
        console.warn(`useTaskActions: Delete task attempt ${retries}/${maxRetries} failed: ${err.message}`);
        logClientError(`Delete task attempt ${retries}/${maxRetries} failed`, 'useTaskActions', { taskId, error: err.message });
        if (retries >= maxRetries) {
          console.error('useTaskActions: Task deletion failed:', err.message);
          setLiveFeed((prev) => [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task deletion failed`,
              color: 'red',
              details: JSON.stringify({ taskId, error: err.message }),
              timestamp: new Date().toISOString(),
            },
          ].slice(-50));
          messageApi.error('Failed to delete task');
        }
        await new Promise(resolve => setTimeout(resolve, 500 * retries));
      } finally {
        setButtonLoading((prev) => ({ ...prev, [`delete_${taskId}`]: false }));
      }
    }
  }, [setTasks, setLiveFeed, messageApi, fetchTasks]);

  const clearTasks = useCallback(async () => {
    setButtonLoading((prev) => ({ ...prev, clear: true }));
    try {
      await apiClient.delete('/grok/clear-tasks');
      setTasks([]);
      await fetchTasks(); // Refresh tasks to prevent reappearance
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - All tasks cleared`,
          color: 'green',
          details: JSON.stringify({ details: 'All tasks removed' }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.success('All tasks cleared successfully');
    } catch (err) {
      console.error('useTaskActions: Clear tasks failed:', err.message);
      logClientError('Clear tasks failed', 'useTaskActions', { error: err.message });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Clear tasks failed`,
          color: 'red',
          details: JSON.stringify({ error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.error('Failed to clear tasks');
    } finally {
      setButtonLoading((prev) => ({ ...prev, clear: false }));
    }
  }, [setTasks, setLiveFeed, messageApi, fetchTasks]);

  const showDiff = useCallback(async (taskId) => {
    setButtonLoading((prev) => ({ ...prev, [`diff_${taskId}`]: true }));
    try {
      const response = await apiClient.get(`/grok/diff/${taskId}`);
      setSelectedTask(response.data.task);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Diff viewed for task ${taskId}`,
          color: 'blue',
          details: JSON.stringify({ taskId }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } catch (err) {
      console.error('useTaskActions: Diff fetch failed:', err.message);
      logClientError('Diff fetch failed', 'useTaskActions', { taskId, error: err.message });
      setFileError(err.response?.data?.error || 'Failed to fetch diff');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Diff fetch failed`,
          color: 'red',
          details: JSON.stringify({ taskId, error: err.message }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      messageApi.error('Failed to fetch diff');
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`diff_${taskId}`]: false }));
    }
  }, [setSelectedTask, setFileError, setLiveFeed, messageApi]);

  return {
    handleSubmit,
    handleTestTask,
    handleApproveTask,
    handleDenyTask,
    deleteTask,
    clearTasks,
    showDiff,
    buttonLoading,
    setButtonLoading,
    isSubmitting,
  };
};

export default useTaskActions;
