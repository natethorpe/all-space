/*
 * File Path: frontend/src/hooks/useProposalSocket.js
 * Purpose: Manages Socket.IO connection for backend proposal updates in Allur Space Console, updating proposals in real-time.
 * How It Works:
 *   - Establishes a Socket.IO connection to receive backendProposal events from the backend.
 *   - Updates proposals state with deduplicated events using eventId.
 *   - Uses socketRegistry.js to prevent redundant connections.
 * Dependencies:
 *   - React: useState, useEffect, useRef (version 18.3.1).
 *   - socket.io-client: WebSocket client (version 4.8.1).
 *   - socketRegistry.js: Tracks socket instances.
 *   - logClientError.js: Client-side error logging.
 * Dependents:
 *   - GrokUI.jsx: Uses hook to update proposals in UI.
 * Why It’s Here:
 *   - Enables real-time proposal updates for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized Socket.IO hook for proposal updates.
 *   - 04/25/2025: Added socketRegistry.js to prevent redundant connections.
 *   - 04/29/2025: Fixed WebSocket connection failures and duplicate events.
 *   - 05/08/2025: Aligned with polling transport (Grok).
 *   - 05/04/2025: Enhanced socket initialization debugging (Grok).
 *     - Why: Socket not initialized error in useProposals.js affecting proposal updates (User, 05/04/2025).
 *     - How: Added detailed logging for initialization failures, ensured singleton stability, preserved functionality.
 *     - Test: Load /grok, submit task, verify no socket initialization errors, proposals update in ProposalList.jsx.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Submit "Add MFA to login", verify yellow log in LiveFeed.jsx, no duplicate updates.
 *   - Restart server: Confirm proposals update on reconnect, no WebSocket errors.
 *   - Check browser console: Confirm single connection, no errors via logClientError.
 * Rollback Instructions:
 *   - Revert to useProposalSocket.js.bak (`mv frontend/src/hooks/useProposalSocket.js.bak frontend/src/hooks/useProposalSocket.js`).
 *   - Verify /grok loads (may have socket errors).
 * Future Enhancements:
 *   - Add proposal filtering (Sprint 4).
 *   - Support WebSocket scaling (Sprint 5).
 */

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import socketRegistry from '../utils/socketRegistry';
import { logClientError } from '../utils/logClientError';
import { BASE_URL } from '../config/serverApiConfig';

