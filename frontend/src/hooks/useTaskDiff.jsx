/*
 * File Path: frontend/src/hooks/useTaskDiff.js
 * Purpose: Manages task diff viewer state and actions for Allur Space Console.
 * How It Works:
 *   - Handles code diff display, fetching file content (/grok/file-content), and test instructions in a Drawer.
 *   - Listens to Socket.IO fileContentUpdate events for real-time diff updates.
 * Mechanics:
 *   - Uses react-diff-viewer-continued for diff rendering, validates taskId.
 *   - Initializes selectedTask with safe defaults to prevent null errors.
 * Dependencies:
 *   - React: useState, useEffect, useRef for state and lifecycle.
 *   - antd: message, Drawer for UI.
 *   - react-diff-viewer-continued: Diff rendering.
 *   - axios: apiClient for API calls.
 *   - socket.io-client: Real-time updates (version 4.8.1).
 *   - moment: Timestamp formatting.
 * Dependents:
 *   - useTasks.js: Integrates showDiff and diff state.
 *   - TaskList.jsx: Uses showDiff for “View Diff” action.
 *   - GrokUI.jsx: Renders diff Drawer.
 * Why It’s Here:
 *   - Modularizes diff logic from useTasks.js for Sprint 2, ~150 lines (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Extracted from useTasks.js, fixed JSX syntax error.
 *     - Why: Invalid object return in JSX (User, 04/23/2025).
 *     - How: Moved showDiff to export object, kept Drawer JSX.
 *     - Test: Click “View Diff” in TaskList, verify drawer, check console.
 *   - 04/23/2025: Fixed runtime error with API error handling.
 *     - Why: Address /grok runtime error from API failures (User, 04/23/2025).
 *     - How: Added 401/500 error handling in showDiff, initialized selectedTask with safe defaults, added debug logs for API calls, strengthened Socket.IO error handling.
 *   - 04/25/2025: Fixed TypeError due to undefined props.
 *     - Why: useTaskDiff called without required props, causing destructuring error (User, 04/25/2025).
 *     - How: Added default props with null checks, simplified prop requirements, updated logging for missing props.
 *     - Test: Click View Diff in TaskList, verify drawer renders without TypeError, check console for no errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, click “View Diff” in TaskList: Verify drawer shows diff, test instructions, staged/generated files, no TypeError.
 *   - Submit “Build CRM system”: Confirm fileContentUpdate updates diff, blue log in LiveFeed.
 *   - Clear localStorage.auth: Verify redirect to /login on “View Diff”, error in LiveFeed.
 * Future Enhancements:
 *   - Add diff syntax highlighting (Sprint 4).
 *   - Support file-specific diffs (Sprint 5).
 * Self-Notes:
 *   - Nate: Extracted diff logic, fixed JSX syntax (04/23/2025).
 *   - Nate: Fixed runtime error with 401 handling, safe defaults, debug logs (04/23/2025).
 *   - Nate: Fixed TypeError with default props and null checks (04/25/2025).
 * Rollback Instructions:
 *   - If diff drawer fails or crashes: Copy useTaskDiff.js.bak to useTaskDiff.js (`mv frontend/src/hooks/useTaskDiff.js.bak frontend/src/hooks/useTaskDiff.js`).
 *   - Verify “View Diff” works after rollback.
 */
import { useState, useEffect, useRef } from 'react';
import { message, Drawer } from 'antd';
import DiffViewer from 'react-diff-viewer-continued';
import apiClient from '../config/serverApiConfig';
import io from 'socket.io-client';
import moment from 'moment';

