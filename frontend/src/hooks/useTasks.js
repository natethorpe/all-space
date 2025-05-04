/*
 * File Path: frontend/src/hooks/useTasks.js
 * Purpose: Custom React hook for task management in Allur Space Console.
 * How It Works:
 *   - Manages task state, submission, and synchronization with backend via REST API and Socket.IO.
 *   - Fetches tasks from /api/grok/tasks, submits tasks to /api/grok/edit.
 *   - Deduplicates socket tasks to prevent duplicates in TaskList.jsx.
 *   - Uses debounced task fetching to reduce API calls.
 * Mechanics:
 *   - Uses useState for task state, useCallback for memoized functions, useEffect for socket syncing and polling.
 *   - Validates token and socket connections before operations.
 *   - Logs errors to idurar_db.logs via logClientError.js.
 * Dependencies:
 *   - React: useState, useCallback, useEffect (version 18.3.1).
 *   - axios: API requests (version 1.7.7).
 *   - socket.io-client: Real-time updates (version 4.8.1).
 *   - lodash/debounce: Debounce task fetching (version 4.17.21).
 *   - apiClient: Configured axios instance from serverApiConfig.js.
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - TaskInput.jsx: Submits tasks via submitTask.
 *   - TaskList.jsx: Displays tasks from tasks state.
 *   - GrokUI.jsx: Provides token and messageApi.
 * Why It’s Here:
 *   - Centralizes task logic for Sprint 2, fixing task status sync issues (User, 04/30/2025).
 * Change Log:
 *   - 04/07/2025: Initialized task fetching and submission (Nate).
 *   - 04/30/2025: Added socket task deduplication (Grok).
 *   - 05/04/2025: Fixed 404 errors for task endpoints (Grok).
 *     - Why: 404 Not Found for GET /tasks and POST /edit (User, 05/04/2025).
 *     - How: Updated endpoints to /api/grok/tasks and /api/grok/edit, preserved functionality.
 *     - Test: Load /grok, submit task, verify no 404 errors, task appears in TaskList.jsx.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit "Create an inventory system".
 *   - Verify task appears in TaskList.jsx, no 404 errors, socket tasks sync.
 *   - Check console for 'useTasks: Syncing socket tasks' logs.
 * Rollback Instructions:
 *   - Revert to useTasks.js.bak (`mv frontend/src/hooks/useTasks.js.bak frontend/src/hooks/useTasks.js`).
 *   - Verify /grok loads, tasks fetch (may have 404 errors).
 * Future Enhancements:
 *   - Add task filtering (Sprint 4).
 *   - Support task prioritization (Sprint 5).
 */

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import apiClient from '../config/serverApiConfig';
import { logClientError } from '../utils/logClientError';

const useTasks = ({ token, messageApi }) => {
  const [tasks, setTasks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = useCallback(
    debounce(async (taskId = null) => {
      try {
        const params = taskId ? { taskId } : {};
        const response = await axios.get(`${apiClient.defaults.baseURL}tasks`, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setTasks(response.data.tasks || []);
        console.log('useTasks: Fetched tasks', {
          taskCount: response.data.tasks?.length || 0,
          taskId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        console.error('useTasks: Fetch tasks failed', {
          error: errorMessage,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        logClientError({
          message: errorMessage,
          context: 'useTasks',
          details: { error: errorMessage, stack: error.stack, timestamp: new Date().toISOString() },
        });
        messageApi?.error(`Failed to fetch tasks: ${errorMessage}`);
      }
    }, 1000),
    [token, messageApi]
  );

  const submitTask = useCallback(
    async (prompt, files = []) => {
      if (!token) {
        const errorMessage = 'Authentication token is missing';
        console.error('useTasks: Submit task failed', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
        logClientError({
          message: errorMessage,
          context: 'useTasks',
          details: { timestamp: new Date().toISOString() },
        });
        messageApi?.error(errorMessage);
        return;
      }

      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('requestId', Math.random().toString(36).substring(2));
        files.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj, file.name);
          }
        });

        const response = await axios.post(`${apiClient.defaults.baseURL}edit`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('useTasks: Task submitted', {
          taskId: response.data.task?.taskId,
          prompt,
          fileCount: files.length,
          timestamp: new Date().toISOString(),
        });
        fetchTasks();
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        console.error('useTasks: Submit task failed', {
          error: errorMessage,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        logClientError({
          message: errorMessage,
          context: 'useTasks',
          details: { error: errorMessage, stack: error.stack, timestamp: new Date().toISOString() },
        });
        messageApi?.error(`Failed to submit task: ${errorMessage}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, messageApi, fetchTasks]
  );

  const clearTasks = useCallback(async () => {
    try {
      await axios.delete(`${apiClient.defaults.baseURL}clear-tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks([]);
      console.log('useTasks: Tasks cleared', { timestamp: new Date().toISOString() });
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error('useTasks: Clear tasks failed', {
        error: errorMessage,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      logClientError({
        message: errorMessage,
        context: 'useTasks',
        details: { error: errorMessage, stack: error.stack, timestamp: new Date().toISOString() },
      });
      messageApi?.error(`Failed to clear tasks: ${errorMessage}`);
    }
  }, [token, messageApi]);

  useEffect(() => {
    if (token) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 10000);
      return () => clearInterval(interval);
    }
  }, [token, fetchTasks]);

  return {
    tasks,
    submitTask,
    fetchTasks,
    clearTasks,
    isSubmitting,
  };
};

export default useTasks;
