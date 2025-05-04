/*
 * File Path: frontend/src/pages/GrokUI.jsx
 * Purpose: Main UI for Allur Space Console, integrating task input, task list, live feed, and proposal list.
 * How It Works:
 *   - Renders TaskInput.jsx for task submission, TaskList.jsx for task display, LiveFeed.jsx for real-time events, and ProposalList.jsx for proposals.
 *   - Manages authentication token and messageApi for UI feedback.
 *   - Uses useTasks.js for task management and socket connections.
 * Dependencies:
 *   - React: useState, useEffect for state management (version 18.3.1).
 *   - antd: Layout, message for UI (version 5.24.6).
 *   - useTasks.js: Task management hook.
 *   - TaskInput.jsx, TaskList.jsx, LiveFeed.jsx, ProposalList.jsx: UI components.
 *   - logClientError.js: Client-side error logging.
 * Why It’s Here:
 *   - Centralizes UI for Sprint 2, providing task management and real-time updates (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized GrokUI with task input and list (Nate).
 *   - 04/29/2025: Added LiveFeed and ProposalList integration (Nate).
 *   - 05/03/2025: Added error boundary and messageApi (Nate).
 *   - 05/04/2025: Fixed useTasksHook prop for TaskInput (Grok).
 *     - Why: TypeError: useTasksHook is not a function in TaskInput.jsx (User, 05/04/2025).
 *     - How: Ensured useTasks passed as useTasks prop, added debugging.
 *   - 05/04/2025: Fixed missing token and useTasks props (Grok).
 *     - Why: Prompt textbox not visible, PropType warnings for token and useTasks (User, 05/04/2025).
 *     - How: Updated GrokUIContent to pass token and useTasks correctly, preserved functionality.
 *     - Test: Load /grok, verify TaskInput textbox visible, submit task, no PropType warnings.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, login, submit task via TaskInput.
 *   - Verify TaskInput textbox visible, no PropType warnings, UI renders TaskInput, TaskList, LiveFeed, ProposalList.
 *   - Check console for 'GrokUI: Rendering components' logs with token and task count.
 * Rollback Instructions:
 *   - Revert to GrokUI.jsx.bak (`mv frontend/src/pages/GrokUI.jsx.bak frontend/src/pages/GrokUI.jsx`).
 *   - Verify /grok loads (may have missing textbox or PropType warnings).
 * Future Enhancements:
 *   - Add task filtering UI (Sprint 4).
 *   - Support theme switching (Sprint 5).
 *   - Integrate ALL Token rewards (Sprint 3).
 */

import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import useTasks from '../hooks/useTasks';
import TaskInput from '../components/TaskInput';
import TaskList from '../components/TaskList';
import LiveFeed from '../components/LiveFeed';
import ProposalList from '../components/ProposalList';
import { logClientError } from '../utils/logClientError';

const { Content } = Layout;

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error, info) => {
      console.error('ErrorBoundary caught error:', error, info);
      logClientError({
        message: `ErrorBoundary caught error: ${error.message}`,
        context: 'GrokUI',
        details: { error: error.message, componentStack: info.componentStack, timestamp: new Date().toISOString() },
      });
      setHasError(true);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return <h1>Something went wrong. Please refresh the page.</h1>;
  }
  return children;
};

const GrokUIContent = ({ token }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const useTasksHook = useTasks; // Ensure useTasks is passed as a function

  // Debug rendering
  console.log('GrokUI: Rendering components', {
    token: token ? 'present' : 'missing',
    useTasksType: typeof useTasksHook,
    timestamp: new Date().toISOString(),
  });

  return (
    <>
      {contextHolder}
      <TaskInput token={token} useTasks={useTasksHook} messageApi={messageApi} />
      <TaskList token={token} messageApi={messageApi} />
      <LiveFeed token={token} />
      <ProposalList token={token} messageApi={messageApi} />
    </>
  );
};

const GrokUI = () => {
  const [token, setToken] = useState(localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')).token : null);

  // Debug token state
  useEffect(() => {
    console.log('GrokUI: Token state updated', {
      token: token ? 'present' : 'missing',
      timestamp: new Date().toISOString(),
    });
    if (!token) {
      console.error('GrokUI: No valid token found, redirecting to login');
      window.location.href = '/login';
    }
  }, [token]);

  if (!token) {
    return <div>Loading...</div>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <ErrorBoundary>
          <GrokUIContent token={token} />
        </ErrorBoundary>
      </Content>
    </Layout>
  );
};

export default GrokUI;
