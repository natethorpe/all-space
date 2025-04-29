/*
 * File Path: frontend/src/hooks/useProposals.js
 * Purpose: Custom hook for managing backend proposal state and actions in Allur Space Console.
 * How It Works:
 *   - Manages proposal state (backendProposals, selectedProposals, loading) and integrates useProposalModals, useProposalSocket, useProposalActions for modularity.
 *   - Fetches proposals on mount, handles real-time updates via Socket.IO.
 * Mechanics:
 *   - Uses apiClient for API calls (/grok/backend-proposals, /approve-backend, /rollback).
 *   - Initializes backendProposals, selectedProposals as arrays to prevent null errors.
 *   - Merges live feeds from useProposalSocket for real-time updates.
 *   - Debounces fetchBackendProposals to prevent rapid API calls.
 * Dependencies:
 *   - React: useState, useEffect, useCallback for state management (version 18.3.1).
 *   - antd: message for notifications (version 5.24.6).
 *   - lodash: debounce for throttling API calls (version 4.17.21).
 *   - useProposalModals.js, useProposalSocket.js, useProposalActions.js: Modular proposal functionality.
 *   - ../config/serverApiConfig: apiClient for API calls.
 * Dependents:
 *   - GrokUI.jsx: Uses hook for proposal UI and actions.
 *   - ProposalList.jsx: Receives proposal state and actions.
 *   - TaskModals.jsx: Uses modal state and handlers.
 * Why It’s Here:
 *   - Centralizes proposal management for Sprint 2, reduced from ~300 lines to ~150 lines by splitting into useProposalModals, useProposalSocket, useProposalActions (04/23/2025).
 * Change Log:
 *   - 04/21/2025: Added error handling, split modal logic to useProposalModals.js.
 *   - 04/23/2025: Fixed runtime error, split Socket.IO and action logic, enhanced 401 handling.
 *   - 05/XX/2025: Fixed missing singletonFlag and token issues.
 *     - Why: Address invalid calls to useProposalSocket.js (User, 05/XX/2025).
 *     - How: Added proper singletonFlag, token, and setSocketError passing, integrated socketError state.
 *   - 05/XX/2025: Enhanced prop validation and debouncing for Sprint 2.
 *     - Why: Prevent excessive API calls and stabilize Socket.IO connections (User, 05/XX/2025).
 *     - How: Added debounce to fetchBackendProposals, strengthened token guard, ensured singletonFlag consistency, reduced state updates.
 *     - Test: Load /grok, verify proposals load, no excessive API calls in console, no singletonFlag errors.
 * Test Instructions:
 *   - Run `npm start` (backend) and `npm run dev` (frontend), navigate to /grok: Verify ProposalList shows proposals, no singletonFlag errors, minimal API call logs.
 *   - Submit "Add payroll to EmployeeLog": Confirm proposals in ProposalList, yellow log in LiveFeed.
 *   - Approve proposal: Verify green log, modal in TaskModals works.
 *   - Simulate 401 (clear localStorage.auth): Confirm error in LiveFeed, no crash.
 *   - Check browser console: Confirm no “Missing singletonFlag”, WebSocket errors, or excessive API call logs.
 *   - Check idurar_db.logs: Verify proposal fetch and socket connection logs, no invalid prop logs, minimal fetch logs.
 * Future Enhancements:
 *   - Add proposal filtering UI (Sprint 4).
 *   - Support proposal prioritization (Sprint 6).
 * Self-Notes:
 *   - Nate: Split modal and Socket.IO logic to useProposalModals.js, useProposalSocket.js (04/21/2025).
 *   - Nate: Fixed runtime error with action split to useProposalActions.js, array initialization, 401 handling (04/23/2025).
 *   - Nate: Fixed singletonFlag and token issues for useProposalSocket.js (05/XX/2025).
 *   - Nate: Added debouncing and enhanced prop validation to prevent API call loops (05/XX/2025).
 * Rollback Instructions:
 *   - If proposals fail to load or UI crashes: Copy useProposals.js.bak to useProposals.js (`mv frontend/src/hooks/useProposals.js.bak frontend/src/hooks/useProposals.js`).
 *   - Verify /grok renders, proposals load after rollback.
 */
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { debounce } from 'lodash';
import useProposalModals from './useProposalModals';
import useProposalSocket from './useProposalSocket';
import useProposalActions from './useProposalActions';
import apiClient from '../config/serverApiConfig';
import { logClientError } from '../utils/logClientError';

