/*
 * File Path: frontend/src/hooks/useTaskDiff.jsx
 * Purpose: Manages task diff viewer state and actions for Allur Space Console.
 * How It Works:
 *   - Fetches task content (/grok/file-content) and computes granular diffs using jsdiff.
 *   - Displays diffs, test instructions, staged/generated files, and uploaded files in a modal.
 *   - Listens to Socket.IO fileContentUpdate events for real-time updates.
 * Mechanics:
 *   - Uses jsdiff for line-by-line diff computation.
 *   - Validates taskId and handles API errors (401/500).
 *   - Initializes selectedTask with safe defaults to prevent null errors.
 * Dependencies:
 *   - React: useState, useEffect, useRef for state and lifecycle (version 18.3.1).
 *   - antd: message for notifications (version 5.22.2).
 *   - diff: Computes text differences (version 5.2.0).
 *   - axios: apiClient for API calls (version 1.8.4).
 *   - socket.io-client: Real-time updates (version 4.8.1).
 * Dependents:
 *   - TaskList.jsx: Uses showDiff for “View Changes” action.
 *   - GrokUI.jsx: Provides token and navigate.
 * Why It’s Here:
 *   - Modularizes diff logic for Sprint 2, ~150 lines (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Extracted from useTasks.js, fixed JSX syntax error.
 *   - 04/23/2025: Fixed runtime error with API error handling.
 *   - 04/25/2025: Fixed TypeError due to undefined props.
 *   - 05/02/2025: Replaced react-diff-viewer with jsdiff, added testInstructions and uploadedFiles.
 *   - 05/03/2025: Fixed diff import error by using named exports (Grok).
 *     - Why: Resolve SyntaxError due to default import of diff (User, 05/03/2025).
 *     - How: Changed `import diff from 'diff'` to `import * as Diff from 'diff'`.
 *     - Test: Load /grok, click “View Changes”, verify modal renders without errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit “Create inventory system”.
 *   - Click “View Changes” in TaskList: Verify modal shows granular diffs, test instructions, staged/generated/uploaded files.
 *   - Submit “Add MFA to login” with a file: Confirm uploadedFiles listed in modal.
 *   - Clear localStorage.auth: Verify redirect to /login on “View Changes”.
 *   - Check console: No SyntaxError or TypeError, valid API calls.
 * Rollback Instructions:
 *   - Revert to useTaskDiff.jsx.bak (`mv frontend/src/hooks/useTaskDiff.jsx.bak frontend/src/hooks/useTaskDiff.jsx`).
 *   - Verify “View Changes” works after rollback.
 * Future Enhancements:
 *   - Add syntax highlighting for diffs (Sprint 4).
 *   - Support file-specific diffs (Sprint 5).
 */

import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import * as Diff from 'diff'; // Use named imports instead of default
import apiClient from '../config/serverApiConfig';
import io from 'socket.io-client';

