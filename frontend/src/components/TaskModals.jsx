/*
 * File Path: frontend/src/components/TaskModals.jsx
 * Purpose: Modal component for Allur Space Console UI, handling confirmations for task and proposal actions.
 * How It Works:
 *   - Renders Ant Design Modals for clearing tasks, bulk approving/denying proposals, approving individual proposals, and denying tasks.
 *   - Receives modal state (modalVisible, modalType, selectedProposal, etc.) and action handlers (handleModalOk, handleModalCancel, etc.) from useProposals.js, which integrates useProposalModals.js.
 *   - Displays confirmation messages tailored to the action type (e.g., "Are you sure you want to clear all tasks?").
 * Mechanics:
 *   - Modals are conditionally rendered based on modalVisible and denyModalVisible.
 *   - Action handlers trigger API calls via useProposals.js (e.g., /grok/approve-backend, /grok/reject), updating live feed.
 *   - Loading states prevent multiple clicks during API calls, improving UX.
 *   - Titles and messages dynamically reflect modalType (clear, bulkApprove, bulkDeny, approve, deny).
 * Dependencies:
 *   - antd: Modal for confirmation dialogs (version 5.22.2).
 *   - React: Core library for rendering (version 18.3.1).
 * Dependents:
 *   - GrokUI.jsx: Renders TaskModals for action confirmations.
 *   - useProposals.js: Provides modal state and action handlers via useProposalModals.js.
 * Why It’s Here:
 *   - Modularizes modal UI from GrokUI.jsx, reducing its size by ~120 lines (04/21/2025).
 *   - Supports Sprint 1 approval workflow and Sprint 2 usability by ensuring critical actions require user confirmation.
 * Key Info:
 *   - Ensures confirmation for critical actions (e.g., clear tasks, bulk deny) to prevent accidental changes.
 *   - Displays relevant details (e.g., proposal change, task ID) in modal content for clarity.
 *   - Integrates with live feed updates via useProposals.js for action logging.
 * Change Log:
 *   - 04/21/2025: Created to modularize GrokUI.jsx modals, fully implemented.
 *     - Why: Reduce GrokUI.jsx size, improve maintainability (User, 04/21/2025).
 *     - How: Extracted Modal components, used props from useProposals.js, implemented all modal types.
 *     - Test: Trigger clear tasks, bulk approve/deny, approve/deny actions; verify modals open, actions log to live feed.
 *   - 04/23/2025: Updated to align with useProposalModals.js integration in useProposals.js.
 *     - Why: Ensure modal functionality with new hook (User, 04/23/2025).
 *     - How: Verified props compatibility, updated handleModalCancel, handleDenyModalCancel to update combined live feed.
 *     - Test: Open proposal approval modal, confirm/cancel, verify live feed logs.
 * Test Instructions:
 *   - In GrokUI.jsx, trigger "Clear Tasks": Verify modal opens, confirm clears tasks, live feed logs "All tasks cleared".
 *   - Select proposals in ProposalList, click "Bulk Approve": Verify modal opens, confirm approves proposals, live feed logs green "Bulk approved".
 *   - Click "Bulk Deny": Verify modal opens, confirm denies proposals, live feed logs red "Bulk denied".
 *   - Click "Approve" in ProposalList: Verify modal opens with change details, confirm approves proposal, live feed logs green "Proposal approved".
 *   - Click "Deny" in TaskList: Verify modal opens with task ID, confirm denies task, live feed logs red "Task denied".
 *   - Cancel any modal: Verify live feed logs "Operation cancelled" or "Task denial cancelled".
 *   - Check loading states: Confirm buttons disable during API calls, no multiple clicks.
 * Future Enhancements:
 *   - Add modal animations for better UX (Sprint 4).
 *   - Support modal history for undoing actions (Sprint 5).
 *   - Integrate audit logging for modal actions (Sprint 6).
 *   - Add custom modal styling for branding (Sprint 4).
 *   - Support multi-step confirmation for critical actions (e.g., clear tasks) (Sprint 6).
 * Self-Notes:
 *   - Nate: Preserved all modal functionality from original GrokUI.jsx, ensured integration with useProposalModals.js (04/21/2025).
 *   - Nate: Updated cancel handlers to update combined live feed, maintaining real-time feedback (04/23/2025).
 *   - Nate: Triple-checked modal logic for all action types and live feed integration (04/23/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with Allur Space Console goals (04/23/2025).
 */
import React from 'react';
import { Modal } from 'antd';

const TaskModals = ({
  modalVisible,
  modalType,
  selectedProposal,
  selectedProposals,
  denyModalVisible,
  selectedTaskId,
  handleModalOk,
  handleModalCancel,
  handleDenyModalOk,
  handleDenyModalCancel,
  buttonLoading,
}) => (
  <>
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
      okText="Confirm"
      cancelText="Cancel"
    >
      <p>
        {modalType === 'clear' ? 'Are you sure you want to clear all tasks? This action cannot be undone.' :
         modalType === 'bulkApprove' ? `Are you sure you want to approve ${selectedProposals.length} selected proposals?` :
         modalType === 'bulkDeny' ? `Are you sure you want to deny ${selectedProposals.length} selected proposals?` :
         `Are you sure you want to approve the proposal: "${selectedProposal?.change}"?`}
      </p>
    </Modal>
    <Modal
      title="Confirm Task Denial"
      open={denyModalVisible}
      onOk={handleDenyModalOk}
      onCancel={handleDenyModalCancel}
      confirmLoading={buttonLoading.denyModal}
      okText="Confirm"
      cancelText="Cancel"
    >
      <p>Are you sure you want to deny task {selectedTaskId}? This will rollback all changes.</p>
    </Modal>
  </>
);

export default TaskModals;
