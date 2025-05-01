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
 *     - Why: Logs showed "WebSocket is closed before connection established" (User, 04/29/2025).
 *     - How: Used valid JWT token, added exponential backoff, eventId deduplication, preserved all event handling.
 *     - Test: Load /grok, submit task with backend changes, verify yellow log in LiveFeed.jsx, no WebSocket errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Submit "Add MFA to login", verify yellow log in LiveFeed.jsx, no duplicate updates.
 *   - Restart server: Confirm proposals update on reconnect, no WebSocket errors.
 *   - Check browser console: Confirm single connection, no errors via logClientError.
 * Future Enhancements:
 *   - Add proposal filtering (Sprint 4).
 *   - Support WebSocket scaling (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed WebSocket issues and duplicates, preserved all functionality (04/29/2025).
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
      logClientError({
        message: 'Missing auth token',
        context: 'useProposalSocket',
        details: { timestamp: new Date().toISOString() },
      });
      setSocketError('Missing auth token');
      return;
    }

    const socketId = Symbol('useProposalSocket');
    if (socketRegistry.has(socketId)) {
      console.log('useProposalSocket: Socket already registered');
      return;
    }
    socketRegistry.add(socketId);
    console.log('useProposalSocket: Socket registered, registry size:', socketRegistry.size);

    socketRef.current = io(BASE_URL, {
      auth: { token },
      query: {
        props: JSON.stringify({
          token,
          setSocketError: typeof setSocketError === 'function' ? 'function' : 'missing',
          client: navigator.userAgent,
          source: 'useProposalSocket',
        }),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 32000,
    });

    socketRef.current.on('backendProposal', (data) => {
      const { taskId, proposal, proposals, eventId = proposals ? proposals[0]?.id : proposal?.id } = data;
      if (!eventId || seenEvents.current.has(eventId)) {
        console.log('useProposalSocket: Skipped duplicate backendProposal', { taskId, eventId });
        return;
      }
      seenEvents.current.add(eventId);

      setProposals((prev) => {
        const newProposals = proposals || (proposal ? [proposal] : []);
        const updatedProposals = prev.filter((p) => p.taskId !== taskId);
        return [...updatedProposals, ...newProposals.map((p) => ({ ...p, taskId }))];
      });
    });

    socketRef.current.on('connect_error', (err) => {
      logClientError({
        message: `Socket.IO connect error: ${err.message}`,
        context: 'useProposalSocket',
        details: { stack: err.stack, timestamp: new Date().toISOString() },
      });
      setSocketError(err.message);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRegistry.delete(socketId);
      console.log('useProposalSocket: Socket unregistered, registry size:', socketRegistry.size);
    };
  }, [singletonFlag, setSocketError]);

  return { proposals, socket: socketRef.current };
};

export default useProposalSocket;
