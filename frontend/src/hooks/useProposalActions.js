/*
 * File Path: frontend/src/hooks/useProposalActions.js
 * Purpose: Custom hook for handling backend proposal actions in Allur Space Console.
 * How It Works:
 *   - Provides action handlers for fetching, bulk approving/denying, testing, and denying proposals via /grok endpoints.
 *   - Uses apiClient for API calls, manages loading states, and updates live feed.
 *   - Validates taskId and proposalId to prevent errors.
 * Mechanics:
 *   - fetchBackendProposals: Fetches proposals from /grok/backend-proposals, updates state.
 *   - handleBulkApprove: Initiates bulk approval, enforces oldest pending proposal inclusion.
 *   - handleBulkDeny: Initiates bulk denial for selected proposals.
 *   - handleTestProposal: Runs manual Playwright test for a proposal’s task.
 *   - handleDenyProposal: Rolls back a proposal, updates status to denied.
 *   - Maintains live feed capped at 50 entries with color-coded logs.
 * Dependencies:
 *   - React: useState for loading states (version 18.3.1).
 *   - antd: message for user notifications (version 5.24.6).
 *   - axios: apiClient for API calls (serverApiConfig.js).
 *   - moment: Timestamp formatting for live feed entries.
 * Dependents:
 *   - useProposals.js: Uses action handlers for proposal operations, integrates live feed.
 *   - GrokUI.jsx: Indirectly uses actions via useProposals.js.
 *   - ProposalList.jsx: Triggers actions (bulk approve, test, deny) for proposals.
 * Why It’s Here:
 *   - Modularizes action logic from useProposals.js, reducing its size to ~150 lines for Sprint 2 hook splitting (04/23/2025).
 *   - Supports Sprint 2 proposal workflow with reliable API interactions (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created by extracting action logic from useProposals.js.
 *   - 04/25/2025: Enhanced fetchBackendProposals to handle API errors and empty lists.
 *     - Why: Fix 500 errors causing empty ProposalList.jsx (User, 04/25/2025).
 *     - How: Added array validation, detailed error logging, fallback empty state handling.
 *     - Test: Run `npm run dev`, navigate to /grok, verify proposals load or empty state, check console for fetchBackendProposals errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify ProposalList.jsx shows proposals or empty state, console logs fetchBackendProposals.
 *   - Submit “Add payroll to EmployeeLog”: Confirm proposals in ProposalList.jsx, yellow log in LiveFeed.jsx.
 *   - Simulate 500 error (mock /grok/backend-proposals failure): Verify empty state in ProposalList, error in LiveFeed.
 * Future Enhancements:
 *   - Add retry logic for failed API calls (Sprint 4).
 *   - Support proposal prioritization (Sprint 6).
 * Self-Notes:
 *   - Nate: Created to modularize useProposals.js, preserving action functionality (04/23/2025).
 *   - Nate: Enhanced fetchBackendProposals for API error handling, empty list fix (04/25/2025).
 * Rollback Instructions:
 *   - If proposal actions fail or live feed breaks: Delete useProposalActions.js, revert useProposals.js to useProposals.js.bak (`mv frontend/src/hooks/useProposals.js.bak frontend/src/hooks/useProposals.js`).
 *   - Verify ProposalList.jsx actions work and LiveFeed.jsx updates correctly after rollback.
 */
import { useState } from 'react';
import { message } from 'antd';
import apiClient from '../config/serverApiConfig';
import moment from 'moment';

const getBaseName = (filePath) => {
  if (typeof filePath !== 'string' || !filePath) return filePath || 'Unknown';
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

const isValidTaskId = (taskId) => {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) console.warn(`useProposalActions: Invalid taskId: ${taskId || 'missing'}`);
  return isValid;
};

const isValidProposalId = (proposalId) => {
  const isValid = typeof proposalId === 'string' && proposalId.length > 0;
  if (!isValid) console.warn(`useProposalActions: Invalid proposalId: ${proposalId || 'missing'}`);
  return isValid;
};

