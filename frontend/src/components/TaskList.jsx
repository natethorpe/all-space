/*
 * File Path: frontend/src/components/TaskList.jsx
 * Purpose: Displays a list of tasks with actions (Playwright test, View Changes, Approve/Deny, Delete) for Allur Space Console.
 * How It Works:
 *   - Renders a table of tasks using antd Table component, displaying task details and action buttons.
 *   - Integrates with useTaskActions.js for task operations (test execution, approval, denial, deletion).
 *   - Shows test instructions in a modal for manual testing guidance.
 *   - Displays diffs via useTaskDiff.jsx when View Changes is clicked.
 * Mechanics:
 *   - Fetches tasks from useTasks.js and updates via WebSocket events from useTaskSocket.js.
 *   - Handles Playwright test execution by opening testUrl in a new tab.
 *   - Supports Approve/Deny actions to apply or rollback changes via taskManager.js.
 *   - Allows multiple test runs until Approve/Deny is selected.
 * Dependencies:
 *   - React: Component rendering (version 18.3.1).
 *   - antd: Table, Button, Modal for UI (version 5.24.6).
 *   - useTaskActions.js: Task operations.
 *   - useTaskDiff.jsx: Diff rendering.
 *   - useTasks.js: Task data.
 * Dependents:
 *   - GrokUI.jsx: Renders TaskList component.
 * Why It’s Here:
 *   - Provides task management UI for Sprint 2, addressing issue #46 (User, 05/02/2025).
 * Change Log:
 *   - 04/07/2025: Initialized task list with basic table (Nate).
 *   - 04/23/2025: Added Playwright test button (Nate).
 *   - 04/29/2025: Added View Changes and Approve/Deny buttons (Nate).
 *   - 05/08/2025: Fixed button enabling logic (Grok).
 *   - 05/08/2025: Added test instructions modal and persistent Playwright button (Grok).
 *   - 05/08/2025: Simplified Approve/Deny and fixed button sync (Grok).
 *   - 05/08/2025: Reapplied to ensure functionality post-Hook fixes (Grok).
 *   - 05/08/2025: Fixed deprecated Modal prop and added fallback logic (Grok).
 *   - 05/08/2025: Added debug logging for button states (Grok).
 *   - 05/08/2025: Added rendering debug logging and task validation (Grok).
 *     - Why: TaskList.jsx buttons not enabling despite pending_approval status (User, 05/08/2025).
 *     - How: Added logging for task rendering and validation, preserved functionality.
 *     - Test: Submit task, verify buttons enable, 'TaskList: Rendering tasks' log shows task data.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit "Create an inventory system".
 *   - Verify TaskList renders with Playwright/View Changes/Approve/Deny/Delete buttons.
 *   - Click Playwright, confirm testUrl opens, instructions display in modal.
 *   - Run test multiple times, verify Playwright button stays enabled.
 *   - Click View Changes, confirm diff modal.
 *   - Click Approve, verify task status updates to 'applied'.
 *   - Click Deny (new task), verify task status updates to 'denied'.
 *   - Check console for 'TaskList: Rendering tasks' and 'TaskList: Task data' logs showing task status and fields.
 * Rollback Instructions:
 *   - Revert to TaskList.jsx.bak (`mv frontend/src/components/TaskList.jsx.bak frontend/src/components/TaskList.jsx`).
 *   - Verify task list renders (may have issues or missing logs).
 * Future Enhancements:
 *   - Add task filtering (Sprint 4).
 *   - Support bulk Approve/Deny (Sprint 5).
 *   - Integrate ALL Token rewards for task actions (Sprint 3).
 */

import React, { useState } from 'react';
import { Table, Button, Modal, Typography, Tag } from 'antd';
import useTaskActions from '../hooks/useTaskActions';
import useTaskDiff from '../hooks/useTaskDiff';

const { Text } = Typography;

