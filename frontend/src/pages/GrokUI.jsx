/*
 * File Path: frontend/src/pages/GrokUI.jsx
 * Purpose: Main UI component for Allur Space Console, rendering task input, task list, live feed, and Grok analyzer.
 * How It Works:
 *   - Uses hooks (useTasks, useTaskSocket, useProposals, useLiveFeed) for task and proposal management.
 *   - Renders TaskInput.jsx, TaskList.jsx, LiveFeed.jsx, and GrokAnalyzer.jsx with real-time updates.
 *   - Implements ErrorBoundary to handle runtime errors gracefully.
 *   - Provides messageApi via antd App for notifications.
 * Dependencies:
 *   - React: useState, useEffect, useMemo, Component (version 18.3.1).
 *   - antd: Layout, App, message for UI and notifications (version 5.24.6).
 *   - react-router-dom: useNavigate for redirects (version 6.26.2).
 *   - useTasks.js: Task state and actions.
 *   - useTaskSocket.js: Task WebSocket updates.
 *   - useProposals.js: Proposal state and actions.
 *   - useLiveFeed.js: Live feed WebSocket events.
 *   - TaskInput.jsx, TaskList.jsx, LiveFeed.jsx, GrokAnalyzer.jsx, FeedbackButton.jsx: Child components.
 * Why It’s Here:
 *   - Serves as the main dashboard for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized GrokUI with task and proposal rendering.
 *   - 04/23/2025: Added ErrorBoundary and WebSocket integration.
 *   - 04/29/2025: Fixed invalid token issue.
 *   - 04/30/2025: Passed messageApi to useTasks to fix [antd: message] warning (Grok).
 *   - 05/02/2025: Wrapped with App, passed messageApi to components, added navigate (Grok).
 *     - Why: Enable messageApi for TaskInput/TaskList, support 401 redirects in useTaskDiff (User, 05/02/2025).
 *     - How: Used App.useApp, passed messageApi, added useNavigate.
 *     - Test: Load /grok, submit task, verify no [antd: message] warning, test 401 redirect.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify UI loads, submit "Build CRM system", confirm task appears, green log in LiveFeed.jsx.
 *   - Submit "Add MFA to login": Verify yellow proposal log, no [antd: message] warning.
 *   - Clear localStorage.auth, click "View Diff": Confirm redirect to /login.
 *   - Check browser console: Confirm no token errors, valid JWT used.
 * Rollback Instructions:
 *   - Revert to GrokUI.jsx.bak (`mv frontend/src/pages/GrokUI.jsx.bak frontend/src/pages/GrokUI.jsx`).
 *   - Verify /grok loads and tasks can be submitted.
 * Future Enhancements:
 *   - Add UI for task filtering (Sprint 4).
 *   - Support theme switching (Sprint 5).
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { Layout, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import useTasks from '../hooks/useTasks';
import useTaskSocket from '../hooks/useTaskSocket';
import useProposals from '../hooks/useProposals';
import useLiveFeed from '../hooks/useLiveFeed';
import TaskInput from '../components/TaskInput';
import TaskList from '../components/TaskList';
import LiveFeed from '../components/LiveFeed';
import GrokAnalyzer from '../components/GrokAnalyzer';
import FeedbackButton from '../components/FeedbackButton';

const { Content } = Layout;

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Something went wrong.</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const GrokUIContent = ({ token, navigate }) => {
  const { message: messageApi, contextHolder } = App.useApp();
  const { prompt, setPrompt, tasks, handleSubmit, clearTasks, isSubmitting, buttonLoading, fetchTasks } = useTasks(messageApi);
  const { tasks: socketTasks, socket: socketTasksInstance } = useTaskSocket({
    singletonFlag: true,
    token,
    setSocketError: (error) => messageApi.error(error),
  });
  const { proposals, approveProposal, rollbackProposal } = useProposals();
  const { events } = useLiveFeed();
  console.log('GrokUIContent: Initializing hooks with parameters:', { token, messageApi: !!messageApi, navigate: !!navigate });

  const mergedTasks = useMemo(() => {
    const taskMap = new Map();
    tasks.forEach((task) => taskMap.set(task.taskId, { ...task }));
    socketTasks.forEach((task) => {
      if (taskMap.has(task.taskId)) {
        taskMap.set(task.taskId, { ...taskMap.get(task.taskId), ...task });
      } else {
        taskMap.set(task.taskId, { ...task });
      }
    });
    return Array.from(taskMap.values());
  }, [tasks, socketTasks]);

  const hasValidStagedFiles = mergedTasks.some((task) => task.stagedFiles && task.stagedFiles.length > 0);

  useEffect(() => {
    console.log('GrokUIContent: Rendering components', {
      tasks: mergedTasks.length,
      proposals: proposals.length,
      liveFeed: events.length,
      hasValidStagedFiles,
    });
  }, [mergedTasks, proposals, events, hasValidStagedFiles]);

  return (
    <>
      {contextHolder}
      <TaskInput
        prompt={prompt}
        setPrompt={setPrompt}
        handleSubmit={handleSubmit}
        clearTasks={clearTasks}
        isSubmitting={isSubmitting}
        buttonLoading={buttonLoading}
        messageApi={messageApi}
      />
      <TaskList
        tasks={mergedTasks}
        fetchTasks={fetchTasks}
        messageApi={messageApi}
      />
      <LiveFeed />
      <GrokAnalyzer tasks={mergedTasks} hasValidStagedFiles={hasValidStagedFiles} />
      <FeedbackButton token={token} socketTasks={socketTasksInstance} messageApi={messageApi} />
    </>
  );
};

const GrokUI = () => {
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (auth.token) {
      setToken(auth.token);
    } else {
      console.error('GrokUI: No valid token found in localStorage');
      navigate('/login');
    }
  }, [navigate]);

  if (!token) {
    return <div>Loading...</div>;
  }

  return (
    <App>
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Content>
          <ErrorBoundary>
            <GrokUIContent token={token} navigate={navigate} />
          </ErrorBoundary>
        </Content>
      </Layout>
    </App>
  );
};

export default GrokUI;
