/*
 * File Path: frontend/src/hooks/useTaskActions.js
 * Purpose: Provides task management actions for Allur Space Console.
 * How It Works:
 *   - Exports functions for task submission, deletion, testing, and proposal operations.
 *   - Uses apiClient for API calls with retry logic and deduplication.
 * Mechanics:
 *   - submitTask: POST /api/grok/edit with FormData, handles 409 for duplicates.
 *   - deleteTask, handleTestTask, approveProposal, rollbackProposal, clearTasks: Call respective endpoints.
 * Dependencies:
 *   - react@18.3.1: useCallback for memoization.
 *   - axios@1.8.4: apiClient for API calls.
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - TaskInput.jsx: submitTask, clearTasks.
 *   - TaskList.jsx: deleteTask, handleTestTask, approveProposal, rollbackProposal.
 * Why It’s Here:
 *   - Encapsulates task action logic for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized delete/test functions (Nate).
 *   - 05/07/2025: Enhanced submitTask for 409 response handling (Grok).
 *     - Why: Support backend requestId deduplication (User, 05/01/2025).
 *     - How: Added 409 error handling, logged duplicates to clientErrors.
 *     - Test: Rapidly submit task, verify 409 response, single task created.
 * Test Instructions:
 *   - Run `npm run dev`, submit "Create an inventory system" multiple times.
 *   - Verify single task in idurar_db.tasks, 409 logged in clientErrors.
 *   - Delete task, run Playwright test, confirm functionality.
 * Future Enhancements:
 *   - Add batch task deletion (Sprint 3).
 *   - Support task prioritization (Sprint 3).
 */

import { useCallback } from 'react';
import apiClient from '../config/serverApiConfig';
import { logClientError } from '../utils/logClientError';

const useTaskActions = (fetchTasks = () => {}) => {
  const seenRequests = new Set();

  const retryRequest = async (requestFn, args, retries = 3, backoff = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await requestFn(...args);
        return response.data;
      } catch (error) {
        if (attempt === retries) {
          const errorMessage = error.response?.data?.message || error.message || 'Request failed';
          await logClientError(`Failed after ${retries} attempts: ${errorMessage}`, 'useTaskActions', {
            args,
            attempt,
            timestamp: new Date().toISOString(),
          });
          throw new Error(errorMessage);
        }
        await new Promise(resolve => setTimeout(resolve, backoff * attempt));
      }
    }
  };

  const submitTask = useCallback(async (formData) => {
    const requestId = formData.get('requestId');
    if (seenRequests.has(requestId)) {
      console.log('useTaskActions: Skipped duplicate request', { requestId });
      throw new Error('This request was already submitted');
    }
    seenRequests.add(requestId);
    try {
      const response = await retryRequest(
        apiClient.post,
        ['/grok/edit', formData, { headers: { 'Content-Type': 'multipart/form-data' } }],
        3,
        1000
      );
      console.log('useTaskActions: Task submitted', { taskId: response.task?.taskId });
      await fetchTasks();
      return response;
    } catch (error) {
      if (error.response?.status === 409) {
        await logClientError({
          message: 'Duplicate task submission rejected',
          context: 'useTaskActions',
          details: { requestId, error: error.message, timestamp: new Date().toISOString() },
        });
        throw new Error('This request was already submitted');
      }
      throw new Error(`Failed to submit task: ${error.message}`);
    } finally {
      seenRequests.delete(requestId);
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await retryRequest(apiClient.delete, [`/grok/tasks/${taskId}`], 3, 1000);
      console.log('useTaskActions: Task deleted', { taskId });
      await fetchTasks();
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }, [fetchTasks]);

  const handleTestTask = useCallback(async (taskId, stagedFiles) => {
    if (!stagedFiles || stagedFiles.length === 0) {
      throw new Error('No staged files available for testing');
    }
    try {
      const response = await retryRequest(
        apiClient.post,
        [`/grok/test/${taskId}`, { manual: true }],
        3,
        1000
      );
      console.log('useTaskActions: Test executed', { taskId, testUrl: response.testUrl });
      return response;
    } catch (error) {
      throw new Error(`Failed to run Playwright test: ${error.message}`);
    }
  }, []);

  const approveProposal = useCallback(async (proposalId) => {
    try {
      await retryRequest(
        apiClient.post,
        [`/grok/proposal/approve/${proposalId}`],
        3,
        1000
      );
      console.log('useTaskActions: Proposal approved', { proposalId });
      await fetchTasks();
    } catch (error) {
      throw new Error(`Failed to approve proposal: ${error.message}`);
    }
  }, [fetchTasks]);

  const rollbackProposal = useCallback(async (proposalId) => {
    try {
      await retryRequest(
        apiClient.post,
        [`/grok/proposal/rollback/${proposalId}`],
        3,
        1000
      );
      console.log('useTaskActions: Proposal rolled back', { proposalId });
      await fetchTasks();
    } catch (error) {
      throw new Error(`Failed to rollback proposal: ${error.message}`);
    }
  }, [fetchTasks]);

  const clearTasks = useCallback(async () => {
    try {
      await retryRequest(apiClient.delete, ['/grok/clear-tasks'], 3, 1000);
      console.log('useTaskActions: All tasks cleared');
      await fetchTasks();
    } catch (error) {
      throw new Error(`Failed to clear tasks: ${error.message}`);
    }
  }, [fetchTasks]);

  return {
    submitTask,
    deleteTask,
    handleTestTask,
    approveProposal,
    rollbackProposal,
    clearTasks,
  };
};

export default useTaskActions;
