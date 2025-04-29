/*
 * File Path: frontend/src/components/TaskList.jsx
 * Purpose: Task table component for Allur Space Console UI, displaying tasks with actions for viewing diffs, testing, approving, denying, and deleting.
 * How It Works:
 *   - Renders an Ant Design Table with columns for task ID, prompt, status, and actions (view diff, test, approve, deny, delete).
 *   - Receives task data and action handlers from useTasks.js, integrating useTaskDiff.js for diff viewer functionality.
 *   - Supports pagination, displaying 10 tasks per page for performance.
 *   - Conditionally enables actions based on task status (e.g., test/approve/deny only for pending_approval).
 *   - Includes "Test with Playwright" button to fetch manual test URL with retry logic.
 * Mechanics:
 *   - Table columns use render functions for status (color-coded Tag) and actions (Button.Group with loading states).
 *   - Actions trigger handlers from useTasks.js (showDiff, handleTestTask, handleApproveTask, showDenyModal, deleteTask).
 *   - Status column uses green for applied, red for denied/failed, blue for processing, yellow for pending_approval, default for pending.
 *   - Socket.IO updates from taskManager.js and taskTesterV18.js ensure real-time task status and stagedFiles updates.
 * Dependencies:
 *   - antd: Table, Button, Tag, Space, Popconfirm, Empty, message for UI components (version 5.24.6).
 *   - React: Core library for rendering (version 18.3.1).
 * Dependents:
 *   - GrokUI.jsx: Renders TaskList within a Card to display tasks.
 *   - useTasks.js: Provides tasks, buttonLoading, and action handlers.
 * Why It’s Here:
 *   - Modularizes task table UI from GrokUI.jsx, reducing its size by ~100 lines (04/21/2025).
 *   - Supports Sprint 1 task workflow and Sprint 2 usability with real-time updates.
 * Change Log:
 *   - 04/21/2025: Created to modularize GrokUI.jsx task table.
 *   - 04/23/2025: Updated to align with useTaskDiff.js escape hatch.
 *   - 04/23/2025: Added null checks and debug logs for props.
 *   - 04/25/2025: Enhanced empty state and stagedFiles validation.
 *   - 04/26/2025: Strengthened Test button validation and logging for Playwright fix.
 *   - 05/XX/2025: Added "Test with Playwright" button and fixed deletion issues for Sprint 2.
 *     - Why: Support manual test URLs and resolve tasks reappearing after deletion (User, 05/XX/2025).
 *     - How: Added handleManualTest to fetch /grok/test/:taskId, enhanced deleteTask to refresh UI, increased retry attempts.
 *   - 05/XX/2025: Enhanced Playwright button and deletion reliability.
 *     - Why: Fix tasks reappearing after deletion and ensure reliable manual test URLs (User, 05/XX/2025).
 *     - How: Added retry logic to handleManualTest, ensured UI refresh on deletion, validated task state before actions.
 *     - Test: Click "Test with Playwright", verify test URL opens browser, click "Delete", confirm task gone, no reappearance on refresh.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify TaskList shows tasks or Empty component with “No tasks available” message.
 *   - Submit "Build CRM system": Confirm task appears with pending_approval status, stagedFiles.
 *   - Click "Test with Playwright" (pending_approval, valid stagedFiles): Confirm browser opens, blue log in LiveFeed.jsx.
 *   - Click "Test" (no/invalid stagedFiles): Verify button disabled, no error.
 *   - Click "Delete" or "Clear All Tasks": Confirm tasks removed, no reappearance on refresh, green log in LiveFeed.jsx.
 *   - Check LiveFeed.jsx: Confirm action logs with correct colors and details.
 * Future Enhancements:
 *   - Add task filtering by status (Sprint 4).
 *   - Support inline task editing (Sprint 6).
 * Self-Notes:
 *   - Nate: Added stagedFiles check for Test button to fix Playwright issue (04/23/2025).
 *   - Nate: Enhanced empty state with Empty component, strengthened Test button validation (04/25/2025).
 *   - Nate: Strengthened Test button validation and logging for Playwright fix (04/26/2025).
 *   - Nate: Added manual test button and fixed deletion for Sprint 2 (05/XX/2025).
 *   - Nate: Enhanced Playwright button and deletion reliability (05/XX/2025).
 * Rollback Instructions:
 *   - If TaskList fails: Copy TaskList.jsx.bak to TaskList.jsx (`mv frontend/src/components/TaskList.jsx.bak frontend/src/components/TaskList.jsx`).
 *   - Verify TaskList renders and actions work after rollback.
 */
import React from 'react';
import { Table, Button, Tag, Space, Popconfirm, Empty, message } from 'antd';
import apiClient from '../config/serverApiConfig';

