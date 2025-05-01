/*
 * File Path: frontend/src/components/TaskList.jsx
 * Purpose: Displays and manages task list for Allur Space Console, with buttons for deletion, testing, proposal actions, and granular change review.
 * How It Works:
 *   - Renders tasks from useTasks.js and useTaskSocket.js in an Ant Design Table.
 *   - Provides buttons for deleting tasks, running Playwright tests, approving/rolling back proposals, viewing test results, and reviewing changes.
 *   - Uses useTaskActions.js for task operations and useProposals.js for proposal data.
 *   - Displays task status, files, errors, test instructions, and test result links with loading states.
 * Mechanics:
 *   - Tracks loading and error states per task for delete/test actions.
 *   - Disables buttons during loading or for invalid tasks (e.g., no stagedFiles).
 *   - Refreshes task list immediately after deletion to prevent reappearing tasks.
 *   - Shows test result links post-Playwright test and granular change diffs via useTaskDiff.js.
 * Dependencies:
 *   - React: Core library for rendering (version 18.3.1).
 *   - antd: Table, Button, Tag, Space, Collapse, Modal for UI (version 5.22.2).
 *   - useTaskActions.js: deleteTask, handleTestTask, approveProposal, rollbackProposal, clearTasks.
 *   - useProposals.js: Fetches proposal data and actions.
 *   - useTaskDiff.js: Provides granular change diffs.
 * Why It’s Here:
 *   - Provides primary task management UI for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized task list with basic rendering (Nate).
 *   - 04/23/2025: Added delete/test buttons with loading states (Nate).
 *   - 04/29/2025: Fixed deletion reliability and Playwright test button (Nate).
 *   - 05/03/2025: Added test result links and fixed Clear All Tasks (Nate).
 *   - 05/01/2025: Replaced static message with messageApi to fix [antd: message] warning (Grok).
 *   - 05/02/2025: Added granular change review, test instructions display (Grok).
 *   - 05/04/2025: Passed token and messageApi to useTaskDiff (Grok).
 *     - Why: Fix token: 'missing' in useTaskDiff initialization (User, 05/04/2025).
 *     - How: Added token and messageApi props to useTaskDiff call.
 *     - Test: Click "View Changes", verify diff modal renders, no token errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit task via TaskInput.jsx.
 *   - Delete task, verify removal, single green log, no [antd: message] warning.
 *   - Click "Test with Playwright", verify single headed browser, test URL appears.
 *   - Click "View Changes", confirm granular diffs in modal, no token errors.
 *   - Expand test instructions, verify content from Task.testInstructions.
 *   - Check browser console: Confirm no errors, proper loading states, no warnings.
 * Future Enhancements:
 *   - Add task sorting by status/creation date (Sprint 3).
 *   - Support task history view (Sprint 4).
 *   - Implement drag-and-drop prioritization (Sprint 4).
 */

import React, { useState } from 'react';
import { Table, Button, Tag, Space, Collapse, Modal } from 'antd';
import useTaskActions from '../hooks/useTaskActions';
import useProposals from '../hooks/useProposals';
import useTaskDiff from '../hooks/useTaskDiff';

const { Panel } = Collapse;

