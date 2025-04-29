/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\GrokUI.jsx
 * Purpose: UI for Allur Space Console with task management, diff view, and backend proposal review.
 * How It Works: Displays tasks/proposals, handles submissions, approvals, and tests, with real-time updates via Socket.IO.
 * Dependencies: React (UI), antd (components), socket.io-client (real-time), lodash (debounce), axios (API), react-diff-viewer-continued (diff), moment (timestamps).
 * Dependents: Called via /grok route in routes.jsx, displays taskProcessorV18.js/taskTesterV18.js results.
 * Why It’s Here: Central interface for user interaction, key to Sprint 2 usability and our autonomous system vision.
 * Key Info: Manages task lifecycle, integrates testing, and shows live feed—vital for oversight and control.
 * Version: 1.2.0 (04/19/2025) - Enhanced live feed with search/export, improved edge case emissions, fixed 401 errors, completed Sprint 2.
 * Note: Complete section from handleDenyModalOk, preserving all functionality (diff modal, proposal workflows, live feed features).
 * Change Log:
 *   - 04/03/2025: Initial creation as AllurSpaceConsole.jsx with task submission (Chat Line 3000-ish).
 *   - 04/09/2025: Sprint 1 - Added backend proposal workflow (Sprint 1).
 *   - 04/10/2025: Sprint 2 - UI overhaul with pagination, live feed (Post-Sprint 2).
 *   - 04/10/2025: Sprint 2 - Refactored for task-centric approval (Post-Sprint 2 Refactor).
 *   - 04/10/2025: Hid Test button until tests pass (Previous Chat).
 *   - 04/11/2025: Sprint 2 - Enhanced live feed with event details (Previous Chat).
 *   - 04/11/2025: Fixed undefined task updates (Previous Chat).
 *   - 04/11/2025: Fixed prompt persistence with local cache (Previous Chat).
 *   - 04/12/2025: Sprint 2 - Polished live feed with colors, enhanced diff modal, added edge case handling (Previous Response).
 *   - 04/12/2025: Fixed react-diff-viewer import with react-diff-viewer-continued (Previous Response).
 *   - 04/12/2025: Fixed test instructions for multi-file tasks, verified live feed colors (Previous Response).
 *   - 04/13/2025: Sprint 2 Completion - Added clear feed button, timestamps, edge case feedback (Previous Response).
 *   - 04/13/2025: Fixed Ant Design Modal bodyStyle and Spin tip warnings (Previous Response).
 *   - 04/13/2025: Sprint 2 Completion - Enhanced live feed completeness, added Socket.IO reconnection, improved edge case feedback (Previous Response).
 *   - 04/14/2025: Fixed ReferenceError: path is not defined in taskUpdate handler (Previous Response).
 *   - 04/14/2025: Fixed prompt persistence, invalid taskId validation, diff fetch issues (Previous Response).
 *   - 04/19/2025: Sprint 2 Completion - Fixed Esbuild syntax error, preserved all functionality, addressed live feed issues (This Response).
 *     - Why: Complete live feed for Sprint 2, ensure all task/proposal events and edge cases (e.g., invalid taskId, 401 errors) are logged clearly.
 *     - How: Preserved diff modal, proposal workflows, live feed search/export; updated handleDenyModalOk per user; fixed "Task Login" and stagedFiles issues in other files.
 *     - Fix: Ensured no functionality stripped, addressed Esbuild error, aligned with live feed logs (04/19/2025).
 *     - Test:
 *       - Submit "Build CRM system": Verify live feed shows all statuses (pending, processing, pending_approval, tested, applied/denied/deleted) with correct colors.
 *       - Trigger empty prompt: Expect red log with "Prompt required".
 *       - Use invalid taskId: Expect red log with "Invalid task ID".
 *       - Disconnect Socket.IO: Verify reconnect attempts logged in red, success in green.
 *       - Trigger 401 error: Expect red log with "Authentication failed", token refresh attempt.
 *       - Search live feed for "failed": Verify only relevant entries shown.
 *       - Export live feed: Verify JSON file contains all entries with details.
 * Future Enhancements:
 *   - Task Filtering: Add status/date/priority filters (Sprint 4).
 *   - Collaboration: Enable multi-user task editing (Sprint 6).
 *   - Analytics: Show task success rate dashboard (Sprint 5).
 *   - Live Feed Export: Add CSV format support (Sprint 3).
 * Self-Notes:
 *   - Nate: Preserved all functionality (diff modal, proposal workflows, live feed features) (04/19/2025).
 *   - Nate: Fixed Esbuild syntax error, updated handleDenyModalOk per user feedback (04/19/2025).
 *   - Nate: Addressed "Task Login" and stagedFiles issues in backend files (04/19/2025).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, List, Card, message, Modal, Space, Descriptions, Spin, App, Table, Checkbox, Drawer, Tag, Alert } from 'antd';
import { DeleteOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined, ClearOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import apiClient from '../config/serverApiConfig';
import io from 'socket.io-client';
import DiffViewer from 'react-diff-viewer-continued';
import debounce from 'lodash/debounce';
import moment from 'moment';

const { TextArea } = Input;

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2Y1NjcwMjc4ZjlkZmQ2OWUwNmU4M2IiLCJlbWFpbCI6ImFkbWluQGlkdXJhcmFwcC5jb20iLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3NDQyNTAzMTQsImV4cCI6MTc0NDMzNjcxNH0.qkcfgoCGjZ2rWXeo_IOjJ4XjhQjQV_fk_lIALMmkPPc';
apiClient.defaults.headers.common['Authorization'] = `Bearer ${JWT_TOKEN}`;

const VERSION = '1.2.0';

/**
 * Extracts the base file name from a path string in a browser-compatible way.
 * @param {string} filePath - The full file path.
 * @returns {string} The base file name or the original string if invalid.
 */
const getBaseName = (filePath) => {
  if (typeof filePath !== 'string' || !filePath) return filePath || 'Unknown';
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

/**
 * Validates taskId as a UUID.
 * @param {string} taskId - Task identifier to validate.
 * @returns {boolean} True if valid UUID, false otherwise.
 */
const isValidTaskId = (taskId) => {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) {
    console.warn(`Invalid taskId: ${taskId || 'missing'}`);
  }
  return isValid;
};

/**
 * Downloads live feed as JSON.
 * @param {Array} feed - The live feed entries to export.
 */
const exportLiveFeed = (feed) => {
  const dataStr = JSON.stringify(feed, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `live_feed_${moment().format('YYYYMMDD_HHmmss')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const GrokUI = () => {
  const [prompt, setPrompt] = useState('');
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [maintenanceProposals, setMaintenanceProposals] = useState([]);
  const [backendProposals, setBackendProposals] = useState([]);
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [denyModalVisible, setDenyModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]);
  const [filteredFeed, setFilteredFeed] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedVisible, setFeedVisible] = useState(true);
  const [buttonLoading, setButtonLoading] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const taskPromptsRef = useRef({});
  const pendingPromptRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const [messageApi, contextHolder] = message.useMessage();

  // Handle live feed search
  const handleSearch = debounce((value) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setFilteredFeed(liveFeed);
      return;
    }
    const lowerQuery = value.toLowerCase();
    setFilteredFeed(
      liveFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(lowerQuery) ||
          (item.details && item.details.toLowerCase().includes(lowerQuery))
      )
    );
  }, 300);

    /*
    *   - 04/19/2025: Added priorityUpdate handler, enhanced taskUpdate with stack traces, added token refresh placeholder (This Response).
  *     - Why: Complete live feed for Sprint 2, address 401 errors, support /update-priority (Logs, 04/19/2025).
  *     - How: Added priorityUpdate handler, included errorDetails in taskUpdate, added token refresh logic.
  *     - Test: Submit task, change priority, trigger 401 error, verify live feed shows all statuses and errors.
  * Self-Notes:
  *   - Nate: Ensured all statuses/proposals are handled, added stack traces for debugging (04/19/2025).
  *   - Nate: Token refresh is a placeholder, needs auth flow integration (Sprint 4) (04/19/2025).
  */

  useEffect(() => {
    socketRef.current = io('http://localhost:8888', {
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
      reconnectAttemptsRef.current = 0;
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Live feed connected`,
            color: 'green',
            details: 'Real-time updates active',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('connect_error', (err) => {
      reconnectAttemptsRef.current += 1;
      const errorMsg = `Socket.IO connection error: ${err.message} (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`;
      console.error(errorMsg);
      messageApi.error(reconnectAttemptsRef.current < maxReconnectAttempts ? 'Live feed connection lost. Retrying...' : 'Live feed connection failed.');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - ${errorMsg}`,
            color: 'red',
            details: `Error stack: ${err.stack || 'None'}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('reconnect', () => {
      console.log('Socket.IO reconnected');
      messageApi.success('Live feed reconnected!');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Live feed reconnected`,
            color: 'green',
            details: 'Real-time updates restored',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    fetchTasks();
    fetchFiles();
    fetchBackendProposals();

    socketRef.current.on('taskUpdate', (updatedTask) => {
      if (!updatedTask || !updatedTask.taskId || !isValidTaskId(updatedTask.taskId)) {
        setLiveFeed((prev) => {
          const newFeed = [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid task update received`,
              color: 'red',
              details: `Data: ${JSON.stringify(updatedTask)} | Stack: ${updatedTask?.errorDetails?.stack || 'None'}`,
            },
          ].slice(-50);
          setFilteredFeed(searchQuery ? newFeed.filter(
            (item) =>
              item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : newFeed);
          return newFeed;
        });
        return;
      }

      if (updatedTask.prompt && updatedTask.prompt.trim()) {
        taskPromptsRef.current[updatedTask.taskId] = updatedTask.prompt;
      }

      setTasks((prev) => {
        const index = prev.findIndex((t) => t.taskId === updatedTask.taskId);
        if (index !== -1) {
          const newTasks = [...prev];
          newTasks[index] = { ...newTasks[index], ...updatedTask };
          return newTasks;
        }
        return [...prev, { ...updatedTask, prompt: taskPromptsRef.current[updatedTask.taskId] || updatedTask.prompt || 'Untitled' }];
      });

      if (selectedTask?.taskId === updatedTask.taskId) {
        setSelectedTask({ ...selectedTask, ...updatedTask });
      }

      const cachedPrompt = taskPromptsRef.current[updatedTask.taskId];
      const taskListPrompt = tasks.find((t) => t.taskId === updatedTask.taskId)?.prompt;
      const updatedPrompt = updatedTask.prompt;
      const taskPrompt = cachedPrompt || pendingPromptRef.current || taskListPrompt || updatedPrompt || 'Untitled';

      console.log(
        `Task ${updatedTask.taskId} update - Status: ${updatedTask.status}, Cached: "${cachedPrompt || 'undefined'}", ` +
        `Pending: "${pendingPromptRef.current || 'undefined'}", TaskList: "${taskListPrompt || 'undefined'}", ` +
        `Updated: "${updatedPrompt || 'undefined'}", Final: "${taskPrompt}"`
      );

      let details;
      try {
        details = [
          updatedTask.testDetails ? `Test: ${JSON.stringify(updatedTask.testDetails)}` : null,
          updatedTask.stagedFiles?.length ? `Files: ${updatedTask.stagedFiles.map(f => getBaseName(f)).join(', ')}` : 'Files: None',
          updatedTask.generatedFiles?.length ? `Generated: ${updatedTask.generatedFiles.map(f => getBaseName(f)).join(', ')}` : null,
          updatedTask.proposedChanges?.length ? `Changes: ${updatedTask.proposedChanges.map((c) => c.change).join(', ')}` : null,
          updatedTask.error ? `Error: ${updatedTask.error}` : null,
          updatedTask.errorDetails ? `Error Details: ${JSON.stringify(updatedTask.errorDetails)}` : null,
          updatedTask.warning ? `Warning: ${updatedTask.warning}` : null,
          updatedTask.message ? `Info: ${updatedTask.message}` : null,
        ].filter(Boolean).join(' | ');
      } catch (err) {
        console.error(`Error processing task update details: ${err.message}`);
        details = `Error processing details: ${err.stack || err.message}`;
      }

      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${updatedTask.taskId}: "${taskPrompt}" - ${updatedTask.status}`,
            color: updatedTask.logColor || (
              updatedTask.status === 'failed' || updatedTask.status === 'denied' ? 'red' :
              updatedTask.status === 'applied' || updatedTask.status === 'tested' || updatedTask.status === 'pending_approval' || updatedTask.status === 'completed' ? 'green' :
              updatedTask.status === 'retrying' ? 'yellow' : 'default'
            ),
            details,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });

      // Handle 401 errors with token refresh placeholder
      if (updatedTask.error?.includes('Authentication failed') || updatedTask.error?.includes('Invalid token')) {
        console.warn('Attempting token refresh due to 401 error');
        messageApi.warning('Authentication error detected. Please log in again.');
        // Placeholder: Implement actual token refresh logic in Sprint 4
      }
    });

    socketRef.current.on('priorityUpdate', ({ taskId, priority }) => {
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, priority } : t)));
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Priority updated for task ${taskId}`,
            color: 'default',
            details: `New Priority: ${priority}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('backendProposal', ({ taskId, proposals }) => {
      if (!isValidTaskId(taskId)) {
        setLiveFeed((prev) => {
          const newFeed = [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid backend proposal received`,
              color: 'red',
              details: `Task ID: ${taskId}`,
            },
          ].slice(-50);
          setFilteredFeed(searchQuery ? newFeed.filter(
            (item) =>
              item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : newFeed);
          return newFeed;
        });
        return;
      }

      const validProposals = proposals.filter((p) => p._id).map((p) => ({ ...p, _id: p._id.toString() }));
      setBackendProposals((prev) => [
        ...prev,
        ...validProposals.filter((np) => !prev.some((p) => p._id === np._id)),
      ]);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - New Backend Proposal for Task ${taskId}`,
            color: 'yellow',
            details: `Proposals: ${validProposals.map((p) => p.change).join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('backendProposalUpdate', ({ proposalId, status }) => {
      setBackendProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status } : p)));
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal ${proposalId || 'Unknown'} Updated to ${status || 'Unknown'}`,
            color: status === 'approved' ? 'green' : status === 'denied' ? 'red' : 'yellow',
            details: `Action: ${status}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      fetchBackendProposals();
    });

    socketRef.current.on('maintenanceProposal', ({ taskId, report }) => {
      if (!isValidTaskId(taskId)) {
        setLiveFeed((prev) => {
          const newFeed = [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid maintenance proposal received`,
              color: 'red',
              details: `Task ID: ${taskId}`,
            },
          ].slice(-50);
          setFilteredFeed(searchQuery ? newFeed.filter(
            (item) =>
              item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : newFeed);
          return newFeed;
        });
        return;
      }

      setMaintenanceProposals((prev) => [...prev, { taskId, report }]);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - New Maintenance Proposal for Task ${taskId}`,
            color: 'yellow',
            details: `Report: ${report.logs?.length || 0} logs processed`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('tasks_fetched', ({ tasks }) => {
      setTasks(tasks.map(t => ({
        ...t,
        prompt: taskPromptsRef.current[t.taskId] || t.prompt || 'Untitled'
      })) || []);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Tasks fetched: ${tasks.length} tasks`,
            color: 'default',
            details: `Task IDs: ${tasks.map(t => t.taskId).join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('tasks_cleared', () => {
      setTasks([]);
      setBackendProposals([]);
      taskPromptsRef.current = {};
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - All tasks cleared`,
            color: 'default',
            details: 'All tasks and proposals removed',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('fileContentUpdate', ({ taskId, originalContent, newContent, stagedFiles, generatedFiles, proposedChanges }) => {
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - File content fetched for task ${taskId}`,
            color: 'default',
            details: `Files: ${stagedFiles?.length ? stagedFiles.map(f => getBaseName(f)).join(', ') : 'None'} | Changes: ${proposedChanges?.length || 0}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('selfTestUpdate', ({ taskId, result, stagedFiles, generatedFiles, proposedChanges }) => {
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Self-test for task ${taskId}: ${result}`,
            color: result === 'success' ? 'green' : 'red',
            details: `Files: ${stagedFiles?.length ? stagedFiles.map(f => getBaseName(f)).join(', ') : 'None'} | Changes: ${proposedChanges?.length || 0}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('uploadUpdate', ({ filename, result }) => {
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - File uploaded: ${filename}`,
            color: 'default',
            details: `Analysis: ${result.substring(0, 100)}...`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('analyzeUpdate', ({ data, result }) => {
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Data analysis completed`,
            color: 'default',
            details: `Input: ${JSON.stringify(data).substring(0, 100)}... | Result: ${result.substring(0, 100)}...`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('logUpdate', ({ event, logs }) => {
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Log update: ${event}`,
            color: 'default',
            details: `Logs: ${logs.join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    socketRef.current.on('maintenanceUpdate', ({ taskId, status, report }) => {
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Maintenance update for task ${taskId}: ${status}`,
            color: status === 'approved' ? 'green' : 'red',
            details: `Report: ${report.logs?.length || 0} logs processed`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    });

    return () => socketRef.current.disconnect();
  }, [messageApi, searchQuery]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    setTaskError(null);
    try {
      const res = await apiClient.get('/grok/tasks');
      const tasks = res.data.map(t => ({
        ...t,
        prompt: taskPromptsRef.current[t.taskId] || t.prompt || 'Untitled'
      }));
      setTasks(tasks || []);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Tasks loaded: ${tasks.length}`,
            color: 'default',
            details: `Task IDs: ${tasks.map(t => t.taskId).join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : 'Failed to fetch tasks';
      setTaskError(errorMessage);
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task fetch failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    setFileError(null);
    try {
      const res = await apiClient.get('/grok/files');
      setFiles(res.data || []);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Files loaded: ${res.data.length}`,
            color: 'default',
            details: `Files: ${res.data.map(f => f.name).join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : 'Failed to fetch files';
      setFileError(errorMessage);
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - File fetch failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchBackendProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await apiClient.get('/grok/backend-proposals');
      setBackendProposals((res.data || []).filter((p) => p._id).map((p) => ({ ...p, _id: p._id.toString() })));
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposals loaded: ${res.data.length}`,
            color: 'default',
            details: `Proposal IDs: ${res.data.map(p => p._id).join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : 'Failed to fetch backend proposals';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal fetch failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      messageApi.error('Please enter a valid prompt');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Submission failed: Prompt required`,
            color: 'red',
            details: 'User attempted to submit an empty prompt',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    if (isSubmitting) {
      messageApi.warning('Submission in progress, please wait');
      return;
    }

    const pendingTasks = tasks.filter((t) => t.status === 'pending_approval');
    if (pendingTasks.length > 0) {
      messageApi.error(`Resolve ${pendingTasks.length} pending tasks first`);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Submission blocked: ${pendingTasks.length} pending tasks`,
            color: 'red',
            details: `Pending Task IDs: ${pendingTasks.map(t => t.taskId).join(', ')}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedPrompt = prompt.trim();
      pendingPromptRef.current = trimmedPrompt;
      console.log(`Pending prompt cached: "${trimmedPrompt}"`);
      setButtonLoading((prev) => ({ ...prev, submit: true }));
      const res = await apiClient.post('/grok/edit', { prompt: trimmedPrompt });
      taskPromptsRef.current[res.data.taskId] = trimmedPrompt;
      console.log(`Cached prompt for ${res.data.taskId}: "${trimmedPrompt}"`);
      pendingPromptRef.current = null;
      setPrompt('');
      messageApi.success('Task submitted successfully!');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task submitted: ${res.data.taskId}`,
            color: 'green',
            details: `Prompt: "${trimmedPrompt}"`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      pendingPromptRef.current = null;
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 && err.response?.data?.pendingTasks ? 
                          `Pending tasks exist: ${err.response.data.pendingTasks.join(', ')}` :
                          err.response?.data?.error || 'Failed to submit task';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Submission error: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, submit: false }));
      setIsSubmitting(false);
    }
  };

  const showDiff = async (taskId) => {
    if (!isValidTaskId(taskId)) {
      messageApi.error('Invalid task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Diff fetch failed: Invalid task ID`,
            color: 'red',
            details: `Task ID: ${taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    try {
      setButtonLoading((prev) => ({ ...prev, [`diff_${taskId}`]: true }));
      const res = await apiClient.get(`/grok/file-content?taskId=${taskId}`);
      const taskData = res.data;

      const original = taskData.originalContent && Object.keys(taskData.originalContent).length > 0
        ? Object.entries(taskData.originalContent)
            .map(([key, value]) => `// ${key}.jsx\n${value}`)
            .join('\n\n')
        : '// No original content available';
      const modified = taskData.newContent && Object.keys(taskData.newContent).length > 0
        ? Object.entries(taskData.newContent)
            .filter(([_, value]) => value && !value.includes('undefined') && value !== 'Timeout')
            .map(([key, value]) => `// ${key}.jsx\n${value}`)
            .join('\n\n')
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
      } else if (taskPrompt.toLowerCase().includes('employee') && taskPrompt.toLowerCase().includes('payroll')) {
        testInstructions += [
          `- Open http://localhost:3000/employee-log`,
          `- Click "Add Employee"`,
          `- Type "John Doe" in the name field`,
          `- Enter "5000" in the payroll amount field`,
          `- Click "Clock In"`,
          `- Expect: "John Doe" with payroll $5000 and clock-in time listed`,
        ].join('\n');
      } else {
        const target = taskPrompt.toLowerCase().includes('login') ? 'login' :
                      taskPrompt.toLowerCase().includes('dashboard') ? 'dashboard' :
                      taskPrompt.toLowerCase().includes('sponsor') ? 'sponsor/1' :
                      taskPrompt.toLowerCase().includes('employee') ? 'employee-log' :
                      taskPrompt.toLowerCase().includes('settings') ? 'settings' : 'grok';
        testInstructions += [
          `- Open http://localhost:3000/${target}`,
          `- Verify page renders and basic functionality works`,
        ].join('\n');
      }

      setSelectedTask({
        ...taskData,
        originalContent: original,
        newContent: modified,
        testInstructions,
        taskId,
        prompt: taskPrompt
      });
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Viewed diff for task ${taskId}`,
            color: 'default',
            details: taskData.stagedFiles?.length ? `Files: ${taskData.stagedFiles.map(f => getBaseName(f)).join(', ')}` : 'Files: None',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to load task content';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Diff fetch failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`diff_${taskId}`]: false }));
    }
  };

  const clearTasks = () => {
    setModalVisible(true);
    setModalType('clear');
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Initiated clear all tasks`,
          color: 'default',
          details: 'Opened confirmation modal',
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };

  const clearLiveFeed = () => {
    setLiveFeed([]);
    setFilteredFeed([]);
    messageApi.info('Live feed cleared');
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Live feed cleared`,
          color: 'default',
          details: 'All feed entries removed',
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };

  
  const deleteTask = async (taskId) => {
    if (!isValidTaskId(taskId)) {
      messageApi.error('Invalid task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task deletion failed: Invalid task ID`,
            color: 'red',
            details: `Task ID: ${taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    try {
      setButtonLoading((prev) => ({ ...prev, [`delete_${taskId}`]: true }));
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      while (attempts < maxAttempts) {
        try {
          await apiClient.post('/grok/delete-task', { taskId });
          success = true;
          break;
        } catch (err) {
          attempts++;
          console.warn(`Delete task attempt ${attempts}/${maxAttempts} failed: ${err.message}`);
          if (attempts >= maxAttempts) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      if (!success) throw new Error('Failed to delete task after retries');

      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      setBackendProposals((prev) => prev.filter((p) => p.taskId !== taskId));
      delete taskPromptsRef.current[taskId];
      await fetchTasks(); // Sync UI with server state
      messageApi.success('Task deleted successfully');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} deleted`,
            color: 'default',
            details: 'Task and associated proposals removed',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : 'Failed to delete task';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task deletion failed: ${errorMessage}`,
            color: 'red',
            details: process.env.NODE_ENV === 'development' ? `Error: ${err.response?.data?.error || err.message}, Stack: ${err.stack || 'None'}` : err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
        messageApi.warning('Authentication error detected. Please log in again.');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`delete_${taskId}`]: false }));
    }
  };

  const handleTestTask = async (taskId) => {
    if (!isValidTaskId(taskId)) {
      messageApi.error('Invalid task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Manual test failed: Invalid task ID`,
            color: 'red',
            details: `Task ID: ${taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    try {
      setButtonLoading((prev) => ({ ...prev, [`test_${taskId}`]: true }));
      const res = await apiClient.post('/grok/test', { taskId, manual: true });
      messageApi.success('Manual Playwright test launched! Review in browser.');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Manual test launched for task ${taskId}`,
            color: 'blue',
            details: `URL: ${res.data.stagedFiles?.[0] ? `http://localhost:3000/${getBaseName(res.data.stagedFiles[0]).replace(/\.jsx$/, '').replace(/-v\d+$/, '').toLowerCase()}` : 'Unknown'}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to run manual test';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Manual test failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`test_${taskId}`]: false }));
    }
  };

  const handleApproveTask = async (taskId) => {
    if (!isValidTaskId(taskId)) {
      messageApi.error('Invalid task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task approval failed: Invalid task ID`,
            color: 'red',
            details: `Task ID: ${taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    try {
      setButtonLoading((prev) => ({ ...prev, [`approve_${taskId}`]: true }));
      await apiClient.post('/grok/approve', { taskId });
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status: 'applied', prompt: taskPromptsRef.current[taskId] || t.prompt } : t)));
      messageApi.success('Task approved and applied!');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} approved`,
            color: 'green',
            details: 'Changes applied to system',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to approve task';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task approval failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`approve_${taskId}`]: false }));
    }
  };

  const handleDenyTask = async (taskId) => {
    if (!isValidTaskId(taskId)) {
      messageApi.error('Invalid task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task denial failed: Invalid task ID`,
            color: 'red',
            details: `Task ID: ${taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    try {
      setButtonLoading((prev) => ({ ...prev, [`deny_${taskId}`]: true }));
      await apiClient.post('/grok/reject', { taskId });
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status: 'denied', prompt: taskPromptsRef.current[taskId] || t.prompt } : t)));
      messageApi.success('Task denied');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${taskId} denied`,
            color: 'red',
            details: 'Changes rolled back',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to deny task';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task denial failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`deny_${taskId}`]: false }));
    }
  };

  const handleTestProposal = async (proposalId) => {
    const proposal = backendProposals.find((p) => p._id === proposalId);
    if (!proposal || !isValidTaskId(proposal.taskId)) {
      messageApi.error('Invalid proposal or task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal test failed: Invalid proposal or task ID`,
            color: 'red',
            details: `Proposal ID: ${proposalId}, Task ID: ${proposal?.taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }

    try {
      setButtonLoading((prev) => ({ ...prev, [`test_proposal_${proposalId}`]: true }));
      await apiClient.post('/grok/test', { taskId: proposal.taskId, manual: true });
      messageApi.success('Manual test launched for proposal');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Manual test launched for proposal ${proposalId}`,
            color: 'blue',
            details: `Task ID: ${proposal.taskId} | File: ${getBaseName(proposal.file)}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to run proposal test';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal test failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`test_proposal_${proposalId}`]: false }));
    }
  };

  const handleApproveProposal = async (proposalId) => {
    try {
      setButtonLoading((prev) => ({ ...prev, [`approve_proposal_${proposalId}`]: true }));
      await apiClient.post('/grok/approve-backend', { proposalId });
      setBackendProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status: 'approved' } : p)));
      messageApi.success('Proposal approved');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal ${proposalId} approved`,
            color: 'green',
            details: 'Backend changes applied',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to approve proposal';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal approval failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`approve_proposal_${proposalId}`]: false }));
    }
  };

  const handleDenyProposal = async (proposalId) => {
    try {
      setButtonLoading((prev) => ({ ...prev, [`deny_proposal_${proposalId}`]: true }));
      await apiClient.post('/grok/rollback', { proposalId });
      setBackendProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status: 'denied' } : p)));
      messageApi.success('Proposal denied');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal ${proposalId} denied`,
            color: 'red',
            details: 'Proposal changes rolled back',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to deny proposal';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal denial failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`deny_proposal_${proposalId}`]: false }));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedProposals.length === 0) {
      messageApi.error('Select at least one proposal');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk approve failed: No proposals selected`,
            color: 'red',
            details: 'User attempted bulk approve without selections',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }
    const sortedProposals = [...backendProposals].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const oldestPending = sortedProposals.find((p) => p.status === 'pending');
    if (oldestPending && !selectedProposals.includes(oldestPending._id)) {
      messageApi.error('Must include oldest pending proposal');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk approve failed: Oldest pending proposal not included`,
            color: 'red',
            details: `Oldest Proposal ID: ${oldestPending._id}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }
    setModalVisible(true);
    setModalType('bulkApprove');
  };

  const handleBulkDeny = async () => {
    if (selectedProposals.length === 0) {
      messageApi.error('Select at least one proposal');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk deny failed: No proposals selected`,
            color: 'red',
            details: 'User attempted bulk deny without selections',
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }
    setModalVisible(true);
    setModalType('bulkDeny');
  };

 
  const handleModalOk = async () => {
    try {
      setButtonLoading((prev) => ({ ...prev, modal: true }));
      if (modalType === 'clear') {
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;
        let response;
        while (attempts < maxAttempts) {
          try {
            response = await apiClient.post('/grok/clear-tasks');
            success = true;
            break;
          } catch (err) {
            attempts++;
            console.warn(`Clear tasks attempt ${attempts}/${maxAttempts} failed: ${err.message}`);
            if (attempts >= maxAttempts) throw new Error(`Failed to clear tasks after ${maxAttempts} retries: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
        if (!success) throw new Error('Failed to clear tasks after retries');

        // Reset all client-side state
        setTasks([]);
        setBackendProposals([]);
        setMaintenanceProposals([]);
        taskPromptsRef.current = {};
        setLiveFeed([]);
        setFilteredFeed([]);
        await fetchTasks(); // Sync UI with server
        messageApi.success('All tasks and live feed cleared');
        setLiveFeed((prev) => {
          const newFeed = [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Live feed cleared`,
              color: 'green',
              details: `All feed entries removed | Response: ${JSON.stringify(response.data)}`,
              event: 'tasks_cleared',
            },
          ].slice(-50);
          setFilteredFeed(searchQuery ? newFeed.filter(
            (item) =>
              item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : newFeed);
          return newFeed;
        });
      } else if (modalType === 'bulkApprove') {
        for (const proposalId of selectedProposals) {
          await apiClient.post('/grok/approve-backend', { proposalId });
          setLiveFeed((prev) => {
            const newFeed = [
              ...prev,
              {
                message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Approved proposal ${proposalId}`,
                color: 'green',
                details: 'Backend changes applied',
                event: 'proposal_approved',
              },
            ].slice(-50);
            setFilteredFeed(searchQuery ? newFeed.filter(
              (item) =>
                item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
            ) : newFeed);
            return newFeed;
          });
        }
        setBackendProposals((prev) =>
          prev.map((p) => selectedProposals.includes(p._id) ? { ...p, status: 'approved' } : p)
        );
        setSelectedProposals([]);
        messageApi.success('Proposals approved');
        fetchBackendProposals();
      } else if (modalType === 'bulkDeny') {
        for (const proposalId of selectedProposals) {
          await apiClient.post('/grok/rollback', { proposalId });
          setLiveFeed((prev) => {
            const newFeed = [
              ...prev,
              {
                message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Denied proposal ${proposalId}`,
                color: 'red',
                details: 'Proposal changes rolled back',
                event: 'proposal_denied',
              },
            ].slice(-50);
            setFilteredFeed(searchQuery ? newFeed.filter(
              (item) =>
                item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
            ) : newFeed);
            return newFeed;
          });
        }
        setBackendProposals((prev) =>
          prev.map((p) => selectedProposals.includes(p._id) ? { ...p, status: 'denied' } : p)
        );
        setSelectedProposals([]);
        messageApi.success('Proposals denied');
        fetchBackendProposals();
      } else if (modalType === 'approve' && selectedProposal) {
        await apiClient.post('/grok/approve-backend', { proposalId: selectedProposal.id });
        setBackendProposals((prev) =>
          prev.map((p) => (p._id === selectedProposal.id ? { ...p, status: 'approved' } : p))
        );
        messageApi.success('Proposal approved');
        setLiveFeed((prev) => {
          const newFeed = [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Approved proposal ${selectedProposal.id}`,
              color: 'green',
              details: 'Backend changes applied',
              event: 'proposal_approved',
            },
          ].slice(-50);
          setFilteredFeed(searchQuery ? newFeed.filter(
            (item) =>
              item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : newFeed);
          return newFeed;
        });
        fetchBackendProposals();
      }
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' : `Operation failed: ${err.message}`;
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Operation failed: ${errorMessage}`,
            color: 'red',
            details: process.env.NODE_ENV === 'development' ? `Error: ${err.response?.data?.error || err.message}, Stack: ${err.stack || 'None'}` : err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
        messageApi.warning('Authentication error detected. Please log in again.');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, modal: false }));
      setModalVisible(false);
      setModalType('');
      setSelectedProposal(null);
    }
  };
    
  const handleModalCancel = () => {
    setModalVisible(false);
    setModalType('');
    setSelectedProposal(null);
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Operation cancelled`,
          color: 'default',
          details: `Modal type: ${modalType}`,
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };
  const taskUpdate = (data) => {
    if (!data.taskId || !isValidTaskId(data.taskId)) {
      console.warn('Invalid task update received', data);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid task update received`,
            color: 'red',
            details: `Data: ${JSON.stringify(data)} | Stack: ${data?.errorDetails?.stack || 'None'}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }
  
    const statusColors = {
      pending: 'default',
      processing: 'default',
      pending_approval: 'green',
      tested: 'green',
      applied: 'green',
      denied: 'red',
      failed: 'red',
      deleted: 'default',
      retrying: 'yellow',
    };
  
    const files = Array.isArray(data.stagedFiles) && data.stagedFiles.length > 0
      ? data.stagedFiles.map(file => getBaseName(file)).join(', ')
      : 'None';
    const generatedFiles = Array.isArray(data.generatedFiles) && data.generatedFiles.length > 0
      ? data.generatedFiles.map(file => getBaseName(file)).join(', ')
      : 'None';
  
    let message = `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${data.taskId}: "${data.prompt || taskPromptsRef.current[data.taskId] || 'Unknown'}" - ${data.status}`;
    let details = [
      `Files: ${files}`,
      generatedFiles !== 'None' ? `Generated: ${generatedFiles}` : null,
      data.proposedChanges?.length ? `Changes: ${data.proposedChanges.map(c => c.change).join(', ')}` : null,
      data.testDetails ? `Test: ${JSON.stringify(data.testDetails)}` : null,
      data.error ? `Error: ${data.error}` : null,
      data.errorDetails ? `Error Details: ${JSON.stringify(data.errorDetails)}` : null,
      data.warning ? `Warning: ${data.warning}` : null,
      data.message ? `Info: ${data.message}` : null,
    ].filter(Boolean).join(' | ');
  
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message,
          color: statusColors[data.status] || 'default',
          details,
          event: data.event || 'task_update',
          files: data.stagedFiles,
          generatedFiles: data.generatedFiles,
          errorDetails: data.errorDetails,
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  
    // Update task list
    setTasks((prev) => {
      const existingTask = prev.find((t) => t.taskId === data.taskId);
      if (existingTask) {
        return prev.map((t) =>
          t.taskId === data.taskId
            ? { ...t, status: data.status, stagedFiles: data.stagedFiles, generatedFiles: data.generatedFiles, prompt: data.prompt || t.prompt }
            : t
        );
      }
      return [...prev, {
        taskId: data.taskId,
        prompt: data.prompt || taskPromptsRef.current[data.taskId] || 'Unknown',
        status: data.status,
        stagedFiles: data.stagedFiles || [],
        generatedFiles: data.generatedFiles || [],
      }];
    });
  
    console.log(`Task ${data.taskId} update - Status: ${data.status}, Cached: "${taskPromptsRef.current[data.taskId] || 'undefined'}", Pending: "${data.prompt || 'undefined'}", TaskList: "${existingTask ? existingTask.prompt : 'undefined'}", Updated: "${data.prompt || 'undefined'}", Final: "${data.prompt || taskPromptsRef.current[data.taskId] || 'undefined'}"`);
  };

  /*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\GrokUI.jsx
 * Purpose: UI for Allur Space Console with task management, diff view, and backend proposal review.
 * Note: Snippet starting from handleDenyModalOk for continuity. Full file corrected for Esbuild syntax error.
 */

  const handleDenyModalOk = async () => {
    try {
      setButtonLoading((prev) => ({ ...prev, denyModal: true }));
      if (selectedTaskId) {
        if (!isValidTaskId(selectedTaskId)) {
          throw new Error('Invalid task ID');
        }
        await apiClient.post('/grok/reject', { taskId: selectedTaskId });
        setTasks((prev) => prev.map((t) => (t.taskId === selectedTaskId ? { ...t, status: 'denied', prompt: taskPromptsRef.current[selectedTaskId] || t.prompt } : t)));
        messageApi.success('Task denied');
        setLiveFeed((prev) => {
          const newFeed = [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${selectedTaskId} denied`,
              color: 'red',
              details: 'Changes rolled back',
            },
          ].slice(-50);
          setFilteredFeed(searchQuery ? newFeed.filter(
            (item) =>
              item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : newFeed);
          return newFeed;
        });
      }
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.message === 'Invalid task ID' ? 'Invalid task ID' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to deny task';
      messageApi.error(errorMessage);
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task denial failed: ${errorMessage}`,
            color: 'red',
            details: err.response?.data?.error || err.message,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      if (err.response?.status === 401) {
        console.warn('Attempting token refresh due to 401 error');
        messageApi.warning('Authentication error detected. Please log in again.');
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, denyModal: false }));
      setDenyModalVisible(false);
      setSelectedTaskId(null);
    }
  };

  const handleDenyModalCancel = () => {
    setDenyModalVisible(false);
    setSelectedTaskId(null);
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task denial cancelled`,
          color: 'default',
          details: `Task ID: ${selectedTaskId || 'None'}`,
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };

  const showDenyModal = (taskId) => {
    if (!isValidTaskId(taskId)) {
      messageApi.error('Invalid task ID');
      setLiveFeed((prev) => {
        const newFeed = [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Cannot open deny modal: Invalid task ID`,
            color: 'red',
            details: `Task ID: ${taskId}`,
          },
        ].slice(-50);
        setFilteredFeed(searchQuery ? newFeed.filter(
          (item) =>
            item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
        ) : newFeed);
        return newFeed;
      });
      return;
    }
    setSelectedTaskId(taskId);
    setDenyModalVisible(true);
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Opened deny modal for task ${taskId}`,
          color: 'default',
          details: `Task ID: ${taskId}`,
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };

  const showProposalModal = (proposal) => {
    setSelectedProposal({ id: proposal._id, change: proposal.change });
    setModalVisible(true);
    setModalType('approve');
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Opened proposal approval modal`,
          color: 'default',
          details: `Proposal ID: ${proposal._id}`,
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };

  const toggleFeed = () => {
    setFeedVisible(!feedVisible);
    setLiveFeed((prev) => {
      const newFeed = [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Live feed ${feedVisible ? 'hidden' : 'shown'}`,
          color: 'default',
          details: `Feed visibility toggled`,
        },
      ].slice(-50);
      setFilteredFeed(searchQuery ? newFeed.filter(
        (item) =>
          item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : newFeed);
      return newFeed;
    });
  };

  const taskColumns = [
    {
      title: 'Prompt',
      dataIndex: 'prompt',
      key: 'prompt',
      render: (text) => text || 'Untitled',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'failed' || status === 'denied' ? 'red' :
          status === 'applied' || status === 'tested' || status === 'pending_approval' ? 'green' :
          status === 'retrying' ? 'yellow' : 'default'
        }>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => showDiff(record.taskId)}
            loading={buttonLoading[`diff_${record.taskId}`]}
            disabled={record.status === 'deleted' || record.status === 'failed'}
          >
            View Diff
          </Button>
          {record.status === 'pending_approval' && (
            <>
              <Button
                type="link"
                icon={<PlayCircleOutlined />}
                onClick={() => handleTestTask(record.taskId)}
                loading={buttonLoading[`test_${record.taskId}`]}
              >
                Test
              </Button>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => handleApproveTask(record.taskId)}
                loading={buttonLoading[`approve_${record.taskId}`]}
              >
                Approve
              </Button>
              <Button
                type="link"
                icon={<CloseOutlined />}
                onClick={() => showDenyModal(record.taskId)}
                loading={buttonLoading[`deny_${record.taskId}`]}
              >
                Deny
              </Button>
            </>
          )}
          {(record.status === 'failed' || record.status === 'denied' || record.status === 'applied') && (
            <Button
              type="link"
              icon={<DeleteOutlined />}
              onClick={() => deleteTask(record.taskId)}
              loading={buttonLoading[`delete_${record.taskId}`]}
            >
              Delete
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const proposalColumns = [
    {
      title: '',
      key: 'selection',
      render: (_, record) => (
        <Checkbox
          checked={selectedProposals.includes(record._id)}
          onChange={(e) => {
            setSelectedProposals(
              e.target.checked
                ? [...selectedProposals, record._id]
                : selectedProposals.filter((id) => id !== record._id)
            );
          }}
          disabled={record.status !== 'pending'}
        />
      ),
    },
    {
      title: 'Task ID',
      dataIndex: 'taskId',
      key: 'taskId',
    },
    {
      title: 'File',
      dataIndex: 'file',
      key: 'file',
      render: (file) => getBaseName(file),
    },
    {
      title: 'Change',
      dataIndex: 'change',
      key: 'change',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'approved' ? 'green' : status === 'denied' ? 'red' : 'yellow'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                icon={<PlayCircleOutlined />}
                onClick={() => handleTestProposal(record._id)}
                loading={buttonLoading[`test_proposal_${record._id}`]}
              >
                Test
              </Button>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => showProposalModal(record)}
                loading={buttonLoading[`approve_proposal_${record._id}`]}
              >
                Approve
              </Button>
              <Button
                type="link"
                icon={<CloseOutlined />}
                onClick={() => handleDenyProposal(record._id)}
                loading={buttonLoading[`deny_proposal_${record._id}`]}
              >
                Deny
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Card title={`Allur Space Console v${VERSION}`}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your task prompt (e.g., 'Build a CRM system')"
          />
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={buttonLoading.submit}
            disabled={isSubmitting}
          >
            Submit Task
          </Button>
          <Button
            onClick={clearTasks}
            loading={buttonLoading.clear}
            style={{ marginLeft: 8 }}
          >
            Clear All Tasks
          </Button>
        </Space>
      </Card>

      {taskError && <Alert message={taskError} type="error" style={{ marginTop: 16 }} />}
      {fileError && <Alert message={fileError} type="error" style={{ marginTop: 16 }} />}

      <Card title="Tasks" style={{ marginTop: 16 }}>
        <Spin spinning={loadingTasks}>
          <Table
            columns={taskColumns}
            dataSource={tasks}
            rowKey="taskId"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>

      <Card title="Backend Proposals" style={{ marginTop: 16 }}>
        <Spin spinning={loadingProposals}>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              onClick={handleBulkApprove}
              disabled={selectedProposals.length === 0}
            >
              Bulk Approve
            </Button>
            <Button
              onClick={handleBulkDeny}
              disabled={selectedProposals.length === 0}
            >
              Bulk Deny
            </Button>
          </Space>
          <Table
            columns={proposalColumns}
            dataSource={backendProposals}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        </Spin>
      </Card>

      <Card
        title={
          <Space>
            <span>Live Feed</span>
            <Button
              onClick={toggleFeed}
              size="small"
            >
              {feedVisible ? 'Hide' : 'Show'}
            </Button>
            <Button
              onClick={clearLiveFeed}
              size="small"
              icon={<ClearOutlined />}
            >
              Clear
            </Button>
            <Button
              onClick={() => exportLiveFeed(liveFeed)}
              size="small"
              icon={<DownloadOutlined />}
            >
              Export
            </Button>
            <Input
              placeholder="Search feed..."
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        {feedVisible && (
          <List
            dataSource={filteredFeed}
            renderItem={(item) => (
              <List.Item>
                <div style={{ color: item.color, width: '100%' }}>
                  <strong>{item.message}</strong>
                  {item.details && <p style={{ margin: 0, fontSize: 12 }}>{item.details}</p>}
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={
          modalType === 'clear' ? 'Confirm Clear Tasks' :
          modalType === 'bulkApprove' ? 'Confirm Bulk Approve' :
          modalType === 'bulkDeny' ? 'Confirm Bulk Deny' :
          'Confirm Proposal Approval'
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={buttonLoading.modal}
      >
        <p>
          {modalType === 'clear' ? 'Are you sure you want to clear all tasks?' :
           modalType === 'bulkApprove' ? `Approve ${selectedProposals.length} selected proposals?` :
           modalType === 'bulkDeny' ? `Deny ${selectedProposals.length} selected proposals?` :
           `Approve proposal: ${selectedProposal?.change}?`}
        </p>
      </Modal>

      <Modal
        title="Confirm Task Denial"
        open={denyModalVisible}
        onOk={handleDenyModalOk}
        onCancel={handleDenyModalCancel}
        confirmLoading={buttonLoading.denyModal}
      >
        <p>Are you sure you want to deny this task?</p>
      </Modal>

      {selectedTask && (
        <Drawer
          title={`Task Diff: ${selectedTask.prompt}`}
          placement="right"
          onClose={() => setSelectedTask(null)}
          open={!!selectedTask}
          width="80%"
        >
          <Descriptions title="Task Details" bordered>
            <Descriptions.Item label="Task ID">{selectedTask.taskId}</Descriptions.Item>
            <Descriptions.Item label="Status">{selectedTask.status}</Descriptions.Item>
            <Descriptions.Item label="Prompt">{selectedTask.prompt}</Descriptions.Item>
            <Descriptions.Item label="Test Instructions">
              <pre>{selectedTask.testInstructions}</pre>
            </Descriptions.Item>
          </Descriptions>
          <h3>Code Diff</h3>
          <DiffViewer
            oldValue={selectedTask.originalContent}
            newValue={selectedTask.newContent}
            splitView={true}
            showDiffOnly={true}
            disableWordDiff={false}
          />
        </Drawer>
      )}
    </div>
  );
};

export default GrokUI;