const TaskList = ({
  tasks = [],
  buttonLoading = {},
  showDiff = () => console.warn('showDiff not defined'),
  handleTestTask = () => console.warn('handleTestTask not defined'),
  handleApproveTask = () => console.warn('handleApproveTask not defined'),
  showDenyModal = () => console.warn('showDenyModal not defined'),
  deleteTask = () => console.warn('deleteTask not defined'),
}) => {
  console.log('TaskList rendering, props:', {
    tasksLength: tasks?.length,
    buttonLoadingKeys: Object.keys(buttonLoading),
    showDiffDefined: !!showDiff,
    handleTestTaskDefined: !!handleTestTask,
    handleApproveTaskDefined: !!handleApproveTask,
    showDenyModalDefined: !!showDenyModal,
    deleteTaskDefined: !!deleteTask,
  });

  if (!tasks || !Array.isArray(tasks)) {
    console.warn('TaskList: tasks is not an array:', tasks);
    return <Empty description="No tasks available. Submit a task to get started." />;
  }

  if (tasks.length === 0) {
    return <Empty description="No tasks available. Submit a task to get started." />;
  }

  const handleManualTest = async (taskId) => {
    console.log('TaskList: Test with Playwright clicked for task:', taskId);
    let retries = 0;
    const maxRetries = 3;
    while (retries < maxRetries) {
      try {
        const response = await apiClient.get(`/grok/test/${taskId}`);
        const { testUrl } = response.data;
        if (!testUrl) throw new Error('Invalid test URL');
        window.open(testUrl, '_blank');
        console.log('TaskList: Manual test URL opened:', testUrl);
        message.success('Manual test launched in new tab');
        return;
      } catch (err) {
        retries++;
        console.warn(`TaskList: Manual test attempt ${retries}/${maxRetries} failed: ${err.message}`);
        if (retries >= maxRetries) {
          console.error('TaskList: Failed to fetch manual test URL:', err.message);
          message.error('Failed to launch manual test');
        }
        await new Promise(resolve => setTimeout(resolve, 500 * retries));
      }
    }
  };

  const columns = [
    {
      title: 'Task ID',
      dataIndex: 'taskId',
      key: 'taskId',
      render: (taskId) => (taskId ? taskId.slice(0, 8) + '...' : 'N/A'),
    },
    {
      title: 'Prompt',
      dataIndex: 'prompt',
      key: 'prompt',
      render: (prompt) => prompt || 'Untitled',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag
          color={
            status === 'applied' ? 'green' :
            status === 'denied' || status === 'failed' ? 'red' :
            status === 'processing' ? 'blue' :
            status === 'pending_approval' ? 'yellow' : 'default'
          }
        >
          {status || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const hasValidStagedFiles = Array.isArray(record.stagedFiles) && record.stagedFiles.length > 0 && record.stagedFiles.every(f => f.path && f.content);
        console.log('TaskList: Rendering actions for task:', {
          taskId: record.taskId,
          status: record.status,
          hasValidStagedFiles,
        });
        return (
          <Button.Group>
            <Button
              type="link"
              onClick={() => {
                console.log('TaskList: View Diff clicked for task:', record.taskId);
                showDiff(record.taskId);
              }}
              loading={buttonLoading[`diff_${record.taskId}`]}
              disabled={!record.taskId}
            >
              View Diff
            </Button>
            {record.status === 'pending_approval' && (
              <>
                <Button
                  type="link"
                  onClick={() => {
                    console.log('TaskList: Test clicked for task:', {
                      taskId: record.taskId,
                      stagedFiles: record.stagedFiles,
                    });
                    handleTestTask(record.taskId);
                  }}
                  loading={buttonLoading[`test_${record.taskId}`]}
                  disabled={!record.taskId || !hasValidStagedFiles}
                >
                  Test
                </Button>
                <Button
                  type="link"
                  onClick={() => {
                    console.log('TaskList: Test with Playwright clicked for task:', record.taskId);
                    handleManualTest(record.taskId);
                  }}
                  loading={buttonLoading[`manual_test_${record.taskId}`]}
                  disabled={!record.taskId || !hasValidStagedFiles}
                >
                  Test with Playwright
                </Button>
                <Button
                  type="link"
                  onClick={() => {
                    console.log('TaskList: Approve clicked for task:', record.taskId);
                    handleApproveTask(record.taskId);
                  }}
                  loading={buttonLoading[`approve_${record.taskId}`]}
                  disabled={!record.taskId}
                >
                  Approve
                </Button>
                <Popconfirm
                  title="Are you sure to deny this task?"
                  onConfirm={() => {
                    console.log('TaskList: Deny confirmed for task:', record.taskId);
                    showDenyModal(record.taskId);
                  }}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="link"
                    loading={buttonLoading[`deny_${record.taskId}`]}
                    disabled={!record.taskId}
                  >
                    Deny
                  </Button>
                </Popconfirm>
              </>
            )}
            <Popconfirm
              title="Are you sure to delete this task?"
              onConfirm={() => {
                console.log('TaskList: Delete confirmed for task:', record.taskId);
                deleteTask(record.taskId);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="link"
                loading={buttonLoading[`delete_${record.taskId}`]}
                disabled={!record.taskId}
              >
                Delete
              </Button>
            </Popconfirm>
          </Button.Group>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="taskId"
      pagination={{ pageSize: 10 }}
    />
  );
};

export default TaskList;
