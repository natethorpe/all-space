/*
 * File Path: frontend/src/hooks/useTasks.js
 * Purpose: Manages task state and API interactions for Allur Space Console, handling task submission, fetching, and clearing.
 * How It Works:
 *   - Uses React hooks to manage prompt, tasks, loading states, and submission status.
 *   - Interacts with /api/grok endpoints via serverApiConfig.js for task operations.
 *   - Logs errors to logClientError.js for debugging.
 * Dependencies:
 *   - React: useState, useEffect, useCallback (version 18.3.1).
 *   - axios: API requests via serverApiConfig.js (version 1.8.4).
 *   - antd: message for user notifications (version 5.24.6).
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - GrokUI.jsx: Uses hook for task input and list rendering.
 *   - TaskInput.jsx: Passes prompt, setPrompt, handleSubmit, clearTasks.
 *   - TaskList.jsx: Uses tasks and task management functions.
 * Why It’s Here:
 *   - Centralizes task management logic for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized task management hook.
 *   - 04/23/2025: Fixed API error handling for /edit endpoint.
 *   - 04/29/2025: Fixed HTTP 500 error handling and loading states.
 *   - 04/29/2025: Added user-friendly error for network failures.
 *   - 04/30/2025: Used messageApi to fix [antd: message] warning (Grok).
 *     - Why: Warning due to static message.error calls (User, 04/30/2025).
 *     - How: Passed messageApi from GrokUI.jsx, replaced message.error with messageApi.error.
 *     - Test: Load /grok, submit task, verify no [antd: message] warning.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit "Build CRM system".
 *   - Verify no [antd: message] warning in console.
 *   - Trigger network error (stop backend), confirm error message via messageApi.
 *   - Check browser console for error logs via logClientError.
 * Rollback Instructions:
 *   - Revert to useTasks.js.bak (`mv frontend/src/hooks/useTasks.js.bak frontend/src/hooks/useTasks.js`).
 *   - Verify task submission works post-rollback.
 * Future Enhancements:
 *   - Add task filtering (Sprint 4).
 *   - Support task prioritization UI (Sprint 5).
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../config/serverApiConfig';
import { logClientError } from '../utils/logClientError';

const useTasks = (messageApi) => {
  const [prompt, setPrompt] = useState('');
  const [tasks, setTasks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({ submit: false, clear: false });

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiClient.get('/grok/tasks');
      if (response.data.success) {
        setTasks(response.data.tasks);
      } else {
        throw new Error('Failed to fetch tasks');
      }
    } catch (error) {
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message.includes('Network Error');
      const errorMessage = isNetworkError ? 'Backend server is unavailable. Please try again later.' : error.message;
      messageApi.error(errorMessage);
      logClientError({
        message: `Failed to fetch tasks: ${error.message}`,
        context: 'useTasks',
        details: { stack: error.stack, timestamp: new Date().toISOString() },
      });
      console.error('useTasks: XHR failed loading: GET "/grok/tasks".', error);
    }
  }, [messageApi]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setButtonLoading(prev => ({ ...prev, submit: true }));

    try {
      const response = await apiClient.post('/grok/edit', { prompt });
      if (response.data.success) {
        setTasks(prev => [response.data.task, ...prev]);
        setPrompt('');
      } else {
        throw new Error(response.data.message || 'Task submission failed');
      }
    } catch (error) {
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message.includes('Network Error');
      const errorMessage = isNetworkError ? 'Backend server is unavailable. Please try again later.' : error.message;
      messageApi.error(errorMessage);
      logClientError({
        message: `useTasks: handleSubmit error: ${error.message}`,
        context: 'useTasks',
        details: {
          method: 'POST',
          url: 'http://localhost:8888/api/grok/edit',
          status: error.response?.status,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setIsSubmitting(false);
      setButtonLoading(prev => ({ ...prev, submit: false }));
    }
  }, [prompt, isSubmitting, messageApi]);

  const clearTasks = useCallback(async () => {
    setButtonLoading(prev => ({ ...prev, clear: true }));
    try {
      const response = await apiClient.delete('/grok/clear-tasks');
      if (response.data.success) {
        setTasks([]);
      } else {
        throw new Error('Failed to clear tasks');
      }
    } catch (error) {
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message.includes('Network Error');
      const errorMessage = isNetworkError ? 'Backend server is unavailable. Please try again later.' : error.message;
      messageApi.error(errorMessage);
      logClientError({
        message: `Failed to clear tasks: ${error.message}`,
        context: 'useTasks',
        details: { stack: error.stack, timestamp: new Date().toISOString() },
      });
    } finally {
      setButtonLoading(prev => ({ ...prev, clear: false }));
    }
  }, [messageApi]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { prompt, setPrompt, tasks, handleSubmit, clearTasks, isSubmitting, buttonLoading };
};

export default useTasks;