const useTaskDiff = ({ token = null, navigate = () => {}, messageApi = null, tasks = [], setTasks = () => {} } = {}) => {
  console.log('useTaskDiff: Initializing with parameters:', {
    token: token ? 'present' : 'missing',
    navigate: !!navigate,
    messageApi: !!messageApi,
    tasksLength: tasks.length,
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [diffs, setDiffs] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      console.warn('useTaskDiff: No token provided, skipping Socket.IO setup');
      return;
    }

    console.log('useTaskDiff: Setting up Socket.IO');
    socketRef.current = io('http://localhost:8888', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current.on('fileContentUpdate', ({ taskId, originalContent, newContent, stagedFiles, generatedFiles, proposedChanges, testInstructions, uploadedFiles }) => {
      console.log('useTaskDiff: fileContentUpdate received:', { taskId, stagedFilesLength: stagedFiles?.length });
      if (selectedTask?.taskId === taskId) {
        const newDiffs = getTaskDiff(originalContent || {}, newContent || {});
        setSelectedTask((prev) => ({
          ...prev,
          originalContent: originalContent || prev?.originalContent || {},
          newContent: newContent || prev?.newContent || {},
          stagedFiles: Array.isArray(stagedFiles) ? stagedFiles : prev?.stagedFiles || [],
          generatedFiles: Array.isArray(generatedFiles) ? generatedFiles : prev?.generatedFiles || [],
          proposedChanges: Array.isArray(proposedChanges) ? proposedChanges : prev?.proposedChanges || [],
          testInstructions: testInstructions || prev?.testInstructions || 'No test instructions available',
          uploadedFiles: Array.isArray(uploadedFiles) ? uploadedFiles : prev?.uploadedFiles || [],
        }));
        setDiffs(newDiffs);
      }
    });
    socketRef.current.on('connect_error', (err) => {
      console.error('useTaskDiff: Socket.IO connection error:', err.message);
      if (messageApi) messageApi.error('Task diff feed connection lost');
    });
    return () => {
      if (socketRef.current) {
        console.log('useTaskDiff: Disconnecting Socket.IO');
        socketRef.current.disconnect();
      }
    };
  }, [token, messageApi]);

  /**
   * Computes granular diffs between original and new content.
   * @param {Object} originalContent - Original file contents.
   * @param {Object} newContent - New file contents.
   * @returns {Object} Diffs by file path.
   */
  const getTaskDiff = (originalContent = {}, newContent = {}) => {
    const diffs = {};
    const allFiles = [...new Set([...Object.keys(originalContent), ...Object.keys(newContent)])];

    allFiles.forEach(file => {
      const original = originalContent[file] || '';
      const updated = newContent[file] || '';
      const changes = Diff.diffLines(original, updated); // Use Diff.diffLines
      if (changes.some(change => change.added || change.removed)) {
        diffs[file] = changes;
      }
    });

    return diffs;
  };

  const showDiff = async (taskId) => {
    console.log('useTaskDiff: showDiff called with taskId:', taskId);
    if (!taskId || typeof taskId !== 'string') {
      console.warn('useTaskDiff: Invalid task ID');
      if (messageApi) messageApi.error('Invalid task ID');
      return;
    }
    if (!token) {
      console.warn('useTaskDiff: No token, redirecting to login');
      if (navigate) navigate('/login');
      return;
    }

    try {
      console.log('useTaskDiff: Fetching file content for taskId:', taskId);
      const res = await apiClient.get(`/grok/file-content?taskId=${taskId}`);
      const taskData = res.data;

      const task = tasks.find(t => t.taskId === taskId) || {};
      const diffs = getTaskDiff(taskData.originalContent || {}, taskData.newContent || {});

      setSelectedTask({
        taskId,
        prompt: task.prompt || 'Untitled',
        originalContent: taskData.originalContent || {},
        newContent: taskData.newContent || {},
        stagedFiles: Array.isArray(taskData.stagedFiles) ? taskData.stagedFiles : [],
        generatedFiles: Array.isArray(taskData.generatedFiles) ? taskData.generatedFiles : [],
        proposedChanges: Array.isArray(taskData.proposedChanges) ? taskData.proposedChanges : [],
        testInstructions: taskData.testInstructions || task.testInstructions || 'No test instructions available',
        uploadedFiles: Array.isArray(taskData.uploadedFiles) ? taskData.uploadedFiles : [],
      });
      setDiffs(diffs);
      console.log('useTaskDiff: Diff computed for taskId:', taskId);
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : 'Failed to load task content';
      console.error('useTaskDiff: showDiff error:', errorMessage, err);
      if (messageApi) messageApi.error(errorMessage);
      if (err.response?.status === 401 && navigate) {
        console.warn('useTaskDiff: Redirecting to /login due to 401');
        setTimeout(() => navigate('/login'), 2000);
      }
    }
  };

  return {
    showDiff,
    selectedTask,
    setSelectedTask,
    diffs,
    setDiffs,
    getTaskDiff,
  };
};

export default useTaskDiff;
