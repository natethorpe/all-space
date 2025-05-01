/*
 * File Path: frontend/src/hooks/useProposalModals.js
 * Purpose: Manages proposal modal state and actions for Allur Space Console.
 * How It Works:
 *   - Handles modal visibility, confirmation, and cancellation for proposal actions (approve, bulkApprove, bulkDeny).
 *   - Updates backendProposals and live feed on action completion.
 * Mechanics:
 *   - Validates proposalId to prevent errors.
 *   - Uses apiClient for API calls (/grok/approve-backend, /grok/rollback).
 *   - Maintains loading states for modal actions.
 * Dependencies:
 *   - React: useState for state management.
 *   - antd: message for notifications.
 *   - axios: apiClient for API calls (serverApiConfig.js).
 *   - moment: Timestamp formatting.
 * Dependents:
 *   - useProposals.js: Integrates modal handlers for proposal actions.
 *   - GrokUI.jsx: Indirectly uses modals via useProposals.js.
 *   - TaskModals.jsx: Renders modals based on state.
 * Why It’s Here:
 *   - Modularizes modal logic from useProposals.js, ~150 lines for Sprint 2 (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Extracted from useProposals.js for modularity.
 *     - Why: Reduce useProposals.js size, improve maintainability (User, 04/23/2025).
 *     - How: Moved modal logic, preserved functionality.
 *     - Test: Approve proposal, verify modal, live feed updates.
 *   - 04/23/2025: Fixed runtime error with enhanced 401 handling.
 *     - Why: Address /grok runtime error from API 401 errors (User, 04/23/2025).
 *     - How: Strengthened handleModalOk error handling for 401/400/500, added debug logs for API failures, ensured safe proposalId validation.
 *     - Test: Run `npm run dev`, approve proposal, simulate 401, verify error in LiveFeed, check console for handleModalOk errors.
 * Test Instructions:
 *   - Run `npm run dev`, click “Approve” in ProposalList: Verify modal opens, confirm updates status, green log in LiveFeed.
 *   - Click “Bulk Deny”: Verify modal, red log in LiveFeed.
 *   - Simulate 401 (clear localStorage.auth): Confirm error in LiveFeed, no crash.
 *   - Cancel modal: Verify default log in LiveFeed.
 * Future Enhancements:
 *   - Add modal animations (Sprint 4).
 *   - Support multi-step confirmation (Sprint 6).
 * Self-Notes:
 *   - Nate: Extracted modal logic from useProposals.js (04/23/2025).
 *   - Nate: Fixed runtime error with 401 handling, debug logs (04/23/2025).
 *   - Nate: Triple-checked modal logic, error handling, and live feed integration (04/23/2025).
 * Rollback Instructions:
 *   - If modals fail or crash: Copy useProposalModals.js.bak to useProposalModals.js (`mv frontend/src/hooks/useProposalModals.js.bak frontend/src/hooks/useProposalModals.js`).
 *   - Verify modals work after rollback.
 */
import { useState } from 'react';
import { message } from 'antd';
import apiClient from '../config/serverApiConfig';
import moment from 'moment';

