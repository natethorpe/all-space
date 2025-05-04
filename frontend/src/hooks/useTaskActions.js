/*
 * File Path: frontend/src/hooks/useTaskActions.js
 * Purpose: Handles task-related actions (test execution, approval, denial, deletion) for Allur Space Console.
 * How It Works:
 *   - Provides functions to execute Playwright tests, approve/deny tasks, and delete tasks via API calls.
 *   - Integrates with serverApiConfig.js for authenticated API requests.
 *   - Logs actions and errors to logClientError.js for debugging.
 * Mechanics:
 *   - Uses axios for API requests to /api/grok endpoints.
 *   - Opens testUrl in a new tab for Playwright tests.
 *   - Updates task status via API calls for approval/denial/deletion.
 * Dependencies:
 *   - React: useCallback for memoized functions (version 18.3.1).
 *   - axios: API requests via serverApiConfig.js (version 1.8.4).
 *   - antd: message for user notifications (version 5.24.6).
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - TaskList.jsx: Uses action handlers for button clicks.
 *   - GrokUI.jsx: Indirectly uses via TaskList.jsx.
 * Why It’s Here:
 *   - Centralizes task action logic for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized with test execution and deletion (Nate).
 *   - 04/23/2025: Added approve/deny actions (Nate).
 *   - 04/29/2025: Fixed 500 error handling for /test endpoint (Nate).
 *   - 05/08/2025: Prevented completed status update (Grok).
 *   - 05/08/2025: Enhanced logging and ensured no status update (Grok).
 *   - 05/08/2025: Reapplied to ensure compatibility post-Hook fixes (Grok).
 *   - 05/08/2025: Removed unused clearTasks (Grok).
 *     - Why: Task submission failing due to submitTask error, clearTasks not used (User, 05/08/2025).
 *     - How: Removed clearTasks, preserved core functionality.
 *     - Test: Verify TaskList.jsx buttons work, no clearTasks references.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit a task.
 *   - Click Playwright button in TaskList.jsx, verify testUrl opens, button stays enabled.
 *   - Click Approve/Deny, verify task status updates correctly.
 *   - Click Delete, verify task is removed.
 *   - Check browser console for action logs, no errors.
 * Rollback Instructions:
 *   - Revert to useTaskActions.js.bak (`mv frontend/src/hooks/useTaskActions.js.bak frontend/src/hooks/useTaskActions.js`).
 *   - Verify task actions work (Playwright button may disable).
 * Future Enhancements:
 *   - Add batch actions (Sprint 4).
 *   - Support action history (Sprint 5).
 */

import { useCallback } from 'react';
import apiClient from '../config/serverApiConfig';
import { logClientError } from '../utils/logClientError';

const useTaskActions = (messageApi) => {
  const handleTest = useCallback(async (taskId, testUrl) => {
    try {
      if (!testUrl) {
        throw new Error('No test URL provided');
      }
      console.log('useTaskActions: Executing test', { taskId, testUrl });
      window.open(testUrl, '_blank');
      console.log('useTaskActions: Test executed', { taskId, testUrl });
    } catch (error) {
      console.error('useTaskActions: Test execution failed', { taskId, error: error.message });
      messageApi.error('Failed to run test');
      logClientError({
        message: `useTaskActions: handleTest error: ${error.message}`,
        context: 'useTaskActions',
        details: {
          taskId,
          testUrl,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [messageApi]);

  const handleApprove = useCallback(async (taskId) => {
    try {
      const response = await apiClient.post(`/grok/approve/${taskId}`);
      if (response.data.success) {
        console.log('useTaskActions: Task approved', { taskId });
        messageApi.success('Task approved');
      } else {
        throw new Error(response.data.message || 'Failed to approve task');
      }
    } catch (error) {
      console.error('useTaskActions: Approve failed', { taskId, error: error.message });
      messageApi.error('Failed to approve task');
      logClientError({
        message: `useTaskActions: handleApprove error: ${error.message}`,
        context: 'useTaskActions',
        details: {
          taskId,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [messageApi]);

  const handleDeny = useCallback(async (taskId) => {
    try {
      const response = await apiClient.post(`/grok/deny/${taskId}`);
      if (response.data.success) {
        console.log('useTaskActions: Task denied', { taskId });
        messageApi.success('Task denied');
      } else {
        throw new Error(response.data.message || 'Failed to deny task');
      }
    } catch (error) {
      console.error('useTaskActions: Deny failed', { taskId, error: error.message });
      messageApi.error('Failed to deny task');
      logClientError({
        message: `useTaskActions: handleDeny error: ${error.message}`,
        context: 'useTaskActions',
        details: {
          taskId,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [messageApi]);

  const handleDelete = useCallback(async (taskId) => {
    try {
      const response = await apiClient.delete(`/grok/task/${taskId}`);
      if (response.data.success) {
        console.log('useTaskActions: Task deleted', { taskId });
        messageApi.success('Task deleted');
      } else {
        throw new Error(response.data.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('useTaskActions: Delete failed', { taskId, error: error.message });
      messageApi.error('Failed to delete task');
      logClientError({
        message: `useTaskActions: handleDelete error: ${error.message}`,
        context: 'useTaskActions',
        details: {
          taskId,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [messageApi]);

  return { handleTest, handleApprove, handleDeny, handleDelete };
};

export default useTaskActions;