const useProposals = ({ messageApi }) => {
  console.log('useProposals: Initializing hook');
  const [backendProposals, setBackendProposals] = useState([]);
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [liveFeed, setLiveFeed] = useState([]);
  const [socketError, setSocketError] = useState(null);

  // Retrieve token from localStorage or context
  const token = localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth')).token : null;

  // Unique singletonFlag for this hook instance
  const singletonFlag = Symbol('useProposals');

  // Validate props for useProposalSocket
  const socketProps = {
    backendProposals,
    setBackendProposals,
    messageApi,
    token: token || null,
    setSocketError,
    singletonFlag,
  };
  console.log('useProposals: useProposalSocket props:', {
    token: token ? 'present' : 'missing',
    messageApi: !!messageApi,
    setSocketError: typeof setSocketError,
    singletonFlag: singletonFlag ? 'present' : 'missing',
  });

  const { liveFeed: socketLiveFeed, setLiveFeed: setSocketLiveFeed } = useProposalSocket(socketProps);

  const {
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
    handleDenyModalOk,
    handleDenyModalCancel,
    buttonLoading: modalLoading,
    setButtonLoading: setModalLoading,
  } = useProposalModals({
    messageApi,
    backendProposals,
    setBackendProposals,
    selectedProposals,
    setSelectedProposals,
    liveFeed,
    setLiveFeed,
  });

  const {
    fetchBackendProposals: fetchBackendProposalsRaw,
    handleBulkApprove,
    handleBulkDeny,
    handleTestProposal,
    handleDenyProposal,
    buttonLoading: actionLoading,
    setButtonLoading: setActionLoading,
  } = useProposalActions({
    messageApi,
    backendProposals,
    setBackendProposals,
    selectedProposals,
    setSelectedProposals,
    liveFeed,
    setLiveFeed,
  });

  // Debounce fetchBackendProposals to prevent rapid API calls
  const fetchBackendProposals = useCallback(
    debounce(async () => {
      if (!token) {
        console.warn('useProposals: Missing token, skipping fetchBackendProposals', { timestamp: new Date().toISOString() });
        logClientError('Missing token, skipping fetchBackendProposals', 'useProposals', { timestamp: new Date().toISOString() });
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${new Date().toISOString()} - Proposal fetch error`,
            color: 'red',
            details: JSON.stringify({ error: 'Authentication token missing' }),
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
        message.error('Please log in to view proposals');
        return;
      }
      setLoadingProposals(true);
      try {
        await fetchBackendProposalsRaw();
      } catch (err) {
        console.error('useProposals: Failed to fetch proposals:', err.message);
        logClientError('Failed to fetch proposals', 'useProposals', { error: err.message });
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${new Date().toISOString()} - Proposal fetch error`,
            color: 'red',
            details: JSON.stringify({ error: err.message }),
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
        message.error('Failed to fetch proposals');
      } finally {
        setLoadingProposals(false);
      }
    }, 1000),
    [token, fetchBackendProposalsRaw]
  );

  useEffect(() => {
    fetchBackendProposals();
  }, [fetchBackendProposals]);

  useEffect(() => {
    setLiveFeed((prev) => [...new Set([...prev, ...socketLiveFeed])].slice(-50));
  }, [socketLiveFeed]);

  return {
    backendProposals,
    setBackendProposals,
    selectedProposals,
    setSelectedProposals,
    loadingProposals,
    socketError,
    fetchBackendProposals,
    handleBulkApprove,
    handleBulkDeny,
    showProposalModal,
    handleTestProposal,
    handleDenyProposal,
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
    handleModalOk,
    handleModalCancel,
    handleDenyModalOk,
    handleDenyModalCancel,
    buttonLoading: { ...modalLoading, ...actionLoading },
    setButtonLoading: (updates) => {
      setModalLoading(updates);
      setActionLoading(updates);
    },
    liveFeed,
    setLiveFeed,
  };
};

export default useProposals;
