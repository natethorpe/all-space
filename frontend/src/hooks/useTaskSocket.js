/*
 * File Path: frontend/src/hooks/useTaskSocket.js
 * Purpose: Manages Socket.IO connection for task updates in Allur Space Console, updating task state in real-time.
 * How It Works:
 *   - Establishes a Socket.IO connection to receive taskUpdate events from the backend, updating tasks state in real-time.
 *   - Deduplicates events using eventId to prevent duplicate UI updates.
 *   - Acknowledges events via callbacks to ensure reliable delivery and prevent race conditions.
 *   - Uses socketRegistry.js to prevent redundant connections across components.
 *   - Logs client-side errors to /api/grok/client-error for debugging.
 * Mechanics:
 *   - Initializes Socket.IO with JWT token from localStorage.auth, supporting websocket and polling transports.
 *   - Handles taskUpdate events, updating tasks state with status, files, and errors.
 *   - Implements exponential backoff for reconnection (5s initial, 32s max, infinite attempts).
 *   - Validates singletonFlag and token to ensure proper initialization.
 * Dependencies:
 *   - React: useState, useEffect, useRef for state and lifecycle management (version 18.3.1).
 *   - socket.io-client: WebSocket client for real-time communication (version 4.8.1).
 *   - socketRegistry.js: Tracks socket instances to prevent duplicates.
 *   - logClientError.js: Logs client-side errors to backend.
 *   - serverApiConfig.js: Provides BASE_URL for Socket.IO connection.
 * Dependents:
 *   - GrokUI.jsx: Uses hook to update tasks in TaskList.jsx.
 *   - TaskList.jsx: Displays updated tasks based on socket events.
 *   - useTasks.js: Complements task state with API-based updates.
 * Why It’s Here:
 *   - Enables real-time task updates for Sprint 2, ensuring a responsive UI for task management (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized Socket.IO hook for task updates (Nate).
 *   - 04/25/2025: Added socketRegistry.js to prevent redundant connections (Nate).
 *   - 04/29/2025: Fixed duplicate taskUpdate events and connection stability (Nate).
 *   - 05/03/2025: Added event acknowledgment and enhanced reconnection logic (Nate).
 *   - 04/30/2025: Fixed WebSocket failures due to invalid token (Grok).
 *     - Why: WebSocket errors with token: "present" (User, 04/30/2025).
 *     - How: Used valid JWT token from localStorage.auth, aligned with useLiveFeed.js.
 *     - Test: Load /grok, submit task, verify no WebSocket errors, single green log.
 *   - 05/07/2025: Fixed WebSocket connection failure (Grok).
 *     - Why: "WebSocket is closed before the connection is established" at line 166 (User, 05/01/2025).
 *     - How: Added polling fallback, stricter token validation, enhanced reconnection logging.
 *     - Test: Load /grok, submit task, verify no WebSocket errors, single green log in LiveFeed.jsx.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit a task via TaskInput.jsx (e.g., "Build CRM system").
 *   - Verify single green log in LiveFeed.jsx for task creation, no WebSocket errors in console.
 *   - Delete a task, confirm single green log for deletion in LiveFeed.jsx.
 *   - Restart backend server, verify tasks update on reconnect, no WebSocket errors.
 *   - Open 10 /grok tabs, confirm stable connections, check idurar_db.logs for single connection log per client.
 * Rollback Instructions:
 *   - Revert to useTaskSocket.js.bak (`mv frontend/src/hooks/useTaskSocket.js.bak frontend/src/hooks/useTaskSocket.js`).
 *   - Verify /grok loads, task updates appear in LiveFeed.jsx without duplicates.
 * Future Enhancements:
 *   - Add event filtering for specific task types (Sprint 4).
 *   - Support WebSocket scaling with Redis (Sprint 5).
 *   - Persist task updates to localStorage for offline recovery (Sprint 6).
 */

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import socketRegistry from '../utils/socketRegistry';
import { logClientError } from '../utils/logClientError';
import { BASE_URL } from '../config/serverApiConfig';

