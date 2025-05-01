/*
 * File Path: frontend/src/hooks/useProposals.js
 * Purpose: Manages backend proposal state and actions for Allur Space Console, handling real-time updates and API interactions.
 * How It Works:
 *   - Uses useLiveFeed.js to receive backendProposal events via Socket.IO.
 *   - Provides functions to approve/rollback proposals via /api/grok/proposal endpoints.
 *   - Logs errors to logClientError.js for debugging.
 * Dependencies:
 *   - React: useState, useEffect, useCallback (version 18.3.1).
 *   - axios: API requests via serverApiConfig.js (version 1.8.4).
 *   - useLiveFeed.js: Provides WebSocket events.
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - GrokUI.jsx: Uses hook for proposal rendering.
 *   - TaskList.jsx: Uses proposal data and actions.
 * Why It’s Here:
 *   - Centralizes proposal management for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized proposal management hook.
 *   - 04/23/2025: Added WebSocket integration with useLiveFeed.js.
 *   - 04/29/2025: Fixed socketLiveFeed not iterable error.
 *     - Why: Logs showed TypeError: socketLiveFeed is not iterable (User, 04/29/2025).
 *     - How: Added fallback for socketLiveFeed, ensured iterable array, preserved all proposal functions.
 *     - Test: Load /grok, submit "Add MFA to login", verify yellow log in LiveFeed.jsx, no iterable errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Submit "Add MFA to login", verify yellow log in LiveFeed.jsx, proposals update.
 *   - Approve/rollback proposal: Confirm task updates, no console errors.
 *   - Check browser console: Confirm no TypeError for socketLiveFeed, logs via logClientError.
 * Future Enhancements:
 *   - Add proposal filtering (Sprint 4).
 *   - Support proposal versioning (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed socketLiveFeed iterable error, preserved all functionality (04/29/2025).
 */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../config/serverApiConfig';
import useLiveFeed from './useLiveFeed';
import { logClientError } from '../utils/logClientError';

const useProposals = () => {
  const { events, socketLiveFeed } = useLiveFeed();
  const [proposals, setProposals] = useState([]);
  const seenEvents = new Set();

  useEffect(() => {
    // Ensure socketLiveFeed is iterable
    const sockets = Array.isArray(socketLiveFeed) ? socketLiveFeed : [];
    sockets.forEach((socket) => {
      if (!socket) {
        logClientError({
          message: 'Socket is undefined in useProposals',
          context: 'useProposals',
          details: { timestamp: new Date().toISOString() },
        });
        return;
      }
      console.log('useProposals: Socket initialized', socket.id);
    });

    events.forEach((event) => {
      if (event.type !== 'backendProposal' || seenEvents.has(event.eventId)) {
        console.log('useProposals: Skipped duplicate or non-proposal event', event.eventId);
        return;
      }
      seenEvents.add(event.eventId);

      const { taskId, proposal, proposals: eventProposals } = event.data;
      setProposals((prev) => {
        const newProposals = eventProposals || (proposal ? [proposal] : []);
        const updatedProposals = prev.filter((p) => p.taskId !== taskId);
        return [...updatedProposals, ...newProposals.map((p) => ({ ...p, taskId }))];
      });
    });
  }, [events, socketLiveFeed]);

  const approveProposal = useCallback(async (taskId, proposalId) => {
    try {
      const response = await apiClient.post('/grok/proposal/approve', { taskId, proposalId });
      if (response.data.success) {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId && p.taskId === taskId ? { ...p, status: 'approved' } : p
          )
        );
      } else {
        throw new Error('Failed to approve proposal');
      }
    } catch (error) {
      logClientError({
        message: `Failed to approve proposal: ${error.message}`,
        context: 'useProposals',
        details: { taskId, proposalId, stack: error.stack, timestamp: new Date().toISOString() },
      });
    }
  }, []);

  const rollbackProposal = useCallback(async (taskId, proposalId) => {
    try {
      const response = await apiClient.post('/grok/proposal/rollback', { taskId, proposalId });
      if (response.data.success) {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId && p.taskId === taskId ? { ...p, status: 'rolled_back' } : p
          )
        );
      } else {
        throw new Error('Failed to rollback proposal');
      }
    } catch (error) {
      logClientError({
        message: `Failed to rollback proposal: ${error.message}`,
        context: 'useProposals',
        details: { taskId, proposalId, stack: error.stack, timestamp: new Date().toISOString() },
      });
    }
  }, []);

  return { proposals, approveProposal, rollbackProposal };
};

export default useProposals;
