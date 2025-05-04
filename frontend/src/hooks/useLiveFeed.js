/*
 * File Path: frontend/src/hooks/useLiveFeed.js
 * Purpose: Manages Socket.IO connection for live feed updates in Allur Space Console, displaying real-time task events.
 * How It Works:
 *   - Establishes a single Socket.IO connection to receive taskUpdate and backendProposal events from the backend.
 *   - Maintains a feed of events (up to maxEvents) for display in LiveFeed.jsx.
 *   - Uses socketRegistry.js to prevent redundant connections across components.
 *   - Logs client-side errors to /api/grok/client-error for debugging.
 * Mechanics:
 *   - Initializes Socket.IO with JWT token from localStorage.auth, using polling transport to bypass WebSocket issues.
 *   - Handles taskUpdate and backendProposal events, adding them to the feed with timestamp and color coding.
 *   - Implements reconnection logic with exponential backoff (20s initial, 60s max, infinite attempts).
 *   - Validates singletonFlag and token to ensure proper initialization.
 * Dependencies:
 *   - React: useState, useEffect, useRef for state and lifecycle management (version 18.3.1).
 *   - socket.io-client: WebSocket client for real-time communication (version 4.8.1).
 *   - socketRegistry.js: Tracks socket instances to prevent duplicates.
 *   - logClientError.js: Logs client-side errors to backend.
 *   - serverApiConfig.js: Provides BASE_URL for Socket.IO connection.
 * Dependents:
 *   - GrokUI.jsx: Uses hook to display live feed in LiveFeed.jsx.
 *   - LiveFeed.jsx: Renders feed events.
 * Why It’s Here:
 *   - Provides real-time task event feed for Sprint 2, enhancing user visibility into task progress (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized live feed hook with taskUpdate events (Nate).
 *   - 04/25/2025: Added socketRegistry.js to prevent redundant connections (Nate).
 *   - 04/29/2025: Fixed duplicate event handling and connection stability (Nate).
 *   - 05/03/2025: Added backendProposal event support and enhanced reconnection logic (Nate).
 *   - 05/08/2025: Added singleton pattern to prevent multiple registrations (Grok).
 *   - 05/08/2025: Forced polling transport to bypass WebSocket failures (Grok).
 *   - 05/08/2025: Added type property to events and enhanced logging (Grok).
 *   - 05/04/2025: Enhanced socket initialization debugging (Grok).
 *     - Why: Socket not initialized error in useProposals.js (User, 05/04/2025).
 *     - How: Added detailed logging for initialization failures, ensured singleton stability.
 *     - Test: Load /grok, submit task, verify no socket initialization errors, events render in LiveFeed.jsx.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit a task via TaskInput.jsx (e.g., "Build CRM system").
 *   - Verify single green log in LiveFeed.jsx for task creation, no invalid event errors in console.
 *   - Check console for 'useLiveFeed: Processing taskUpdate' logs with correct status and message.
 *   - Delete a task, confirm single green log for deletion in LiveFeed.jsx.
 *   - Restart backend server, verify feed updates on reconnect, no WebSocket errors.
 *   - Open 10 /grok tabs, confirm single connection log per client in idurar_db.logs, registry size stable at 1.
 * Rollback Instructions:
 *   - Revert to useLiveFeed.js.bak (`mv frontend/src/hooks/useLiveFeed.js.bak frontend/src/hooks/useLiveFeed.js`).
 *   - Verify /grok loads, live feed updates appear without duplicates.
 * Future Enhancements:
 *   - Add event filtering for specific task types (Sprint 4).
 *   - Support WebSocket scaling with Redis (Sprint 5).
 *   - Persist feed events to localStorage for offline recovery (Sprint 6).
 */

import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import socketRegistry from '../utils/socketRegistry';
import { logClientError } from '../utils/logClientError';
import { BASE_URL } from '../config/serverApiConfig';
import { v4 as uuidv4 } from 'uuid';

// Singleton Socket.IO instance
let socketInstance = null;
const socketId = Symbol('useLiveFeed');
let listeners = [];