const useTaskSocket = ({ singletonFlag, token, setSocketError }) => {
  const [tasks, setTasks] = useState([]);
  const socketRef = useRef(null);
  const seenEvents = useRef(new Set());

  useEffect(() => {
    // Validate inputs
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const validToken = auth.token || token;
    if (!singletonFlag || !validToken || typeof validToken !== 'string') {
      const errorMessage = 'Missing or invalid singletonFlag or token';
      logClientError({
        message: errorMessage,
        context: 'useTaskSocket',
        details: { singletonFlag, token: validToken ? 'present' : 'missing', timestamp: new Date().toISOString() },
      });
      setSocketError(errorMessage);
      console.error('useTaskSocket: Initialization failed', { singletonFlag, token: validToken ? 'present' : 'missing' });
      return;
    }

    // Prevent redundant connections
    const socketId = Symbol('useTaskSocket');
    if (socketRegistry.has(socketId)) {
      console.log('useTaskSocket: Socket already registered, skipping initialization');
      return;
    }
    socketRegistry.add(socketId);
    console.log('useTaskSocket: Socket registered, registry size:', socketRegistry.size);

    // Initialize Socket.IO with enhanced configuration
    socketRef.current = io(BASE_URL, {
      auth: { token: validToken },
      query: {
        props: JSON.stringify({
          token: validToken,
          setSocketError: typeof setSocketError === 'function' ? 'function' : 'missing',
          client: navigator.userAgent,
          source: 'useTaskSocket',
        }),
      },
      transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 32000,
      randomizationFactor: 0.5,
      timeout: 20000, // Increased timeout for connection
    });

    // Handle taskUpdate events
    socketRef.current.on('taskUpdate', (data, callback) => {
      const { taskId, status, files, stagedFilesCount, error, eventId, testUrl } = data;
      if (!eventId || seenEvents.current.has(eventId)) {
        console.log('useTaskSocket: Skipped duplicate taskUpdate', { taskId, eventId });
        logClientError({
          message: 'Skipped duplicate taskUpdate event',
          context: 'useTaskSocket',
          details: { taskId, eventId, status, timestamp: new Date().toISOString() },
        });
        return;
      }
      seenEvents.current.add(eventId);

      setTasks((prev) => {
        if (status === 'deleted') {
          console.log('useTaskSocket: Task deleted', { taskId, eventId });
          return prev.filter((task) => task.taskId !== taskId);
        }
        const existingTask = prev.find((task) => task.taskId === taskId);
        if (existingTask) {
          console.log('useTaskSocket: Updated existing task', { taskId, status, eventId });
          return prev.map((task) =>
            task.taskId === taskId
              ? { ...task, status, files, stagedFilesCount, error, testUrl }
              : task
          );
        }
        console.log('useTaskSocket: Added new task', { taskId, status, eventId });
        return [{ taskId, status, files, stagedFilesCount, error, testUrl }, ...prev];
      });

      if (callback && typeof callback === 'function') {
        callback(true);
        console.log('useTaskSocket: Acknowledged taskUpdate', { taskId, eventId });
      }
    });

    // Handle connection errors
    socketRef.current.on('connect_error', (err) => {
      const errorMessage = `Socket.IO connect error: ${err.message}`;
      logClientError({
        message: errorMessage,
        context: 'useTaskSocket',
        details: { stack: err.stack, timestamp: new Date().toISOString() },
      });
      setSocketError(errorMessage);
      console.error('useTaskSocket: Connection error', { error: err.message });
    });

    // Log reconnection attempts
    socketRef.current.on('reconnect_attempt', (attempt) => {
      console.log('useTaskSocket: Reconnection attempt', { attempt });
      logClientError({
        message: `Reconnection attempt ${attempt}`,
        context: 'useTaskSocket',
        details: { timestamp: new Date().toISOString() },
      });
    });

    // Log successful reconnection
    socketRef.current.on('reconnect', (attempt) => {
      console.log('useTaskSocket: Reconnected successfully', { attempt });
      logClientError({
        message: `Reconnected after ${attempt} attempts`,
        context: 'useTaskSocket',
        details: { timestamp: new Date().toISOString() },
      });
      setSocketError(null); // Clear error on successful reconnect
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRegistry.delete(socketId);
        console.log('useTaskSocket: Socket unregistered, registry size:', socketRegistry.size);
      }
    };
  }, [singletonFlag, token, setSocketError]);

  return { tasks, socket: socketRef.current };
};

export default useTaskSocket;
