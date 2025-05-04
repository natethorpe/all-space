/*
 * File Path: frontend/src/hooks/useProposals.js
 * Purpose: Manages backend proposal state and Socket.IO events for Allur Space Console, updating proposals in real-time.
 * How It Works:
 *   - Uses useLiveFeed.js to listen for backendProposal events from the backend.
 *   - Maintains a state of proposals for display in GrokUI.jsx or other components.
 *   - Logs errors to logClientError.js for debugging.
 * Mechanics:
 *   - Initializes useLiveFeed with singletonFlag, token, and maxEvents to receive backendProposal events.
 *   - Updates proposals state when new backendProposal events are received.
 * Dependencies:
 *   - React: useState, useEffect for state and lifecycle management (version 18.3.1).
 *   - useLiveFeed.js: Socket.IO event handling (version 4.8.1).
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - GrokUI.jsx: Uses hook to display proposals alongside tasks.
 * Why It’s Here:
 *   - Enables real-time proposal updates for Sprint 2, enhancing visibility into backend changes (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized proposal management hook (Nate).
 *   - 05/08/2025: Fixed singletonFlag destructuring error (Grok).
 *   - 05/08/2025: Handled undefined parameters and added debugging (Grok).
 *   - 05/08/2025: Removed approveProposal/rollbackProposal expectations (Grok).
 *   - 05/08/2025: Aligned with polling transport and enhanced socket error handling (Grok).
 *   - 05/04/2025: Enhanced socket initialization debugging (Grok).
 *     - Why: Socket not initialized error (User, 05/04/2025).
 *     - How: Added detailed logging for socket initialization failure, ensured token validation, preserved functionality.
 *     - Test: Load /grok, submit task, verify no socket initialization errors, proposals update in ProposalList.jsx.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit a task via TaskInput.jsx (e.g., "Build CRM system").
 *   - Verify no TypeError or socket errors, proposals update in GrokUI.jsx on backendProposal events.
 *   - Check console for 'useProposals: Processing backendProposal' logs.
 *   - Restart backend server, verify proposals update on reconnect, no WebSocket errors.
 * Rollback Instructions:
 *   - Revert to useProposals.js.bak (`mv frontend/src/hooks/useProposals.js.bak frontend/src/hooks/useProposals.js`).
 *   - Verify /grok loads (may have socket errors).
 * Future Enhancements:
 *   - Add proposal filtering by taskId (Sprint 4).
 *   - Support proposal approval UI (Sprint 5).
 *   - Integrate ALL Token rewards for proposal actions (Sprint 3).
 */

import { useState, useEffect } from 'react';
import useLiveFeed from './useLiveFeed';
import { logClientError } from '../utils/logClientError';

const useProposals = (params = {}) => {
  const { token: providedToken, messageApi } = params;
  const [proposals, setProposals] = useState([]);

  // Fallback token from localStorage
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const token = providedToken || auth.token || 'mock-token';

  // Debug parameter input
  console.log('useProposals: Initializing with params', {
    providedToken: providedToken ? 'present' : 'missing',
    messageApi: !!messageApi,
    tokenUsed: token.slice(0, 10) + '...',
    timestamp: new Date().toISOString(),
  });

  // Validate parameters
  if (!token || typeof token !== 'string') {
    const errorMessage = 'Missing or invalid token';
    console.error('useProposals: Initialization failed', { errorMessage, timestamp: new Date().toISOString() });
    logClientError({
      message: errorMessage,
      context: 'useProposals',
      details: { token: token ? 'present' : 'missing', timestamp: new Date().toISOString() },
    });
    if (messageApi) {
      messageApi.error(errorMessage);
    }
    return { proposals: [] };
  }

  // Initialize useLiveFeed with correct parameters
  const { feed, socket } = useLiveFeed({
    singletonFlag: 'proposals',
    token,
    maxEvents: 100,
  });

  useEffect(() => {
    if (!socket) {
      console.warn('useProposals: Socket not initialized', {
        singletonFlag: 'proposals',
        token: token.slice(0, 10) + '...',
        timestamp: new Date().toISOString(),
      });
      if (messageApi) {
        messageApi.error('Failed to initialize proposal socket');
      }
      logClientError({
        message: 'Socket not initialized',
        context: 'useProposals',
        details: {
          singletonFlag: 'proposals',
          token: token ? 'present' : 'missing',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    console.log('useProposals: Socket initialized', {
      socketId: socket.id || 'pending',
      connected: socket.connected,
      timestamp: new Date().toISOString(),
    });

    const handleBackendProposal = (data) => {
      console.log('useProposals: Processing backendProposal', {
        taskId: data.taskId,
        proposalCount: data.proposals?.length || data.proposal ? 1 : 0,
        eventId: data.eventId,
        timestamp: new Date().toISOString(),
      });

      if (!data.taskId) {
        console.warn('useProposals: Invalid backendProposal event', { data });
        logClientError({
          message: 'Invalid backendProposal event: missing taskId',
          context: 'useProposals',
          details: { data, timestamp: new Date().toISOString() },
        });
        return;
      }

      if (data.proposals) {
        // Handle multiple proposals
        setProposals((prev) => [
          ...data.proposals.map((proposal) => ({
            id: proposal.id,
            taskId: data.taskId,
            file: proposal.file,
            content: proposal.content,
            status: proposal.status,
            description: proposal.description,
          })),
          ...prev,
        ]);
      } else if (data.proposal) {
        // Handle single proposal
        setProposals((prev) => [
          {
            id: data.proposal.id,
            taskId: data.taskId,
            file: data.proposal.file,
            content: data.proposal.content,
            status: data.proposal.status,
            description: data.proposal.description,
          },
          ...prev,
        ]);
      }
    };

    socket.on('backendProposal', handleBackendProposal);

    return () => {
      socket.off('backendProposal', handleBackendProposal);
      console.log('useProposals: Cleaned up socket listener', { timestamp: new Date().toISOString() });
    };
  }, [socket, messageApi]);

  // Error handling for feed events
  useEffect(() => {
    feed.forEach((event) => {
      if (event.color === 'red') {
        logClientError({
          message: `useProposals: Feed error: ${event.message}`,
          context: 'useProposals',
          details: { event, timestamp: new Date().toISOString() },
        });
        if (messageApi) {
          messageApi.error(event.message);
        }
      }
    });
  }, [feed, messageApi]);

  return { proposals };
};

export default useProposals;
