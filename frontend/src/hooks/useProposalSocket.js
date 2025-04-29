/*
 * File Path: frontend/src/hooks/useProposalSocket.js
 * Purpose: Custom hook for managing Socket.IO events for proposals in Allur Space Console.
 * How It Works:
 *   - Listens to Socket.IO events (backendProposal) for real-time proposal updates.
 *   - Maintains live feed state for proposal events, capped at 50 entries.
 *   - Implements stricter event deduplication using eventId.
 * Mechanics:
 *   - Uses socket.io-client for real-time updates, with exponential backoff reconnection (5s, 10s, 20s, 40s, max 32s, 15 attempts).
 *   - Queues events during disconnects, flushes on reconnect to ensure no events are lost.
 *   - Uses useRef to track connection state and prevent redundant initializations.
 * Dependencies:
 *   - react: useState, useEffect, useRef for state and lifecycle (version 18.3.1).
 *   - socket.io-client: Real-time updates (version 4.8.1).
 *   - antd: App, message for notifications (version 5.24.6).
 *   - moment: Timestamp formatting (version 2.30.1).
 *   - socketRegistry.js: Shared Set for tracking Socket.IO instances.
 * Dependents:
 *   - GrokUI.jsx: Uses hook for proposal live feed updates.
 *   - LiveFeed.jsx: Displays feed entries.
 * Why It’s Here:
 *   - Provides real-time proposal updates for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/24/2025: Added useRef import, JWT token, message in App component.
 *   - 04/25/2025: Fixed setSocketError TypeError, WebSocket closures, redundant initializations.
 *   - 04/25/2025: Added singletonFlag, socketRegistry.js, globalSocketInstance.
 *   - 05/03/2025: Fixed WebSocket connection and singletonFlag errors.
 *   - 05/XX/2025: Enhanced for Sprint 2 Socket.IO stability and deduplication.
 *   - 05/XX/2025: Fixed missing singletonFlag and connection drops.
 *     - Why: Address invalid calls from useProposals.js and WebSocket failures (User, 05/XX/2025).
 *     - How: Added fallback for missing singletonFlag, increased retry delay to 5s, ensured JSON-stringified details.
 *   - 05/XX/2025: Enhanced event deduplication with eventId.
 *   - 05/XX/2025: Fixed connection loop and excessive logging.
 *     - Why: Address repeating "Proposal feed connected" notifications and log spam (User, 05/XX/2025).
 *     - How: Added useRef to track connection state, debounced reconnection attempts, enhanced logging for connection tracing.
 *     - Test: Load /grok, verify single "Proposal feed connected" notification, no excessive logs in console or idurar_db.logs.
 * Test Instructions:
 *   - Run `npm start` (backend) and `npm run dev` (frontend), navigate to /grok: Verify LiveFeed shows backendProposal events, capped at 50 entries, single "Proposal feed connected" notification.
 *   - Submit “Add payroll to EmployeeLog”: Confirm yellow log in LiveFeed with proposal details.
 *   - Stop/restart server: Verify LiveFeed resumes updates, no WebSocket closure errors, no singletonFlag warnings, no duplicate notifications.
 *   - Check browser console: Confirm no “Missing token”, “Missing singletonFlag”, or excessive connection logs, stable socketRegistry size.
 *   - Check idurar_db.logs: Verify backendProposal events and connection logs, no invalid prop logs, minimal connection attempt logs.
 * Future Enhancements:
 *   - Add filtering by proposal type (Sprint 4).
 *   - Support persistent feed storage (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed WebSocket stability and initialization errors (04/24/2025–04/25/2025).
 *   - Nate: Fixed WebSocket and singletonFlag issues with backoff and props (05/03/2025).
 *   - Nate: Enhanced for stability with fallback and JSON details (05/XX/2025).
 *   - Nate: Fixed connection loop and excessive logging with useRef and debouncing (05/XX/2025).
 * Rollback Instructions:
 *   - If Socket.IO fails: Copy useProposalSocket.js.bak to useProposalSocket.js (`mv frontend/src/hooks/useProposalSocket.js.bak frontend/src/hooks/useProposalSocket.js`).
 *   - Verify WebSocket connections and proposal updates work after rollback.
 */
import { useState, useEffect, useRef } from 'react';
import { App } from 'antd';
import io from 'socket.io-client';
import moment from 'moment';
import socketRegistry from '../utils/socketRegistry';
import { logClientError } from '../utils/logClientError';

// Global singleton flag
let globalSocketInstance = null;