const TaskList = ({ tasks, messageApi }) => {
  const { handleTest, handleApprove, handleDeny, handleDelete } = useTaskActions(messageApi);
  const { showDiff } = useTaskDiff({ messageApi, navigate: () => {}, token: 'present', tasks: tasks || [] });
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Debug task rendering
  console.log('TaskList: Rendering tasks', {
    taskCount: tasks?.length || 0,
    taskIds: tasks?.map(task => task.taskId) || [],
    timestamp: new Date().toISOString(),
  });

  // Validate tasks
  const validatedTasks = tasks?.filter(task => {
    const isValid = task && task.taskId && typeof task.status === 'string';
    if (!isValid) {
      console.warn('TaskList: Invalid task data', { task, timestamp: new Date().toISOString() });
    }
    return isValid;
  }) || [];

  const showInstructions = (task) => {
    setSelectedTask(task);
    setInstructionModalOpen(true);
  };

  const columns = [
    {
      title: 'Task ID',
      dataIndex: 'taskId',
      key: 'taskId',
      render: (text) => (text ? text.slice(0, 8) : '-'),
    },
    {
      title: 'Prompt',
      dataIndex: 'prompt',
      key: 'prompt',
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'pending_approval' ? 'yellow' : status === 'applied' ? 'green' : status === 'failed' ? 'red' : 'blue';
        return <Tag color={color}>{status ? status.toUpperCase() : 'UNKNOWN'}</Tag>;
      },
    },
    {
      title: 'Staged Files',
      dataIndex: 'stagedFiles',
      key: 'stagedFiles',
      render: (files) => (files ? files.length : 0),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, task) => {
        console.log('TaskList: Task data', {
          taskId: task.taskId,
          status: task.status,
          testUrl: task.testUrl,
          stagedFilesCount: task.stagedFiles?.length,
          proposedChangesCount: task.proposedChanges?.length,
          originalContentKeys: task.originalContent ? Object.keys(task.originalContent).length : 0,
          newContentKeys: task.newContent ? Object.keys(task.newContent).length : 0,
          playWrightButtonEnabled: !(!task.testUrl || !['tested', 'pending_approval'].includes(task.status)),
          viewChangesButtonEnabled: !(!task.originalContent || !task.newContent || Object.keys(task.originalContent || {}).length === 0 || Object.keys(task.newContent || {}).length === 0),
          approveDenyButtonEnabled: !(task.status !== 'pending_approval' || !task.proposedChanges || (task.proposedChanges || []).length === 0),
          timestamp: new Date().toISOString(),
        });

        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={() => {
                console.log('TaskList: Test URL generated', { taskId: task.taskId, testUrl: task.testUrl });
                handleTest(task.taskId, task.testUrl);
                showInstructions(task);
              }}
              disabled={!task.testUrl || !['tested', 'pending_approval'].includes(task.status)}
            >
              Run Playwright Test
            </Button>
            <Button
              onClick={() => showDiff(task.taskId)}
              disabled={!task.originalContent || !task.newContent || Object.keys(task.originalContent || {}).length === 0 || Object.keys(task.newContent || {}).length === 0}
            >
              View Changes
            </Button>
            <Button
              type="primary"
              onClick={() => handleApprove(task.taskId)}
              disabled={task.status !== 'pending_approval' || !task.proposedChanges || (task.proposedChanges || []).length === 0}
            >
              Approve
            </Button>
            <Button
              danger
              onClick={() => handleDeny(task.taskId)}
              disabled={task.status !== 'pending_approval' || !task.proposedChanges || (task.proposedChanges || []).length === 0}
            >
              Deny
            </Button>
            <Button
              danger
              onClick={() => handleDelete(task.taskId)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table
        dataSource={validatedTasks}
        columns={columns}
        rowKey="taskId"
        pagination={false}
      />
      <Modal
        title="Test Instructions"
        open={instructionModalOpen}
        onCancel={() => setInstructionModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setInstructionModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedTask?.testInstructions ? (
          <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.testInstructions}</Text>
        ) : (
          <Text>No instructions available</Text>
        )}
      </Modal>
    </>
  );
};

export default TaskList;