const initializeSocket = (singletonFlag, token, setSocketError) => {
  if (socketInstance && socketInstance.connected) {
    console.log('useLiveFeed: Using existing socket instance', { socketId: socketInstance.id });
    return socketInstance;
  }

  // Validate inputs
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const validToken = auth.token || token || 'mock-token';
  if (!singletonFlag || !validToken || typeof validToken !== 'string') {
    const errorMessage = 'Missing or invalid singletonFlag or token';
    console.error('useLiveFeed: Initialization failed', {
      singletonFlag,
      token: validToken ? 'present' : 'missing',
      timestamp: new Date().toISOString(),
    });
    logClientError({
      message: errorMessage,
      context: 'useLiveFeed',
      details: { singletonFlag, token: validToken ? 'present' : 'missing', timestamp: new Date().toISOString() },
    });
    setSocketError(errorMessage);
    return null;
  }

  // Log token details
  let tokenPayload = 'unknown';
  try {
    const [, payload] = validToken.split('.');
    tokenPayload = JSON.parse(atob(payload));
  } catch (err) {
    console.warn('useLiveFeed: Failed to decode token payload', { error: err.message, timestamp: new Date().toISOString() });
  }
  console.log('useLiveFeed: Initializing with token:', {
    token: validToken.slice(0, 10) + '...',
    payload: tokenPayload,
    singletonFlag,
    timestamp: new Date().toISOString(),
  });

  // Prevent redundant connections
  if (socketRegistry.has(socketId)) {
    console.log('useLiveFeed: Socket already registered, using existing instance', { registrySize: socketRegistry.size });
    return socketInstance;
  }
  socketRegistry.add(socketId);
  console.log('useLiveFeed: Socket registered', { socketId, registrySize: socketRegistry.size });

  // Initialize Socket.IO
  try {
    socketInstance = io(BASE_URL, {
      auth: { token: validToken },
      query: { source: 'useLiveFeed', singletonFlag },
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 20000,
      reconnectionDelayMax: 60000,
      randomizationFactor: 0.5,
      timeout: 30000,
    });
  } catch (err) {
    console.error('useLiveFeed: Socket.IO initialization error', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    logClientError({
      message: 'Socket.IO initialization error',
      context: 'useLiveFeed',
      details: { error: err.message, stack: err.stack, timestamp: new Date().toISOString() },
    });
    setSocketError('Socket.IO initialization error');
    return null;
  }

  socketInstance.on('connect', () => {
    console.log('useLiveFeed: Polling connected', { socketId: socketInstance.id });
    setSocketError(null);
    logClientError({
      message: 'Polling connected',
      context: 'useLiveFeed',
      details: { socketId: socketInstance.id, tokenPayload, timestamp: new Date().toISOString() },
    });
  });

  socketInstance.on('taskUpdate', (data) => {
    console.log('useLiveFeed: Processing taskUpdate', {
      taskId: data.taskId,
      status: data.status,
      eventId: data.eventId,
      timestamp: new Date().toISOString(),
    });
    if (!data.taskId || !data.status) {
      console.warn('useLiveFeed: Invalid taskUpdate event', { data, timestamp: new Date().toISOString() });
      logClientError({
        message: 'Invalid taskUpdate event: missing taskId or status',
        context: 'useLiveFeed',
        details: { data, timestamp: new Date().toISOString() },
      });
      return;
    }
    const event = {
      id: data.eventId || uuidv4(),
      type: 'taskUpdate',
      message: `Task ${data.taskId} updated to ${data.status}`,
      timestamp: new Date().toISOString(),
      color: data.status === 'failed' ? 'red' : 'green',
      data,
    };
    listeners.forEach((listener) => listener(event));
  });

  socketInstance.on('backendProposal', (data) => {
    console.log('useLiveFeed: Processing backendProposal', {
      taskId: data.taskId,
      proposalCount: data.proposals?.length || data.proposal ? 1 : 0,
      eventId: data.eventId,
      timestamp: new Date().toISOString(),
    });
    if (!data.taskId) {
      console.warn('useLiveFeed: Invalid backendProposal event', { data, timestamp: new Date().toISOString() });
      logClientError({
        message: 'Invalid backendProposal event: missing taskId',
        context: 'useLiveFeed',
        details: { data, timestamp: new Date().toISOString() },
      });
      return;
    }
    const event = {
      id: data.eventId || uuidv4(),
      type: 'backendProposal',
      message: `Proposal created for task ${data.taskId}`,
      timestamp: new Date().toISOString(),
      color: 'blue',
      data,
    };
    listeners.forEach((listener) => listener(event));
  });

  socketInstance.on('connect_error', (err) => {
    const errorMessage = err.message ? `Socket.IO connect error: ${err.message}` : 'Socket.IO connect error: Unknown error';
    console.error('useLiveFeed: Connection error', {
      error: err.message,
      stack: err.stack,
      tokenPayload,
      timestamp: new Date().toISOString(),
    });
    logClientError({
      message: errorMessage,
      context: 'useLiveFeed',
      details: { stack: err.stack, token: validToken.slice(0, 10) + '...', tokenPayload, timestamp: new Date().toISOString() },
    });
    setSocketError(errorMessage);
  });

  socketInstance.on('reconnect_attempt', (attempt) => {
    console.log('useLiveFeed: Reconnection attempt', { attempt, tokenPayload, timestamp: new Date().toISOString() });
    logClientError({
      message: `Reconnection attempt ${attempt}`,
      context: 'useLiveFeed',
      details: { attempt, timestamp: new Date().toISOString() },
    });
  });

  socketInstance.on('reconnect', (attempt) => {
    console.log('useLiveFeed: Reconnected successfully', { attempt, tokenPayload, timestamp: new Date().toISOString() });
    logClientError({
      message: `Reconnected after ${attempt} attempts`,
      context: 'useLiveFeed',
      details: { attempt, timestamp: new Date().toISOString() },
    });
    setSocketError(null);
  });

  socketInstance.onAny((event, ...args) => {
    console.log('useLiveFeed: Raw socket event', { event, args, timestamp: new Date().toISOString() });
  });

  return socketInstance;
};

const useLiveFeed = ({ singletonFlag, token, maxEvents = 100 }) => {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    const socket = initializeSocket(singletonFlag, token, (error) => {
      if (error && typeof error === 'string') {
        setFeed((prev) => [
          {
            id: uuidv4(),
            message: error,
            timestamp: new Date().toISOString(),
            color: 'red',
            type: 'error',
            data: { error },
          },
          ...prev.slice(0, maxEvents - 1),
        ]);
      }
    });
    if (!socket) {
      console.warn('useLiveFeed: Socket initialization failed, returning empty feed', {
        singletonFlag,
        token: token ? 'present' : 'missing',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updateFeed = (event) => {
      setFeed((prev) => [event, ...prev.slice(0, maxEvents - 1)]);
    };

    listeners.push(updateFeed);

    return () => {
      listeners = listeners.filter((listener) => listener !== updateFeed);
      if (listeners.length === 0 && socketInstance) {
        socketInstance.disconnect();
        socketRegistry.delete(socketId);
        socketInstance = null;
        console.log('useLiveFeed: Socket unregistered', { socketId, registrySize: socketRegistry.size });
      }
    };
  }, [singletonFlag, token, maxEvents]);

  return { feed, socket: socketInstance };
};

export default useLiveFeed;