const TaskList = ({ tasks, fetchTasks, messageApi, token }) => {
  const { deleteTask, handleTestTask, approveProposal, rollbackProposal, clearTasks } = useTaskActions(fetchTasks);
  const { proposals } = useProposals();
  const { getTaskDiff, showDiff } = useTaskDiff({ token, messageApi, tasks, setTasks: fetchTasks });
  const [loadingTasks, setLoadingTasks] = useState({});
  const [errorTasks, setErrorTasks] = useState({});
  const [testLinks, setTestLinks] = useState({});
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [currentDiff, setCurrentDiff] = useState(null);

  const handleDelete = async (taskId) => {
    setLoadingTasks((prev) => ({ ...prev, [taskId]: { ...prev[taskId], delete: true } }));
    setErrorTasks((prev) => ({ ...prev, [taskId]: null }));
    try {
      await deleteTask(taskId);
      await fetchTasks();
      messageApi.success('Task deleted successfully');
    } catch (error) {
      const errorMessage = `Failed to delete task: ${error.message}`;
      messageApi.error(errorMessage);
      setErrorTasks((prev) => ({ ...prev, [taskId]: errorMessage }));
    } finally {
      setLoadingTasks((prev) => ({ ...prev, [taskId]: { ...prev[taskId], delete: false } }));
    }
  };

  const handleManualTest = async (taskId, stagedFiles) => {
    if (!stagedFiles || stagedFiles.length === 0) {
      messageApi.error('No staged files available for testing');
      return;
    }
    setLoadingTasks((prev) => ({ ...prev, [taskId]: { ...prev[taskId], test: true } }));
    setErrorTasks((prev) => ({ ...prev, [taskId]: null }));
    try {
      const response = await handleTestTask(taskId, stagedFiles);
      if (response.testUrl) {
        setTestLinks((prev) => ({ ...prev, [taskId]: response.testUrl }));
        console.log('TaskList: Test URL generated', { taskId, testUrl: response.testUrl });
      }
      messageApi.success('Playwright test launched successfully');
    } catch (error) {
      const errorMessage = `Failed to run Playwright test: ${error.message}`;
      messageApi.error(errorMessage);
      setErrorTasks((prev) => ({ ...prev, [taskId]: errorMessage }));
    } finally {
      setLoadingTasks((prev) => ({ ...prev, [taskId]: { ...prev[taskId], test: false } }));
    }
  };

  const handleClearTasks = async () => {
    setLoadingTasks((prev) => ({ ...prev, clear: true }));
    try {
      await clearTasks();
      await fetchTasks();
      messageApi.success('All tasks cleared successfully');
    } catch (error) {
      const errorMessage = `Failed to clear tasks: ${error.message}`;
      messageApi.error(errorMessage);
    } finally {
      setLoadingTasks((prev) => ({ ...prev, clear: false }));
    }
  };

  const handleViewChanges = (taskId) => {
    showDiff(taskId);
    const task = tasks.find(t => t.taskId === taskId);
    if (task) {
      const diff = getTaskDiff(task.originalContent, task.newContent);
      setCurrentDiff(diff);
      setDiffModalVisible(true);
    }
  };

  const columns = [
    {
      title: 'Task ID',
      dataIndex: 'taskId',
      key: 'taskId',
      render: (text) => text.slice(0, 8),
    },
    {
      title: 'Prompt',
      dataIndex: 'prompt',
      key: 'prompt',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'pending_approval' ? 'yellow' : status === 'applied' ? 'green' : status === 'failed' ? 'red' : 'blue';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Staged Files',
      dataIndex: 'stagedFiles',
      key: 'stagedFiles',
      render: (files) => (files ? files.length : 0),
    },
    {
      title: 'Error',
      dataIndex: 'taskId',
      key: 'error',
      render: (taskId) => errorTasks[taskId] || '-',
    },
    {
      title: 'Test Results',
      key: 'testResults',
      render: (_, record) => (
        testLinks[record.taskId] ? (
          <a href={testLinks[record.taskId]} target="_blank" rel="noopener noreferrer">View Test Results</a>
        ) : (
          '-'
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const taskProposals = proposals.filter((p) => p.taskId === record.taskId);
        return (
          <Space size="middle">
            <Button
              type="primary"
              danger
              onClick={() => handleDelete(record.taskId)}
              loading={loadingTasks[record.taskId]?.delete}
              disabled={loadingTasks[record.taskId]?.delete || loadingTasks[record.taskId]?.test}
            >
              Delete
            </Button>
            <Button
              type="default"
              onClick={() => handleManualTest(record.taskId, record.stagedFiles)}
              loading={loadingTasks[record.taskId]?.test}
              disabled={loadingTasks[record.taskId]?.delete || loadingTasks[record.taskId]?.test || !record.stagedFiles || record.stagedFiles.length === 0}
            >
              Test with Playwright
            </Button>
            <Button
              type="default"
              onClick={() => handleViewChanges(record.taskId)}
              disabled={!record.originalContent || !record.newContent}
            >
              View Changes
            </Button>
            {taskProposals.map((proposal) => (
              <Space key={proposal.id}>
                <Button
                  type="primary"
                  onClick={() => approveProposal(proposal.id)}
                  disabled={proposal.status !== 'pending' || loadingTasks[record.taskId]?.delete || loadingTasks[record.taskId]?.test}
                >
                  Approve
                </Button>
                <Button
                  type="default"
                  onClick={() => rollbackProposal(proposal.id)}
                  disabled={proposal.status !== 'pending' || loadingTasks[record.taskId]?.delete || loadingTasks[record.taskId]?.test}
                >
                  Rollback
                </Button>
              </Space>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        danger
        onClick={handleClearTasks}
        loading={loadingTasks.clear}
        disabled={tasks.length === 0 || loadingTasks.clear}
        style={{ marginBottom: 16 }}
      >
        Clear All Tasks
      </Button>
      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="taskId"
        pagination={{ pageSize: 10 }}
        loading={!tasks}
        expandable={{
          expandedRowRender: (record) => (
            <Collapse>
              <Panel header="Test Instructions" key="1">
                <pre>{record.testInstructions || 'No test instructions available'}</pre>
              </Panel>
            </Collapse>
          ),
        }}
      />
      <Modal
        title="Task Changes"
        open={diffModalVisible}
        onCancel={() => setDiffModalVisible(false)}
        footer={<Button onClick={() => setDiffModalVisible(false)}>Close</Button>}
        width={800}
      >
        {currentDiff && (
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(currentDiff).map(([file, changes]) => (
              <div key={file} className="mb-4">
                <h3 className="font-bold">{file}</h3>
                <pre className="bg-gray-100 p-2 rounded">
                  {changes.map((change, index) => (
                    <div key={index} className={change.added ? 'text-green-600' : change.removed ? 'text-red-600' : ''}>
                      {change.added ? '+' : change.removed ? '-' : ' '} {change.value}
                    </div>
                  ))}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskList;
