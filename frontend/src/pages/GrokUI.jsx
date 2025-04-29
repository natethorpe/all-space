/*
 * File Path: frontend/src/pages/GrokUI.jsx
 * Purpose: Main UI for Allur Space Console, orchestrating task management, proposal review, and live feed.
 * How It Works:
 *   - Renders TaskInput, TaskList, ProposalList, TaskModals, ErrorAlerts, LiveFeed, and FeedbackButton in a responsive Ant Design layout.
 *   - Integrates useTasks, useProposals, useLiveFeed hooks for state and actions.
 *   - Displays loading state with Spin during token fetching and hook initialization.
 * Mechanics:
 *   - Uses ErrorBoundary to catch runtime errors, with fallback UI for hook failures.
 *   - Merges live feeds from useProposals and useLiveFeed for unified real-time updates.
 *   - Fetches token from localStorage.auth in useEffect, ensuring stable render path.
 *   - Renders GrokUIContent only when token is valid to prevent race conditions and network-related errors.
 * Dependencies:
 *   - antd: Card, Spin, Space, Layout, Alert, Button, Collapse for UI components (version 5.24.6).
 *   - react: Core library for rendering (version 18.3.1).
 *   - react-router-dom: useNavigate for redirects.
 *   - axios: HTTP requests for API call tracking (version 1.7.7).
 *   - useTasks.js, useProposals.js, useLiveFeed.js: Hooks for state and actions.
 *   - TaskInput.jsx, TaskList.jsx, ProposalList.jsx, TaskModals.jsx, ErrorAlerts.jsx, LiveFeed.jsx, FeedbackButton.jsx: UI components.
 * Dependents:
 *   - ErpApp.jsx: Renders GrokUI via AppRouter at /grok.
 *   - IdurarOs.jsx: Routes to GrokUI when authenticated.
 * Why It’s Here:
 *   - Central UI for task and proposal management, supporting Sprint 2 usability and testing (04/07/2025).
 *   - Modularized from AllurSpaceConsole.jsx to ~150 lines, enhancing maintainability (04/21/2025).
 * Change Log:
 *   - 04/21/2025: Modularized from AllurSpaceConsole.jsx, added ErrorBoundary, null checks, debug logs.
 *   - 04/23/2025: Fixed runtime error at /grok.
 *   - 04/23/2025: Added React import to fix potential 'React is not defined' error.
 *   - 04/24/2025: Fixed too many re-renders error.
 *   - 04/24/2025: Fixed Invalid hook call error and Spin warning.
 *   - 04/24/2025: Passed messageApi and token to hooks, added debug logs, enhanced rendering.
 *   - 04/24/2025: Added token validation delay, loading states for WebSocket failures.
 *   - 04/24/2025: Enhanced token retry, added data loading states, improved WebSocket error handling.
 *   - 04/25/2025: Fixed "Rendered more hooks than during the previous render" error.
 *     - Why: Conditional hook calls based on token caused inconsistent hook counts (User, 04/25/2025).
 *     - How: Moved useTasks, useProposals, useLiveFeed outside conditional logic, added invalid token handling, improved WebSocket status display.
 *   - 04/25/2025: Fixed "setSocketError is not a function" error.
 *     - Why: setSocketError not passed correctly due to race condition in token fetching (User, 04/25/2025).
 *     - How: Introduced GrokUIContent component to render hooks only after token resolution, simplified token fetching.
 *   - 04/25/2025: Fixed "Too many re-renders" error.
 *     - Why: setIsLoading(false) in render path caused infinite re-rendering loop (User, 04/25/2025).
 *     - How: Moved token fetching to useEffect, ensured state updates occur outside render, simplified render logic.
 *   - 04/25/2025: Fixed network errors and persistent "setSocketError is not a function".
 *     - Why: Network errors (ERR_CONNECTION_REFUSED) prevented token validation, causing hooks to initialize with invalid parameters (User, 04/25/2025).
 *     - How: Added network error handling in GrokUI.jsx, skipped hook initialization during network failures, enhanced logging for network issues.
 *   - 04/25/2025: Added Quick Feedback button for real-time user feedback.
 *     - Why: Enhance collaboration efficiency for Sprint 3, fix Vite import error (User, 04/25/2025).
 *     - How: Created FeedbackButton.jsx, integrated WebSocket 'feedback' event, logged feedback to idurar_db.logs, updated import path.
 *   - 04/25/2025: Added ErrorBoundary to handle hook errors.
 *     - Why: TypeError in useTaskDiff crashed app without recovery (User, 04/25/2025).
 *     - How: Wrapped GrokUIContent in ErrorBoundary component, added fallback UI, logged errors to console.
 *   - 04/25/2025: Fixed missing token in useProposals.
 *     - Why: Hooks initialized with missing token, causing WebSocket connection failures (User, 04/25/2025).
 *     - How: Added guard to skip GrokUIContent rendering until token is set, enhanced token fetching with delay.
 *   - 04/26/2025: Enhanced stagedFiles validation and debug logging for Playwright button fix.
 *     - Why: Playwright button fails due to stale or undefined stagedFiles passed to TaskList.jsx (User, 04/26/2025).
 *     - How: Added debug logs for taskHook.tasks, strengthened hasValidStagedFiles check with logging, validated tasks before rendering TaskList.
 *   - 05/XX/2025: Fixed API call loop and excessive logging.
 *     - Why: Prevent excessive sponsor summary fetches and coreApi catch-all logs (User, 05/XX/2025).
 *     - How: Added stricter debouncing to sponsor summary fetching, stabilized hook dependencies with useMemo, enhanced network error handling.
 *   - 05/XX/2025: Fixed liveFeed warning and invalid stagedFiles.
 *     - Why: Address "Functions are not valid as a React child" warning and invalid stagedFiles rendering (User, 05/XX/2025).
 *     - How: Strengthened liveFeed validation to reject invalid entries, enhanced stagedFiles validation to skip invalid tasks, added detailed logging for invalid data, disabled sponsor summary fetch temporarily.
 *   - 05/XX/2025: Further refined API call debugging and socket cleanup.
 *     - Why: Persistent coreApi catch-all logs and growing socketRegistry size despite disabled sponsor summary (User, 05/XX/2025).
 *     - How: Added API call logging to trace unhandled requests, enhanced socket cleanup in useProposalSocket, kept sponsor summary disabled, improved debug panel for invalid entries.
 *   - 05/XX/2025: Ensured sponsor summary is disabled and added API call tracking.
 *     - Why: Persistent coreApi catch-all logs and unexpected sponsor summary fetch despite previous disable (User, 05/XX/2025).
 *     - How: Reconfirmed fetchSponsorSummary is disabled, added axios interceptor for API call tracking, maintained liveFeed validation and debug panel.
 *   - 05/XX/2025: Fixed rc-collapse deprecation warning.
 *     - Why: Ant Design warned about using `children` instead of `items` in Collapse component (User, 05/XX/2025).
 *     - How: Updated Collapse to use `items` prop, maintained debug panels for invalid liveFeed entries and API calls, enhanced API call tracking with request payloads.
 *   - 05/XX/2025: Added WebSocket error tracking and enhanced API debugging.
 *     - Why: WebSocket connection failures in useProposalSocket.js and persistent coreApi catch-all logs (User, 05/XX/2025).
 *     - How: Added debug panel for WebSocket errors, enhanced axios interceptor to log response status, maintained disabled sponsor summary and robust liveFeed validation.
 *     - Test: Load /grok, verify no WebSocket errors, no excessive API call logs, debug panels show WebSocket errors and API calls if any.
 * Test Instructions:
 *   - Run `npm start` (backend) and `npm run dev` (frontend), navigate to /grok: Verify TaskInput, TaskList, ProposalList, TaskModals, LiveFeed, FeedbackButton render, no WebSocket errors, no excessive API call logs, no rc-collapse warnings.
 *   - Login with admin@idurarapp.com/admin123: Confirm token in localStorage.auth, API calls succeed, tasks/proposals populate, no coreApi catch-all logs.
 *   - Click View Diff in TaskList: Verify diff drawer renders, no TypeError, check console for no errors.
 *   - Submit task via TaskInput: Confirm LiveFeed shows blue log, WebSocket updates (backendProposal) received, no HTTP 500 errors, no excessive API calls.
 *   - Click Test in TaskList: Confirm manual test triggers, blue log in LiveFeed, console logs valid stagedFiles, no invalid tasks rendered.
 *   - Click Quick Feedback, enter message: Verify idurar_db.logs logs feedback, LiveFeed shows yellow feedback event, no errors.
 *   - Simulate network failure (e.g., stop backend server): Verify ErrorAlerts shows “Network error: Unable to connect to server”, no WebSocket closure errors, no API call loops.
 *   - Check browser console: Confirm no rc-collapse warnings, no excessive coreApi catch-all logs, socketRegistry size stabilizes (e.g., < 5), only valid tasks logged, debug panels show invalid liveFeed entries, API calls, and WebSocket errors if any.
 *   - Check idurar_db.logs: Confirm WebSocket connection logs, task/feedback events with 05/XX/2025 timestamps, no excessive coreApi logs, no repeated generateFiles calls.
 * Future Enhancements:
 *   - Add UI animations for task/proposal actions using transition.css (Sprint 4).
 *   - Support task scheduling UI (Sprint 6).
 * Self-Notes:
 *   - Nate: Enhanced token retry and loading states for robust WebSocket and data handling (04/24/2025).
 *   - Nate: Fixed hook error by ensuring consistent hook calls, added WebSocket error UI (04/25/2025).
 *   - Nate: Fixed network errors and setSocketError TypeError by handling network failures and stabilizing hook initialization (04/25/2025).
 *   - Nate: Added Quick Feedback button and fixed Vite import error for Sprint 3 collaboration (04/25/2025).
 *   - Nate: Added ErrorBoundary and fixed useTaskDiff TypeError (04/25/2025).
 *   - Nate: Fixed missing token issue in useProposals, stabilized WebSocket connections (04/25/2025).
 *   - Nate: Enhanced stagedFiles validation and logging for Playwright button fix (04/26/2025).
 *   - Nate: Fixed API call loop and excessive logging with debouncing and stabilized dependencies (05/XX/2025).
 *   - Nate: Strengthened liveFeed validation, disabled sponsor summary fetch, added API call debugging to resolve coreApi catch-all logs (05/XX/2025).
 *   - Nate: Fixed rc-collapse warning by using items prop, enhanced API call tracking for persistent coreApi issues (05/XX/2025).
 *   - Nate: Added WebSocket error tracking and enhanced API debugging for connection failures (05/XX/2025).
 * Rollback Instructions:
 *   - If UI crashes or errors persist: Copy GrokUI.jsx.bak to GrokUI.jsx (`mv frontend/src/pages/GrokUI.jsx.bak frontend/src/pages/GrokUI.jsx`).
 *   - Verify /grok renders after rollback.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Spin, Space, Layout, message, Button, Alert, Collapse } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTasks from '../hooks/useTasks';
import useProposals from '../hooks/useProposals';
import useLiveFeed from '../hooks/useLiveFeed';
import TaskInput from '../components/TaskInput';
import TaskList from '../components/TaskList';
import ProposalList from '../components/ProposalList';
import TaskModals from '../components/TaskModals';
import ErrorAlerts from '../components/ErrorAlerts';
import LiveFeed from '../components/LiveFeed';
import FeedbackButton from '../components/FeedbackButton';

const { Content } = Layout;

// ErrorBoundary component to catch rendering errors
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Console UI Error</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Recursively validates an object to ensure no functions are included.
 * @param {any} obj - The object to validate.
 * @returns {boolean} - True if valid (no functions), false otherwise.
 */
