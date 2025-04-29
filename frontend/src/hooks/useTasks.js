/*
 * File Path: frontend/src/hooks/useTasks.js
 * Purpose: Custom hook for managing task-related state and actions in Allur Space Console.
 * How It Works:
 *   - Handles task creation, fetching, updating, and deletion via API calls to /api/grok.
 *   - Manages task input state, loading states, and error handling.
 *   - Integrates with useTaskDiff for diff viewer functionality.
 * Mechanics:
 *   - Uses axios for API requests with JWT token authentication.
 *   - Validates token via /api/auth/validate before API calls.
 *   - Maintains task list, selected task, and error states with useState.
 * Dependencies:
 *   - React: useState, useEffect for state and lifecycle management (version 18.3.1).
 *   - axios: HTTP requests (version 1.7.7).
 *   - antd: message for notifications (version 5.24.6).
 *   - react-router-dom: useNavigate for redirects.
 *   - useTaskDiff.js: Diff viewer logic.
 * Dependents:
 *   - GrokUI.jsx: Uses hook for task management and rendering.
 *   - TaskInput.jsx, TaskList.jsx, TaskModals.jsx: Display and interact with task data.
 * Why It’s Here:
 *   - Centralizes task logic for Sprint 2 task management workflows (04/07/2025).
 * Change Log:
 *   - 04/23/2025: Added token validation, error handling, and API client setup.
 *   - 04/24/2025: Integrated useTaskSocket for real-time updates.
 *   - 04/25/2025: Fixed network error handling.
 *     - Why: Network errors (ERR_CONNECTION_REFUSED) caused unhandled failures (User, 04/25/2025).
 *     - How: Added retry logic for network errors, displayed user-friendly error messages, ensured token validation handles network failures gracefully.
 *   - 04/25/2025: Split diff viewer logic to useTaskDiff.js for Sprint 3 modularity.
 *     - Why: Reduce hook size from ~500 to ~150 lines, improve maintainability (User, 04/25/2025).
 *     - How: Extracted selectedTask, showDiff logic to useTaskDiff.js, updated TaskList.jsx integration.
 *   - 04/25/2025: Enhanced handleTestTask for stagedFiles validation.
 *     - Why: Fix Playwright button failure due to invalid stagedFiles (User, 04/25/2025).
 *     - How: Added stagedFiles check, retry logic for network errors, updated logging.
 *   - 04/25/2025: Fixed TypeError in useTaskDiff call.
 *     - Why: useTaskDiff called without required props, causing undefined destructuring error (User, 04/25/2025).
 *     - How: Passed token, navigate, messageApi, tasks, setTasks to useTaskDiff, added error logging.
 *   - 04/26/2025: Added refreshTask for Playwright button fix.
 *     - Why: Stale task.stagedFiles caused Playwright button failure (User, 04/26/2025).
 *     - How: Added refreshTask to fetch latest task data before testing, strengthened stagedFiles validation, enhanced logging.
 *   - 04/28/2025: Enhanced refreshTask with retry logic and stricter validation.
 *     - Why: Fix Playwright button failures due to MongoDB transaction errors and stale stagedFiles (User, 04/28/2025).
 *     - How: Increased retry attempts to 5, added stricter stagedFiles validation, enhanced error logging for network failures.
 *   - 05/XX/2025: Fixed messageApi.error misuse causing React warning.
 *     - Why: Incorrectly passing setTaskError function to messageApi.error caused "Functions are not valid as a React child" warning (User, 05/XX/2025).
 *     - How: Changed messageApi.error(setTaskError) to messageApi.error(taskError), ensured error messages are strings, added logging for error validation.
 *     - Test: Submit task, verify no React warnings, error messages display correctly in UI.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify TaskList.jsx shows tasks, TaskInput.jsx allows task submission, no React warnings.
 *   - Submit “Build CRM system” via TaskInput.jsx: Confirm task created, appears in TaskList.jsx, no HTTP 500 errors, no React warnings.
 *   - Click Test on valid task: Confirm browser opens, no errors; on invalid task, verify error message in UI.
 *   - Click View Diff: Verify diff drawer from useTaskDiff.js, no console errors.
 *   - Clear tasks via TaskInput.jsx: Confirm tasks removed, no errors.
 *   - Simulate network failure (stop backend): Verify ErrorAlerts shows “Network error: Unable to connect to server”, no console errors, no React warnings.
 * Future Enhancements:
 *   - Add task filtering by status (Sprint 4).
 *   - Support task prioritization UI (Sprint 5).
 * Self-Notes:
 *   - Nate: Added token validation and error handling for robust API calls (04/23/2025).
 *   - Nate: Integrated real-time updates with useTaskSocket (04/24/2025).
 *   - Nate: Enhanced network error handling with retries and user feedback (04/25/2025).
 *   - Nate: Split diff logic to useTaskDiff.js, fixed Playwright button (04/25/2025).
 *   - Nate: Fixed useTaskDiff TypeError by passing required props (04/25/2025).
 *   - Nate: Added refreshTask and strengthened stagedFiles validation for Playwright fix (04/26/2025).
 *   - Nate: Enhanced refreshTask with retries and validation for MongoDB transaction fix (04/28/2025).
 *   - Nate: Fixed messageApi.error misuse to resolve React warning (05/XX/2025).
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';
import useTaskDiff from './useTaskDiff';

const useTasks = ({ token, navigate, messageApi }) => {
  const [tasks, setTasks] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [taskError, setTaskError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({});
  const [denyModalVisible, setDenyModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const maxRetries = 5;
  const retryDelay = 2000;

  // Pass required props to useTaskDiff
  const { selectedTask, setSelectedTask, showDiff } = useTaskDiff({
    token,
    navigate,
    messageApi,
    tasks,
    setTasks,
  });

  console.log('useTasks: Initializing with token:', token ? 'present' : 'missing');

  // Validate token
  useEffect(() => {
    const validateToken = async (attempt = 1) => {
      if (!token) {
        console.error('useTasks: No token provided');
        setTaskError('No authentication token available');
        setIsTokenValid(false);
        navigate('/login');
        return;
      }

      try {
        console.log('useTasks: Attempting token validation');
        await axios.get('http://localhost:8888/api/auth/validate', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('useTasks: Token validation successful');
        setIsTokenValid(true);
      } catch (err) {
        console.error('useTasks: Token validation failed:', err.message);
        if (err.code === 'ERR_NETWORK' && attempt < maxRetries) {
          console.log(`useTasks: Retrying token validation (${attempt + 1}/${maxRetries})...`);
          setTimeout(() => validateToken(attempt + 1), retryDelay);
          return;
        }
        setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Invalid token. Please log in again.');
        setIsTokenValid(false);
        navigate('/login');
      }
    };

    validateToken();
  }, [token, navigate]);

  // Fetch tasks
  const fetchTasks = async () => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping fetchTasks due to invalid token');
      return;
    }

    setLoadingTasks(true);
    try {
      console.log('useTasks: fetchTasks called');
      const response = await axios.get('http://localhost:8888/api/grok/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedTasks = response.data || [];
      console.log('useTasks: Fetched tasks:', fetchedTasks.map(t => ({ taskId: t.taskId, stagedFiles: t.stagedFiles })));
      setTasks(fetchedTasks);
      setTaskError(null);
    } catch (err) {
      console.error('useTasks: fetchTasks error:', err.message);
      setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to fetch tasks');
      console.log('useTasks: Displaying error:', taskError || 'Failed to fetch tasks');
      messageApi.error(taskError || 'Failed to fetch tasks'); // Use taskError string
    } finally {
      setLoadingTasks(false);
    }
  };

  // Refresh single task
  const refreshTask = async (taskId) => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping refreshTask due to invalid token');
      return null;
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log('useTasks: refreshTask called for taskId:', taskId, `Attempt ${attempt + 1}/${maxRetries}`);
        const response = await axios.get(`http://localhost:8888/api/grok/tasks?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const task = response.data[0];
        if (task) {
          if (!Array.isArray(task.stagedFiles) || !task.stagedFiles.every(f => f.path && f.content)) {
            console.warn('useTasks: Invalid stagedFiles after refresh:', { taskId, stagedFiles: task.stagedFiles });
            throw new Error('Invalid stagedFiles');
          }
          console.log('useTasks: Refreshed task:', { taskId, stagedFiles: task.stagedFiles });
          setTasks((prev) => prev.map(t => t.taskId === taskId ? task : t));
          return task;
        }
        console.warn('useTasks: Task not found during refresh:', taskId);
        return null;
      } catch (err) {
        attempt++;
        console.error('useTasks: refreshTask error:', err.message, `Attempt ${attempt}/${maxRetries}`);
        if (err.code === 'ERR_NETWORK' && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to refresh task');
        console.log('useTasks: Displaying error:', taskError || 'Failed to refresh task');
        messageApi.error(taskError || 'Failed to refresh task'); // Use taskError string
        return null;
      }
    }
  };

  useEffect(() => {
    if (isTokenValid) {
      fetchTasks();
    }
  }, [isTokenValid]);

  // Handle task submission
  const handleSubmit = async () => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping handleSubmit due to invalid token');
      setTaskError('Authentication required');
      return;
    }

    setIsSubmitting(true);
    setButtonLoading((prev) => ({ ...prev, submit: true }));
    try {
      await axios.post('http://localhost:8888/api/grok/edit', { prompt }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrompt('');
      messageApi.success('Task submitted successfully');
      fetchTasks();
    } catch (err) {
      console.error('useTasks: handleSubmit error:', err.message);
      setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : err.response?.data?.error || 'Failed to submit task');
      console.log('useTasks: Displaying error:', taskError || 'Failed to submit task');
      messageApi.error(taskError || 'Failed to submit task'); // Use taskError string
    } finally {
      setIsSubmitting(false);
      setButtonLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  // Clear tasks
  const clearTasks = async () => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping clearTasks due to invalid token');
      setTaskError('Authentication required');
      return;
    }

    setButtonLoading((prev) => ({ ...prev, clear: true }));
    try {
      await axios.delete('http://localhost:8888/api/grok/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks([]);
      messageApi.success('All tasks cleared');
    } catch (err) {
      console.error('useTasks: clearTasks error:', err.message);
      setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to clear tasks');
      console.log('useTasks: Displaying error:', taskError || 'Failed to clear tasks');
      messageApi.error(taskError || 'Failed to clear tasks'); // Use taskError string
    } finally {
      setButtonLoading((prev) => ({ ...prev, clear: false }));
    }
  };

  // Handle test task
  const handleTestTask = async (taskId) => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping handleTestTask due to invalid token');
      setTaskError('Authentication required');
      return;
    }

    // Refresh task data to ensure latest stagedFiles
    const task = await refreshTask(taskId);
    if (!task) {
      console.error('useTasks: Task not found after refresh:', taskId);
      setTaskError('Task not found');
      messageApi.error('Task not found');
      return;
    }

    if (!Array.isArray(task.stagedFiles) || task.stagedFiles.length === 0 || !task.stagedFiles.every(f => f.path && f.content)) {
      console.error('useTasks: Invalid stagedFiles for task:', { taskId, stagedFiles: task.stagedFiles });
      setTaskError('Cannot test task: Invalid or missing staged files');
      messageApi.error('Cannot test task: Invalid or missing staged files');
      return;
    }

    setButtonLoading((prev) => ({ ...prev, [`test_${taskId}`]: true }));
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log('useTasks: Initiating test for task:', taskId, 'stagedFiles:', task.stagedFiles);
        await axios.post(`http://localhost:8888/api/grok/test`, { taskId, manual: true }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        messageApi.success('Task test initiated');
        break;
      } catch (err) {
        console.error('useTasks: handleTestTask error:', err.message);
        if (err.code === 'ERR_NETWORK' && attempt < maxRetries - 1) {
          console.log(`useTasks: Retrying test task (${attempt + 1}/${maxRetries})...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to test task');
        console.log('useTasks: Displaying error:', taskError || 'Failed to test task');
        messageApi.error(taskError || 'Failed to test task'); // Use taskError string
        break;
      } finally {
        setButtonLoading((prev) => ({ ...prev, [`test_${taskId}`]: false }));
      }
    }
  };

  // Handle approve task
  const handleApproveTask = async (taskId) => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping handleApproveTask due to invalid token');
      setTaskError('Authentication required');
      return;
    }

    setButtonLoading((prev) => ({ ...prev, [`approve_${taskId}`]: true }));
    try {
      await axios.post(`http://localhost:8888/api/grok/approve`, { taskId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      messageApi.success('Task approved');
      fetchTasks();
    } catch (err) {
      console.error('useTasks: handleApproveTask error:', err.message);
      setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to approve task');
      console.log('useTasks: Displaying error:', taskError || 'Failed to approve task');
      messageApi.error(taskError || 'Failed to approve task'); // Use taskError string
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`approve_${taskId}`]: false }));
    }
  };

  // Show deny modal
  const showDenyModal = (taskId) => {
    setSelectedTaskId(taskId);
    setDenyModalVisible(true);
  };

  // Handle deny modal OK
  const handleDenyModalOk = async () => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping handleDenyModalOk due to invalid token');
      setTaskError('Authentication required');
      return;
    }

    setButtonLoading((prev) => ({ ...prev, deny: true }));
    try {
      await axios.post(`http://localhost:8888/api/grok/deny`, { taskId: selectedTaskId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      messageApi.success('Task denied');
      setDenyModalVisible(false);
      setSelectedTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error('useTasks: handleDenyModalOk error:', err.message);
      setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to deny task');
      console.log('useTasks: Displaying error:', taskError || 'Failed to deny task');
      messageApi.error(taskError || 'Failed to deny task'); // Use taskError string
    } finally {
      setButtonLoading((prev) => ({ ...prev, deny: false }));
    }
  };

  // Handle deny modal cancel
  const handleDenyModalCancel = () => {
    setDenyModalVisible(false);
    setSelectedTaskId(null);
  };

  // Delete task
  const deleteTask = async (taskId) => {
    if (!isTokenValid) {
      console.warn('useTasks: Skipping deleteTask due to invalid token');
      setTaskError('Authentication required');
      return;
    }

    setButtonLoading((prev) => ({ ...prev, [`delete_${taskId}`]: true }));
    try {
      await axios.delete(`http://localhost:8888/api/grok/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      messageApi.success('Task deleted');
      fetchTasks();
    } catch (err) {
      console.error('useTasks: deleteTask error:', err.message);
      setTaskError(err.code === 'ERR_NETWORK' ? 'Network error: Unable to connect to server' : 'Failed to delete task');
      console.log('useTasks: Displaying error:', taskError || 'Failed to delete task');
      messageApi.error(taskError || 'Failed to delete task'); // Use taskError string
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`delete_${taskId}`]: false }));
    }
  };

  return {
    tasks,
    setTasks,
    selectedTask,
    setSelectedTask,
    prompt,
    setPrompt,
    taskError,
    setTaskError,
    fileError,
    setFileError,
    loadingTasks,
    isSubmitting,
    buttonLoading,
    denyModalVisible,
    selectedTaskId,
    handleSubmit,
    clearTasks,
    showDiff,
    handleTestTask,
    handleApproveTask,
    showDenyModal,
    handleDenyModalOk,
    handleDenyModalCancel,
    deleteTask,
  };
};

export default useTasks;