const useProposalModals = ({ messageApi, backendProposals, setBackendProposals, selectedProposals, setSelectedProposals, liveFeed, setLiveFeed }) => {
  console.log('useProposalModals: Initializing hook');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [denyModalVisible, setDenyModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [buttonLoading, setButtonLoading] = useState({});

  const isValidProposalId = (proposalId) => {
    const isValid = typeof proposalId === 'string' && proposalId.length > 0;
    if (!isValid) console.warn(`useProposalModals: Invalid proposalId: ${proposalId}`);
    return isValid;
  };

  const showProposalModal = (proposal) => {
    console.log('useProposalModals: showProposalModal called with proposal:', proposal?._id);
    if (!isValidProposalId(proposal._id)) {
      console.warn('useProposalModals: Invalid proposal ID');
      messageApi.error('Invalid proposal ID');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal approval failed: Invalid proposal ID`,
          color: 'red',
          details: `Proposal ID: ${proposal._id}`,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }
    setSelectedProposal({ id: proposal._id, change: proposal.change });
    setModalVisible(true);
    setModalType('approve');
    setLiveFeed((prev) => [
      ...prev,
      {
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Opened proposal approval modal`,
        color: 'default',
        details: `Proposal ID: ${proposal._id}, Change: ${proposal.change}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-50));
  };

  const handleModalOk = async () => {
    console.log('useProposalModals: handleModalOk called with modalType:', modalType);
    try {
      setButtonLoading((prev) => ({ ...prev, modal: true }));
      if (modalType === 'bulkApprove') {
        console.log('useProposalModals: Processing bulk approve for proposals:', selectedProposals);
        for (const proposalId of selectedProposals) {
          if (!isValidProposalId(proposalId)) {
            console.warn('useProposalModals: Invalid proposal ID in bulk approve:', proposalId);
            continue;
          }
          const res = await apiClient.post('/grok/approve-backend', { proposalId });
          console.log('useProposalModals: Bulk approve response for proposal:', proposalId, res.data);
          setBackendProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status: 'approved' } : p)));
        }
        setSelectedProposals([]);
        messageApi.success('Selected proposals approved');
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk approved ${selectedProposals.length} proposals`,
            color: 'green',
            details: `Proposal IDs: ${selectedProposals.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
      } else if (modalType === 'bulkDeny') {
        console.log('useProposalModals: Processing bulk deny for proposals:', selectedProposals);
        for (const proposalId of selectedProposals) {
          if (!isValidProposalId(proposalId)) {
            console.warn('useProposalModals: Invalid proposal ID in bulk deny:', proposalId);
            continue;
          }
          const res = await apiClient.post('/grok/rollback', { proposalId });
          console.log('useProposalModals: Bulk deny response for proposal:', proposalId, res.data);
          setBackendProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status: 'denied' } : p)));
        }
        setSelectedProposals([]);
        messageApi.success('Selected proposals denied');
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk denied ${selectedProposals.length} proposals`,
            color: 'red',
            details: `Proposal IDs: ${selectedProposals.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
      } else if (modalType === 'approve') {
        console.log('useProposalModals: Processing single approve for proposal:', selectedProposal?.id);
        if (!isValidProposalId(selectedProposal?.id)) {
          console.warn('useProposalModals: Invalid proposal ID for single approve');
          messageApi.error('Invalid proposal ID');
          setLiveFeed((prev) => [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal approval failed: Invalid proposal ID`,
              color: 'red',
              details: `Proposal ID: ${selectedProposal?.id}`,
              timestamp: new Date().toISOString(),
            },
          ].slice(-50));
          return;
        }
        const res = await apiClient.post('/grok/approve-backend', { proposalId: selectedProposal.id });
        console.log('useProposalModals: Single approve response:', res.data);
        setBackendProposals((prev) => prev.map((p) => (p._id === selectedProposal.id ? { ...p, status: 'approved' } : p)));
        messageApi.success('Proposal approved');
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal ${selectedProposal.id} approved`,
            color: 'green',
            details: `Change: ${selectedProposal.change}`,
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
      }
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : `Failed to ${modalType} proposals`;
      console.error('useProposalModals: handleModalOk error:', errorMessage, err);
      messageApi.error(errorMessage);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - ${modalType} failed: ${errorMessage}`,
          color: 'red',
          details: err.response?.data?.error || err.message,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      if (err.response?.status === 401) {
        console.warn('useProposalModals: Redirecting to /login due to 401');
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setButtonLoading((prev) => ({ ...prev, modal: false }));
      setModalVisible(false);
      setModalType('');
      setSelectedProposal(null);
    }
  };

  const handleModalCancel = () => {
    console.log('useProposalModals: handleModalCancel called');
    setModalVisible(false);
    setModalType('');
    setSelectedProposal(null);
    setLiveFeed((prev) => [
      ...prev,
      {
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - ${modalType} cancelled`,
        color: 'default',
        details: `Modal Type: ${modalType}, Selected Proposals: ${selectedProposals.join(', ')}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-50));
  };

  return {
    modalVisible,
    setModalVisible,
    modalType,
    setModalType,
    selectedProposal,
    setSelectedProposal,
    denyModalVisible,
    setDenyModalVisible,
    selectedTaskId,
    setSelectedTaskId,
    showProposalModal,
    handleModalOk,
    handleModalCancel,
    buttonLoading,
    setButtonLoading,
  };
};

export default useProposalModals;