const useProposalSocket = ({
  backendProposals = [],
  setBackendProposals = () => {},
  messageApi = null,
  token = null,
  setSocketError = null,
  singletonFlag = null,
} = {}) => {
  const [liveFeed, setLiveFeed] = useState([]);
  const socketRef = useRef(null);
  const eventQueue = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const maxRetries = 15;
  const retryDelay = 5000; // Increased for stability
  const isInitialized = useRef(false); // Use useRef to track initialization state
  const lastConnectionAttempt = useRef(0); // Track last connection attempt timestamp

  // Fallback for messageApi
  const message = messageApi || {
    success: (msg) => console.log(`[Antd Message] Success: ${msg}`),
    error: (msg) => console.error(`[Antd Message] Error: ${msg}`),
  };

  const isValidProposalId = (proposalId) => {
    const isValid = typeof proposalId === 'string' && proposalId.length > 0;
    if (!isValid) {
      console.warn(`useProposalSocket: Invalid proposalId: ${proposalId || 'missing'}`, { timestamp: new Date().toISOString() });
      logClientError('Invalid proposalId', 'useProposalSocket', { proposalId });
    }
    return isValid;
  };

  useEffect(() => {
    console.log('useProposalSocket: Initializing hook with parameters:', {
      token: token ? 'present' : 'missing',
      messageApi: !!messageApi,
      setSocketError: typeof setSocketError,
      singletonFlag: singletonFlag ? 'present' : 'missing',
      timestamp: new Date().toISOString(),
    });

    // Fallback for missing singletonFlag
    if (!singletonFlag) {
      console.warn('useProposalSocket: Missing singletonFlag, using fallback', {
        token: token ? 'present' : 'missing',
        setSocketError: typeof setSocketError,
        stack: new Error().stack,
        timestamp: new Date().toISOString(),
      });
      logClientError('Missing singletonFlag, using fallback', 'useProposalSocket', {
        token: token ? 'present' : 'missing',
        setSocketError: typeof setSocketError,
      });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal feed warning`,
          color: 'yellow',
          details: JSON.stringify({ warning: 'Missing singletonFlag, continuing with fallback' }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      // Skip socket initialization if token is missing
      if (!token) {
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal feed error`,
            color: 'red',
            details: JSON.stringify({ error: 'Missing token, socket initialization skipped' }),
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
        return () => {};
      }
    }

    if (!token || typeof setSocketError !== 'function') {
      console.warn('useProposalSocket: Missing token or invalid setSocketError, will retry on prop update', {
        token: token ? 'present' : 'missing',
        setSocketError: typeof setSocketError,
        stack: new Error().stack,
        timestamp: new Date().toISOString(),
      });
      logClientError('Missing token or invalid setSocketError', 'useProposalSocket', {
        token: token ? 'present' : 'missing',
        setSocketError: typeof setSocketError,
      });
      setLiveFeed((prev) => [
        ...prev,
        {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal feed error`,
          color: 'red',
          details: JSON.stringify({ error: `Invalid parameters: token=${token ? 'present' : 'missing'}, setSocketError=${typeof setSocketError}` }),
          timestamp: new Date().toISOString(),
        },
      ].slice(-50));
      return;
    }

    if (isInitialized.current || globalSocketInstance) {
      console.log('useProposalSocket: Already initialized or global instance exists, skipping setup', { timestamp: new Date().toISOString() });
      return;
    }

    const socketId = Symbol('ProposalSocket');
    socketRegistry.add(socketId);
    console.log('useProposalSocket: Registered socket instance:', socketId, 'Registry size:', socketRegistry.size, {
      timestamp: new Date().toISOString(),
    });

    const connectSocket = (attempt = 1) => {
      const now = Date.now();
      // Debounce connection attempts to prevent rapid reconnection loops
      if (now - lastConnectionAttempt.current < retryDelay) {
        console.log('useProposalSocket: Debouncing connection attempt', {
          attempt,
          lastAttempt: lastConnectionAttempt.current,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      lastConnectionAttempt.current = now;

      console.log('useProposalSocket: Setting up Socket.IO, attempt:', attempt, { timestamp: new Date().toISOString() });
      socketRef.current = io('http://localhost:8888', {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: maxRetries,
        reconnectionDelay: retryDelay,
        reconnectionDelayMax: 32000,
        randomizationFactor: 0.5,
        transports: ['websocket', 'polling'],
        query: {
          props: JSON.stringify({
            token: 'present',
            setSocketError: 'function',
            client: navigator.userAgent,
            source: 'useProposalSocket',
          }),
        },
      });

      globalSocketInstance = socketRef.current;
      isInitialized.current = true;

      socketRef.current.on('connect', () => {
        console.log('useProposalSocket: Socket.IO connected', { timestamp: new Date().toISOString() });
        reconnectAttemptsRef.current = 0;
        if (setSocketError) setSocketError(null);
        message.success('Proposal feed connected');
        eventQueue.current.forEach((event) => setLiveFeed((prev) => [...prev, event].slice(-50)));
        eventQueue.current = [];
      });

      socketRef.current.on('connect_error', (err) => {
        reconnectAttemptsRef.current += 1;
        const errorMsg = `Socket.IO connection error: ${err.message} (Attempt ${reconnectAttemptsRef.current}/${maxRetries})`;
        console.error('useProposalSocket:', errorMsg, { stack: err.stack, client: navigator.userAgent, timestamp: new Date().toISOString() });
        logClientError('Socket.IO connection error', 'useProposalSocket', {
          error: err.message,
          attempt: reconnectAttemptsRef.current,
          maxRetries,
          client: navigator.userAgent,
        });
        if (setSocketError) setSocketError('Proposal feed connection lost. Retrying...');
        message.error('Proposal feed connection lost. Retrying...');
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal feed connection error`,
            color: 'red',
            details: JSON.stringify({ error: errorMsg }),
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('useProposalSocket: Socket.IO disconnected:', reason, { timestamp: new Date().toISOString() });
        logClientError('Socket.IO disconnected', 'useProposalSocket', { reason });
        if (setSocketError) setSocketError(`Proposal feed disconnected: ${reason}`);
        setLiveFeed((prev) => [
          ...prev,
          {
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Proposal feed disconnected`,
            color: 'red',
            details: JSON.stringify({ reason }),
            timestamp: new Date().toISOString(),
          },
        ].slice(-50));
      });

      socketRef.current.on('reconnect', () => {
        console.log('useProposalSocket: Socket.IO reconnected', { timestamp: new Date().toISOString() });
        if (setSocketError) setSocketError(null);
        message.success('Proposal feed reconnected!');
      });

      socketRef.current.on('reconnect_attempt', (attempt) => {
        console.log(`useProposalSocket: Reconnect attempt ${attempt}/${maxRetries}`, { timestamp: new Date().toISOString() });
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('useProposalSocket: Socket.IO reconnection failed after max attempts', { timestamp: new Date().toISOString() });
        logClientError('Socket.IO reconnection failed', 'useProposalSocket', { maxRetries });
        if (setSocketError) setSocketError('Proposal feed connection failed permanently.');
        message.error('Proposal feed connection failed permanently.');
      });

      socketRef.current.on('backendProposal', ({ taskId, proposals, eventId }) => {
        console.log('useProposalSocket: backendProposal received:', { taskId, proposals: proposals?.length, eventId, timestamp: new Date().toISOString() });
        if (!proposals?.length || !taskId) {
          const errorMsg = `Invalid backend proposal received: Task ID: ${taskId || 'missing'}, Proposals: ${proposals?.length || 0}`;
          logClientError('Invalid backend proposal', 'useProposalSocket', { taskId, proposalsLength: proposals?.length || 0 });
          setLiveFeed((prev) => [
            ...prev,
            {
              message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid backend proposal received`,
              color: 'red',
              details: JSON.stringify({ error: errorMsg }),
              timestamp: new Date().toISOString(),
            },
          ].slice(-50));
          return;
        }
        if (!socketRef.current.connected) {
          console.log('useProposalSocket: Queuing backendProposal due to disconnect', { taskId, eventId, timestamp: new Date().toISOString() });
          eventQueue.current.push({
            message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - New backend proposals for task ${taskId}`,
            color: 'yellow',
            details: JSON.stringify({ proposals: proposals.map((p) => p._id).join(', '), taskId }),
            timestamp: new Date().toISOString(),
            eventId,
          });
          return;
        }
        const eventKey = `${taskId}_${proposals.map(p => p._id).join('_')}_${eventId || moment().toISOString()}`;
        if (eventQueue.current.some(e => e.eventId === eventId)) {
          console.log('useProposalSocket: Skipped duplicate backendProposal event:', { eventKey, timestamp: new Date().toISOString() });
          return;
        }
        eventQueue.current.push({
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - New backend proposals for task ${taskId}`,
          color: 'yellow',
          details: JSON.stringify({ proposals: proposals.map((p) => p._id).join(', '), taskId }),
          timestamp: new Date().toISOString(),
          eventId,
        });
        const feedEntry = {
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - New backend proposals for task ${taskId}`,
          color: 'yellow',
          details: JSON.stringify({ proposals: proposals.map((p) => p._id).join(', '), taskId }),
          timestamp: new Date().toISOString(),
          eventId,
        };
        if (typeof feedEntry.message !== 'string' || typeof feedEntry.details !== 'string') {
          console.warn('useProposalSocket: Invalid liveFeed entry, skipping', feedEntry);
          logClientError('Invalid liveFeed entry', 'useProposalSocket', { feedEntry });
          return;
        }
        setLiveFeed((prev) => [
          ...prev,
          feedEntry,
        ].slice(-50));
        setBackendProposals((prev) => [...prev, ...proposals]);
      });
    };

    connectSocket();

    return () => {
      console.log('useProposalSocket: Disconnecting Socket.IO', { timestamp: new Date().toISOString() });
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        globalSocketInstance = null;
        socketRegistry.delete(socketId);
        console.log('useProposalSocket: Unregistered socket instance:', socketId, 'Registry size:', socketRegistry.size, {
          timestamp: new Date().toISOString(),
        });
        isInitialized.current = false;
      }
    };
  }, [messageApi, token, setSocketError, singletonFlag]); // Removed backendProposals, setBackendProposals from dependencies

  return {
    liveFeed,
    setLiveFeed,
  };
};

export default useProposalSocket;