const getBaseName = (filePath) => {
  if (typeof filePath !== 'string' || !filePath) return filePath || 'Unknown';
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

const useTaskDiff = ({ token = null, navigate = () => {}, messageApi = null, tasks = [], setTasks = () => {} } = {}) => {
  console.log('useTaskDiff: Initializing with parameters:', {
    token: token ? 'present' : 'missing',
    navigate: !!navigate,
    messageApi: !!messageApi,
    tasksLength: tasks.length,
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({});
  const taskPromptsRef = useRef({});
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
    socketRef.current.on('fileContentUpdate', ({ taskId, originalContent, newContent, stagedFiles, generatedFiles, proposedChanges }) => {
      console.log('useTaskDiff: fileContentUpdate received:', { taskId, stagedFilesLength: stagedFiles?.length });
      if (selectedTask?.taskId === taskId) {
        setSelectedTask((prev) => ({
          ...prev,
          originalContent: originalContent || prev?.originalContent || '// No original content',
          newContent: newContent || prev?.newContent || '// No modified content',
          stagedFiles: Array.isArray(stagedFiles) ? stagedFiles : prev?.stagedFiles || [],
          generatedFiles: Array.isArray(generatedFiles) ? generatedFiles : prev?.generatedFiles || [],
          proposedChanges: Array.isArray(proposedChanges) ? proposedChanges : prev?.proposedChanges || [],
        }));
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
      setButtonLoading((prev) => ({ ...prev, [`diff_${taskId}`]: true }));
      console.log('useTaskDiff: Fetching file content for taskId:', taskId);
      const res = await apiClient.get(`/grok/file-content?taskId=${taskId}`);
      const taskData = res.data;

      const original = taskData.originalContent && Object.keys(taskData.originalContent).length > 0
        ? Object.entries(taskData.originalContent).map(([key, value]) => `// ${key}.jsx\n${value}`).join('\n\n')
        : '// No original content available';
      const modified = taskData.newContent && Object.keys(taskData.newContent).length > 0
        ? Object.entries(taskData.newContent).filter(([_, value]) => value && !value.includes('undefined') && value !== 'Timeout')
          .map(([key, value]) => `// ${key}.jsx\n${value}`).join('\n\n')
        : '// No modified content available';

      const taskPrompt = taskPromptsRef.current[taskId] || tasks.find((t) => t.taskId === taskId)?.prompt || 'Untitled';
      let testInstructions = 'Test Instructions:\n';
      if (taskPrompt.toLowerCase().includes('crm system') || taskPrompt.toLowerCase().includes('entire crm')) {
        testInstructions += [
          `- Login: Open http://localhost:3000/login, verify login form renders`,
          `- Dashboard: Open http://localhost:3000/dashboard, check navigation`,
          `- SponsorProfile: Open http://localhost:3000/sponsor/1, confirm profile loads`,
          `- EmployeeLog: Open http://localhost:3000/employee-log, test "Add Employee" and "Clock In"`,
          `- Settings: Open http://localhost:3000/settings, verify settings UI`,
        ].join('\n');
      } else {
        const target = taskPrompt.toLowerCase().includes('login') ? 'login' : 'grok';
        testInstructions += [`- Open http://localhost:3000/${target}`, `- Verify page renders and basic functionality works`].join('\n');
      }

      setSelectedTask({
        originalContent: original,
        newContent: modified,
        testInstructions,
        taskId,
        prompt: taskPrompt,
        stagedFiles: Array.isArray(taskData.stagedFiles) ? taskData.stagedFiles : [],
        generatedFiles: Array.isArray(taskData.generatedFiles) ? taskData.generatedFiles : [],
        proposedChanges: Array.isArray(taskData.proposedChanges) ? proposedChanges : [],
      });
      setDrawerVisible(true);
      console.log('useTaskDiff: Diff drawer opened for taskId:', taskId);
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : 'Failed to load task content';
      console.error('useTaskDiff: showDiff error:', errorMessage, err);
      if (messageApi) messageApi.error(errorMessage);
      if (err.response?.status === 401 && navigate) {
        console.warn('useTaskDiff: Redirecting to /login due to 401');
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`diff_${taskId}`]: false }));
    }
  };

  const drawerContent = (
    <Drawer
      title={`Task Diff: ${selectedTask?.prompt || 'Untitled'}`}
      placement="right"
      onClose={() => {
        console.log('useTaskDiff: Closing diff drawer');
        setDrawerVisible(false);
        setSelectedTask(null);
      }}
      open={drawerVisible}
      width="80%"
    >
      {selectedTask && (
        <>
          <h3>Test Instructions</h3>
          <pre>{selectedTask.testInstructions}</pre>
          <h3>Code Diff</h3>
          <DiffViewer
            oldValue={selectedTask.originalContent}
            newValue={selectedTask.newContent}
            splitView={true}
            showDiffOnly={true}
            styles={{ contentText: { fontFamily: 'monospace', fontSize: 12 } }}
          />
          <h3>Staged Files</h3>
          <ul>{selectedTask.stagedFiles?.map((file, index) => <li key={index}>{getBaseName(file)}</li>) || <li>No staged files</li>}</ul>
          <h3>Generated Files</h3>
          <ul>{selectedTask.generatedFiles?.map((file, index) => <li key={index}>{getBaseName(file)}</li>) || <li>No generated files</li>}</ul>
        </>
      )}
    </Drawer>
  );

  return {
    showDiff,
    buttonLoading,
    setButtonLoading,
    selectedTask,
    setSelectedTask,
    drawerVisible,
    setDrawerVisible,
    drawerContent,
  };
};

export default useTaskDiff;