const useProposalSocket = ({ singletonFlag, setSocketError }) => {
  const [proposals, setProposals] = useState([]);
  const socketRef = useRef(null);
  const seenEvents = useRef(new Set());

  useEffect(() => {
    if (!singletonFlag) {
      console.error('useProposalSocket: Missing singletonFlag', { timestamp: new Date().toISOString() });
      logClientError({
        message: 'Missing singletonFlag',
        context: 'useProposalSocket',
        details: { singletonFlag, timestamp: new Date().toISOString() },
      });
      setSocketError('Missing connection parameters');
      return;
    }

    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const token = auth.token || null;
    if (!token) {
      console.error('useProposalSocket: Missing auth token', { timestamp: new Date().toISOString() });
      logClientError({
        message: 'Missing auth token',
        context: 'useProposalSocket',
        details: { timestamp: new Date().toISOString() },
      });
      setSocketError('Missing auth token');
      return;
    }

    // Log token details
    let tokenPayload = 'unknown';
    try {
      const [, payload] = token.split('.');
      tokenPayload = JSON.parse(atob(payload));
    } catch (err) {
      console.warn('useProposalSocket: Failed to decode token payload', { error: err.message, timestamp: new Date().toISOString() });
    }
    console.log('useProposalSocket: Initializing with token:', {
      token: token.slice(0, 10) + '...',
      payload: tokenPayload,
      singletonFlag,
      timestamp: new Date().toISOString(),
    });

    const socketId = Symbol('useProposalSocket');
    if (socketRegistry.has(socketId)) {
      console.log('useProposalSocket: Socket already registered', { socketId, registrySize: socketRegistry.size });
      return;
    }
    socketRegistry.add(socketId);
    console.log('useProposalSocket: Socket registered', { socketId, registrySize: socketRegistry.size });

    try {
      socketRef.current = io(BASE_URL, {
        auth: { token },
        query: {
          props: JSON.stringify({
            token: token.slice(0, 10) + '...',
            setSocketError: typeof setSocketError === 'function' ? 'function' : 'missing',
            client: navigator.userAgent,
            source: 'useProposalSocket',
            singletonFlag,
          }),
        },
        transports: ['polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 32000,
      });
    } catch (err) {
      console.error('useProposalSocket: Socket.IO initialization error', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      logClientError({
        message: 'Socket.IO initialization error',
        context: 'useProposalSocket',
        details: { error: err.message, stack: err.stack, timestamp: new Date().toISOString() },
      });
      setSocketError('Socket.IO initialization error');
      return;
    }

    socketRef.current.on('connect', () => {
      console.log('useProposalSocket: Polling connected', { socketId: socketRef.current.id });
      setSocketError(null);
      logClientError({
        message: 'Polling connected',
        context: 'useProposalSocket',
        details: { socketId: socketRef.current.id, tokenPayload, timestamp: new Date().toISOString() },
      });
    });

    socketRef.current.on('backendProposal', (data) => {
      const { taskId, proposal, proposals, eventId = proposals ? proposals[0]?.id : proposal?.id } = data;
      if (!eventId || seenEvents.current.has(eventId)) {
        console.log('useProposalSocket: Skipped duplicate backendProposal', { taskId, eventId });
        logClientError({
          message: 'Skipped duplicate backendProposal event',
          context: 'useProposalSocket',
          details: { taskId, eventId, timestamp: new Date().toISOString() },
        });
        return;
      }
      seenEvents.current.add(eventId);

      console.log('useProposalSocket: Processing backendProposal', {
        taskId,
        proposalCount: proposals?.length || proposal ? 1 : 0,
        eventId,
        timestamp: new Date().toISOString(),
      });

      setProposals((prev) => {
        const newProposals = proposals || (proposal ? [proposal] : []);
        const updatedProposals = prev.filter((p) => p.taskId !== taskId);
        return [...updatedProposals, ...newProposals.map((p) => ({ ...p, taskId }))];
      });
    });

    socketRef.current.on('connect_error', (err) => {
      const errorMessage = err.message ? `Socket.IO connect error: ${err.message}` : 'Socket.IO connect error: Unknown error';
      console.error('useProposalSocket: Connection error', {
        error: err.message,
        stack: err.stack,
        tokenPayload,
        timestamp: new Date().toISOString(),
      });
      logClientError({
        message: errorMessage,
        context: 'useProposalSocket',
        details: { stack: err.stack, token: token.slice(0, 10) + '...', tokenPayload, timestamp: new Date().toISOString() },
      });
      setSocketError(errorMessage);
    });

    socketRef.current.on('reconnect_attempt', (attempt) => {
      console.log('useProposalSocket: Reconnection attempt', { attempt, tokenPayload, timestamp: new Date().toISOString() });
      logClientError({
        message: `Reconnection attempt ${attempt}`,
        context: 'useProposalSocket',
        details: { attempt, timestamp: new Date().toISOString() },
      });
    });

    socketRef.current.on('reconnect', (attempt) => {
      console.log('useProposalSocket: Reconnected successfully', { attempt, tokenPayload, timestamp: new Date().toISOString() });
      logClientError({
        message: `Reconnected after ${attempt} attempts`,
        context: 'useProposalSocket',
        details: { attempt, timestamp: new Date().toISOString() },
      });
      setSocketError(null);
    });

    socketRef.current.onAny((event, ...args) => {
      console.log('useProposalSocket: Raw socket event', { event, args, timestamp: new Date().toISOString() });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRegistry.delete(socketId);
        console.log('useProposalSocket: Socket unregistered', { socketId, registrySize: socketRegistry.size });
      }
    };
  }, [singletonFlag, setSocketError]);

  return { proposals, socket: socketRef.current };
};

export default useProposalSocket;