function isValidFeedEntry(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.message !== 'string' || typeof obj.details !== 'string' || typeof obj.timestamp !== 'string') return false;

  const checkNested = (value) => {
    if (typeof value === 'function') return false;
    if (Array.isArray(value)) return value.every(checkNested);
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every(checkNested);
    }
    return true;
  };

  return checkNested(obj);
}

// Intercept axios requests and responses to log API calls for debugging
axios.interceptors.request.use(
  (config) => {
    console.log('GrokUI: API request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      data: config.data ? JSON.stringify(config.data) : 'none',
      headers: config.headers,
      timestamp: new Date().toISOString(),
    });
    return config;
  },
  (error) => {
    console.error('GrokUI: API request error:', error.message);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log('GrokUI: API response:', {
      method: response.config.method.toUpperCase(),
      url: response.config.url,
      status: response.status,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  (error) => {
    console.error('GrokUI: API response error:', {
      method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      url: error.config?.url || 'UNKNOWN',
      status: error.response?.status || 'NO_RESPONSE',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    return Promise.reject(error);
  }
);

const GrokUIContent = ({ token, messageApi, navigate }) => {
  console.log('GrokUIContent: Initializing hooks with parameters:', {
    token: token ? 'present' : 'missing',
    messageApi: !!messageApi,
  });

  const taskHook = useTasks({ token, navigate, messageApi });
  const proposalHook = useProposals({ messageApi });
  const liveFeedHook = useLiveFeed({ messageApi, token });

  // Track invalid liveFeed entries, API calls, and WebSocket errors for debugging
  const [invalidFeedEntries, setInvalidFeedEntries] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);
  const [webSocketErrors, setWebSocketErrors] = useState([]);

  // Update API calls log on each axios request and response
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        setApiCalls((prev) => [
          ...prev,
          {
            method: config.method.toUpperCase(),
            url: config.url,
            data: config.data ? JSON.stringify(config.data) : 'none',
            timestamp: new Date().toISOString(),
            status: 'PENDING',
          },
        ].slice(-10)); // Keep last 10 calls
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        setApiCalls((prev) =>
          prev.map((call) =>
            call.url === response.config.url && call.status === 'PENDING'
              ? { ...call, status: response.status }
              : call
          )
        );
        return response;
      },
      (error) => {
        setApiCalls((prev) =>
          prev.map((call) =>
            call.url === error.config?.url && call.status === 'PENDING'
              ? { ...call, status: error.response?.status || 'ERROR', error: error.message }
              : call
          )
        );
        return Promise.reject(error);
      }
    );

    // Add WebSocket error listener
    const handleWebSocketError = (event) => {
      setWebSocketErrors((prev) => [
        ...prev,
        {
          message: event.message || 'WebSocket connection failed',
          timestamp: new Date().toISOString(),
        },
      ].slice(-10)); // Keep last 10 errors
    };

    window.addEventListener('error', handleWebSocketError);
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
      window.removeEventListener('error', handleWebSocketError);
    };
  }, []);

  // Merge live feeds, ensuring valid entries
  const combinedLiveFeed = useMemo(() => {
    const feeds = [...(proposalHook.liveFeed || []), ...(liveFeedHook.liveFeed || [])];
    const validFeeds = [];
    const invalidEntries = [];

    feeds.forEach(entry => {
      if (isValidFeedEntry(entry)) {
        validFeeds.push(entry);
      } else {
        console.warn('GrokUIContent: Invalid liveFeed entry detected:', {
          entry,
          messageType: entry?.message ? typeof entry.message : 'missing',
          detailsType: entry?.details ? typeof entry.details : 'missing',
          timestampType: entry?.timestamp ? typeof entry.timestamp : 'missing',
        });
        invalidEntries.push({
          entry: JSON.stringify(entry, (key, value) => (typeof value === 'function' ? '[Function]' : value), 2),
          timestamp: new Date().toISOString(),
        });
      }
    });

    setInvalidFeedEntries(invalidEntries);
    console.log('GrokUIContent: Valid liveFeed entries:', validFeeds.length, 'Invalid entries:', invalidEntries.length);
    return validFeeds.slice(-50);
  }, [proposalHook.liveFeed, liveFeedHook.liveFeed]);

  const setCombinedLiveFeed = (newFeed) => {
    const validFeed = newFeed.filter(entry => {
      const isValid = isValidFeedEntry(entry);
      if (!isValid) {
        console.warn('GrokUIContent: Skipped invalid liveFeed update:', {
          entry,
          messageType: entry?.message ? typeof entry.message : 'missing',
          detailsType: entry?.details ? typeof entry.details : 'missing',
          timestampType: entry?.timestamp ? typeof entry.timestamp : 'missing',
        });
        setInvalidFeedEntries(prev => [
          ...prev,
          {
            entry: JSON.stringify(entry, (key, value) => (typeof value === 'function' ? '[Function]' : value), 2),
            timestamp: new Date().toISOString(),
          },
        ].slice(-10));
      }
      return isValid;
    });
    proposalHook.setLiveFeed?.(validFeed);
    liveFeedHook.setLiveFeed?.(validFeed);
  };

  // Validate tasks and log stagedFiles for debugging
  const validTasks = useMemo(() => {
    return Array.isArray(taskHook.tasks)
      ? taskHook.tasks.filter(task => {
          if (!task || !task.taskId) {
            console.warn('GrokUIContent: Skipping invalid task:', task);
            return false;
          }
          const isValid = Array.isArray(task.stagedFiles) && task.stagedFiles.every(f => f && f.path && f.content);
          if (!isValid) {
            console.warn('GrokUIContent: Invalid stagedFiles for task:', {
              taskId: task.taskId,
              stagedFiles: task.stagedFiles,
            });
          }
          return isValid;
        })
      : [];
  }, [taskHook.tasks]);

  const hasValidStagedFiles = validTasks.length > 0 && validTasks.every(task => task.stagedFiles.length > 0);
  console.log('GrokUIContent: Rendering components, tasks:', validTasks.length, 'proposals:', proposalHook.backendProposals?.length || 0, 'liveFeed:', combinedLiveFeed.length, 'hasValidStagedFiles:', hasValidStagedFiles);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ margin: '40px auto', padding: '0 50px', maxWidth: 1400 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card title="Task Input">
            <TaskInput
              prompt={taskHook.prompt || ''}
              setPrompt={taskHook.setPrompt || (() => {})}
              handleSubmit={taskHook.handleSubmit || (() => {})}
              clearTasks={taskHook.clearTasks || (() => {})}
              buttonLoading={taskHook.buttonLoading || {}}
              isSubmitting={taskHook.isSubmitting || false}
            />
            <ErrorAlerts taskError={taskHook.taskError} fileError={taskHook.fileError} />
          </Card>
          <Card title="Tasks">
            {taskHook.loadingTasks ? (
              <Spin size="large" />
            ) : validTasks.length > 0 ? (
              <TaskList
                tasks={validTasks}
                loading={taskHook.loadingTasks || false}
                showDiff={taskHook.showDiff || (() => {})}
                handleTestTask={taskHook.handleTestTask || (() => {})}
                handleApproveTask={taskHook.handleApproveTask || (() => {})}
                showDenyModal={taskHook.showDenyModal || (() => {})}
                deleteTask={taskHook.deleteTask || (() => {})}
                buttonLoading={taskHook.buttonLoading || {}}
              />
            ) : (
              <p>No valid tasks available. Submit a task to get started.</p>
            )}
          </Card>
          {(proposalHook.modalVisible || taskHook.denyModalVisible) && (
            <TaskModals
              modalVisible={proposalHook.modalVisible || false}
              modalType={proposalHook.modalType || ''}
              selectedProposal={proposalHook.selectedProposal || null}
              selectedProposals={proposalHook.selectedProposals || []}
              denyModalVisible={taskHook.denyModalVisible || false}
              selectedTaskId={taskHook.selectedTaskId || null}
              handleModalOk={proposalHook.handleModalOk || (() => {})}
              handleModalCancel={proposalHook.handleModalCancel || (() => {})}
              handleDenyModalOk={taskHook.handleDenyModalOk || (() => {})}
              handleDenyModalCancel={taskHook.handleDenyModalCancel || (() => {})}
              buttonLoading={proposalHook.buttonLoading || taskHook.buttonLoading || {}}
            />
          )}
          <Card title="Proposals">
            {proposalHook.loadingProposals ? (
              <Spin size="large" />
            ) : proposalHook.backendProposals?.length > 0 ? (
              <ProposalList
                backendProposals={proposalHook.backendProposals || []}
                selectedProposals={proposalHook.selectedProposals || []}
                setSelectedProposals={proposalHook.setSelectedProposals || (() => {})}
                handleBulkApprove={proposalHook.handleBulkApprove || (() => {})}
                handleBulkDeny={proposalHook.handleBulkDeny || (() => {})}
                showProposalModal={proposalHook.showProposalModal || (() => {})}
                handleTestProposal={proposalHook.handleTestProposal || (() => {})}
                handleDenyProposal={proposalHook.handleDenyProposal || (() => {})}
                buttonLoading={proposalHook.buttonLoading || {}}
                loading={proposalHook.loadingProposals || false}
              />
            ) : (
              <p>No proposals available. Submit a task to generate proposals.</p>
            )}
          </Card>
          <Card title="Live Feed">
            {combinedLiveFeed.length > 0 ? (
              <LiveFeed liveFeed={combinedLiveFeed} setLiveFeed={setCombinedLiveFeed} />
            ) : (
              <p>No feed entries available. Perform actions to populate the feed.</p>
            )}
          </Card>
          <Card title="Quick Feedback">
            <FeedbackButton messageApi={messageApi} token={token} />
          </Card>
          {invalidFeedEntries.length > 0 && (
            <Card title="Debug: Invalid LiveFeed Entries">
              <Collapse
                items={[
                  {
                    key: '1',
                    label: `Invalid Entries (${invalidFeedEntries.length})`,
                    children: (
                      <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {invalidFeedEntries.map((entry, index) => (
                          <div key={index}>
                            <strong>Timestamp:</strong> {entry.timestamp}
                            <br />
                            <strong>Entry:</strong>
                            <br />
                            {entry.entry}
                            <hr />
                          </div>
                        ))}
                      </pre>
                    ),
                  },
                ]}
              />
            </Card>
          )}
          {apiCalls.length > 0 && (
            <Card title="Debug: API Calls">
              <Collapse
                items={[
                  {
                    key: '1',
                    label: `API Calls (${apiCalls.length})`,
                    children: (
                      <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {apiCalls.map((call, index) => (
                          <div key={index}>
                            <strong>Timestamp:</strong> {call.timestamp}
                            <br />
                            <strong>Method:</strong> {call.method}
                            <br />
                            <strong>URL:</strong> {call.url}
                            <br />
                            <strong>Data:</strong> {call.data}
                            <br />
                            <strong>Status:</strong> {call.status}
                            {call.error && (
                              <>
                                <br />
                                <strong>Error:</strong> {call.error}
                              </>
                            )}
                            <hr />
                          </div>
                        ))}
                      </pre>
                    ),
                  },
                ]}
              />
            </Card>
          )}
          {webSocketErrors.length > 0 && (
            <Card title="Debug: WebSocket Errors">
              <Collapse
                items={[
                  {
                    key: '1',
                    label: `WebSocket Errors (${webSocketErrors.length})`,
                    children: (
                      <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {webSocketErrors.map((error, index) => (
                          <div key={index}>
                            <strong>Timestamp:</strong> {error.timestamp}
                            <br />
                            <strong>Message:</strong> {error.message}
                            <hr />
                          </div>
                        ))}
                      </pre>
                    ),
                  },
                ]}
              />
            </Card>
          )}
          {/* Sponsor Summary disabled to reduce coreApi catch-all logs */}
        </Space>
      </Content>
    </Layout>
  );
};

const GrokUI = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  // Fetch token in useEffect
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const authToken = auth?.token;

    if (!authToken) {
      console.error('GrokUI: No valid token found in localStorage');
      setNetworkError('Authentication failed: No valid token found');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    console.log('GrokUI: Validating token:', authToken ? 'present' : 'missing');
    // Increased delay to ensure backend readiness and stable token setting
    setTimeout(() => {
      setToken(authToken);
      setIsLoading(false);
      console.log('GrokUI: Token set, rendering GrokUIContent');
    }, 3000);
  }, [navigate]);

  // Handle loading state
  if (isLoading) {
    console.log('GrokUI: Rendering loading state');
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />;
  }

  // Handle network or token errors
  if (networkError || !token) {
    console.log('GrokUI: Rendering error state:', { networkError, token: token ? 'present' : 'missing' });
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>{networkError ? 'Network Error' : 'Authentication Error'}</h2>
        <p>{networkError || 'No valid token found. Please log in again.'}</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <ErrorBoundary>
        <GrokUIContent token={token} messageApi={messageApi} navigate={navigate} />
      </ErrorBoundary>
    </>
  );
};

export default GrokUI;