const useProposalActions = ({ messageApi, backendProposals, setBackendProposals, selectedProposals, setSelectedProposals, liveFeed, setLiveFeed, setModalVisible, setModalType }) => {
  console.log('useProposalActions: Initializing hook');
  const [buttonLoading, setButtonLoading] = useState({});
  const [loadingProposals, setLoadingProposals] = useState(false);

  const fetchBackendProposals = async () => {
    console.log('useProposalActions: fetchBackendProposals called');
    setLoadingProposals(true);
    try {
      const res = await apiClient.get('/grok/backend-proposals');
      if (!Array.isArray(res.data)) {
        throw new Error('Invalid proposal data: Response is not an array');
      }
      console.log('useProposalActions: fetchBackendProposals response:', res.data.length, 'proposals');
      const validProposals = res.data.filter(p => p._id && p.taskId).map(p => ({
        ...p,
        _id: p._id.toString(),
        status: p.status || 'pending',
      }));
      setBackendProposals(validProposals);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Fetched ${validProposals.length} backend proposals`,
          color: 'default',
          details: `Proposal IDs: ${validProposals.map(p => p._id).join(', ')}`,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 500 ? 'Server error: Failed to fetch proposals' : err.message;
      console.error('useProposalActions: fetchBackendProposals error:', errorMessage, err);
      messageApi.error(errorMessage);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Failed to fetch backend proposals`,
          color: 'red',
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleBulkApprove = () => {
    console.log('useProposalActions: handleBulkApprove called with selectedProposals:', selectedProposals.length);
    if (selectedProposals.length === 0) {
      console.warn('useProposalActions: No proposals selected for bulk approve');
      messageApi.error('Select at least one proposal');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk approve failed: No proposals selected`,
          color: 'red',
          details: 'User attempted bulk approve without selections',
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }
    const sortedProposals = [...backendProposals].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const oldestPending = sortedProposals.find((p) => p.status === 'pending');
    if (oldestPending && !selectedProposals.includes(oldestPending._id)) {
      console.warn('useProposalActions: Oldest pending proposal not included', oldestPending._id);
      messageApi.error('Must include oldest pending proposal');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk approve failed: Oldest pending proposal not included`,
          color: 'red',
          details: `Oldest Proposal ID: ${oldestPending._id}`,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }
    setModalVisible(true);
    setModalType('bulkApprove');
    setLiveFeed((prev) => [
      ...prev,
      {
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Initiated bulk approve`,
        color: 'default',
        details: `Selected Proposals: ${selectedProposals.join(', ')}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-50));
  };

  const handleBulkDeny = () => {
    console.log('useProposalActions: handleBulkDeny called with selectedProposals:', selectedProposals.length);
    if (selectedProposals.length === 0) {
      console.warn('useProposalActions: No proposals selected for bulk deny');
      messageApi.error('Select at least one proposal');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Bulk deny failed: No proposals selected`,
          color: 'red',
          details: 'User attempted bulk deny without selections',
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }
    setModalVisible(true);
    setModalType('bulkDeny');
    setLiveFeed((prev) => [
      ...prev,
      {
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Initiated bulk deny`,
        color: 'default',
        details: `Selected Proposals: ${selectedProposals.join(', ')}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-50));
  };

  const handleTestProposal = async (proposalId) => {
    console.log('useProposalActions: handleTestProposal called with proposalId:', proposalId);
    const proposal = backendProposals.find((p) => p._id === proposalId);
    if (!proposal || !isValidTaskId(proposal.taskId)) {
      console.warn('useProposalActions: Invalid proposal or task ID', { proposalId, taskId: proposal?.taskId });
      messageApi.error('Invalid proposal or task ID');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal test failed: Invalid proposal or task ID`,
          color: 'red',
          details: `Proposal ID: ${proposalId}, Task ID: ${proposal?.taskId}`,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }
    try {
      setButtonLoading((prev) => ({ ...prev, [`test_proposal_${proposalId}`]: true }));
      const res = await apiClient.post('/grok/test', { taskId: proposal.taskId, manual: true });
      console.log('useProposalActions: handleTestProposal response:', res.data);
      messageApi.success('Manual test launched for proposal');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Manual test launched for proposal ${proposalId}`,
          color: 'blue',
          details: `Task ID: ${proposal.taskId}, File: ${getBaseName(proposal.file)}`,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to run proposal test';
      console.error('useProposalActions: handleTestProposal error:', errorMessage, err);
      messageApi.error(errorMessage);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal test failed: ${errorMessage}`,
          color: 'red',
          details: err.response?.data?.error || err.message,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`test_proposal_${proposalId}`]: false }));
    }
  };

  const handleDenyProposal = async (proposalId) => {
    console.log('useProposalActions: handleDenyProposal called with proposalId:', proposalId);
    if (!isValidProposalId(proposalId)) {
      console.warn('useProposalActions: Invalid proposal ID', { proposalId });
      messageApi.error('Invalid proposal ID');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal denial failed: Invalid proposal ID`,
          color: 'red',
          details: `Proposal ID: ${proposalId}`,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }
    try {
      setButtonLoading((prev) => ({ ...prev, [`deny_proposal_${proposalId}`]: true }));
      const res = await apiClient.post('/grok/rollback', { proposalId });
      console.log('useProposalActions: handleDenyProposal response:', res.data);
      setBackendProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status: 'denied' } : p)));
      messageApi.success('Proposal denied');
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal ${proposalId} denied`,
          color: 'red',
          details: 'Proposal rolled back via UI',
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } catch (err) {
      const errorMessage = err.response?.status === 401 ? 'Authentication failed: Invalid token' :
                          err.response?.status === 400 ? err.response.data.error : 'Failed to deny proposal';
      console.error('useProposalActions: handleDenyProposal error:', errorMessage, err);
      messageApi.error(errorMessage);
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal denial failed: ${errorMessage}`,
          color: 'red',
          details: err.response?.data?.error || err.message,
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
    } finally {
      setButtonLoading((prev) => ({ ...prev, [`deny_proposal_${proposalId}`]: false }));
    }
  };

  return {
    fetchBackendProposals,
    handleBulkApprove,
    handleBulkDeny,
    handleTestProposal,
    handleDenyProposal,
    buttonLoading,
    setButtonLoading,
    loadingProposals,
  };
};

export default useProposalActions;
