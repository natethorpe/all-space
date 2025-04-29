/*
 * File Path: frontend/src/components/ProposalList.jsx
 * Purpose: Backend proposal table component for Allur Space Console UI, displaying proposals with bulk and individual actions.
 * How It Works:
 *   - Renders a table of backend proposals with columns for selection (Checkbox), task ID, file, change, status, and actions (test, approve, deny).
 *   - Uses Ant Design Table for pagination, Checkbox for bulk selection, and Buttons for actions.
 *   - Calls action handlers from useProposals.js for bulk approve/deny, testing, and individual approval/denial.
 *   - Includes bulk action buttons (Bulk Approve, Bulk Deny) above the table.
 * Dependencies:
 *   - antd: Table, Checkbox, Button, Tag, Space, Icons (CheckOutlined, CloseOutlined, PlayCircleOutlined), Empty for UI components and styling.
 *   - React: Core library for rendering.
 * Dependents:
 *   - GrokUI.jsx: Renders ProposalList within a Card to display backend proposals.
 *   - useProposals.js: Provides backendProposals, selectedProposals, and action handlers (handleBulkApprove, handleBulkDeny, showProposalModal, handleTestProposal, handleDenyProposal).
 * Why It’s Here:
 *   - Modularizes the proposal table UI from GrokUI.jsx, reducing its size by ~100 lines (04/21/2025).
 *   - Supports Sprint 1 backend proposal workflow and Sprint 2 usability by providing an interactive proposal list.
 * Change Log:
 *   - 04/21/2025: Created to modularize GrokUI.jsx proposal table, fully implemented.
 *   - 04/23/2025: Added null checks and debug logs for props.
 *   - 04/25/2025: Added Empty component for empty state.
 *     - Why: Fix empty ProposalList.jsx display (User, 04/25/2025).
 *     - How: Added antd Empty component for zero proposals, strengthened prop validation.
 *     - Test: Run `npm run dev`, navigate to /grok, verify empty state or proposals, check console for props logs.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify ProposalList shows proposals or Empty component with “No proposals available” message.
 *   - Submit "Add payroll to EmployeeLog": Confirm proposals in ProposalList, yellow log in LiveFeed.
 *   - Select proposals, click "Bulk Approve": Verify oldest pending included, status=approved, live feed green log.
 * Future Enhancements:
 *   - Add proposal filtering by status, task ID, or file (Sprint 4).
 *   - Support proposal comments for collaboration (Sprint 6).
 * Self-Notes:
 *   - Nate: Added null checks and debug logs to fix runtime error (04/23/2025).
 *   - Nate: Added Empty component for empty state (04/25/2025).
 */
import React from 'react';
import { Table, Checkbox, Button, Tag, Space, Empty } from 'antd';
import { PlayCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

const ProposalList = ({
  backendProposals = [],
  selectedProposals = [],
  setSelectedProposals = () => console.warn('setSelectedProposals not defined'),
  buttonLoading = {},
  handleBulkApprove = () => console.warn('handleBulkApprove not defined'),
  handleBulkDeny = () => console.warn('handleBulkDeny not defined'),
  showProposalModal = () => console.warn('showProposalModal not defined'),
  handleTestProposal = () => console.warn('handleTestProposal not defined'),
  handleDenyProposal = () => console.warn('handleDenyProposal not defined'),
}) => {
  console.log('ProposalList rendering, props:', {
    backendProposalsLength: backendProposals?.length,
    selectedProposalsLength: selectedProposals?.length,
    buttonLoadingKeys: Object.keys(buttonLoading),
    handleBulkApproveDefined: !!handleBulkApprove,
    handleBulkDenyDefined: !!handleBulkDeny,
    showProposalModalDefined: !!showProposalModal,
    handleTestProposalDefined: !!handleTestProposal,
    handleDenyProposalDefined: !!handleDenyProposal,
  });

  if (!backendProposals || !Array.isArray(backendProposals)) {
    console.warn('ProposalList: backendProposals is not an array:', backendProposals);
    return <Empty description="No proposals available. Submit a task to generate proposals." />;
  }

  if (backendProposals.length === 0) {
    return <Empty description="No proposals available. Submit a task to generate proposals." />;
  }

  const columns = [
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
          disabled={record.status !== 'pending' || !record._id}
        />
      ),
    },
    {
      title: 'Task ID',
      dataIndex: 'taskId',
      key: 'taskId',
      render: (taskId) => taskId || 'N/A',
    },
    {
      title: 'File',
      dataIndex: 'file',
      key: 'file',
      render: (file) => file || 'Unknown',
    },
    {
      title: 'Change',
      dataIndex: 'content',
      key: 'content',
      render: (content) => content || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'approved' ? 'green' : status === 'denied' ? 'red' : 'yellow'}>
          {status || 'Unknown'}
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
                disabled={!record._id}
              >
                Test
              </Button>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => showProposalModal(record)}
                loading={buttonLoading[`approve_proposal_${record._id}`]}
                disabled={!record._id}
              >
                Approve
              </Button>
              <Button
                type="link"
                icon={<CloseOutlined />}
                onClick={() => handleDenyProposal(record._id)}
                loading={buttonLoading[`deny_proposal_${record._id}`]}
                disabled={!record._id}
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
    <>
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
        columns={columns}
        dataSource={backendProposals}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
      />
    </>
  );
};

export default ProposalList;
