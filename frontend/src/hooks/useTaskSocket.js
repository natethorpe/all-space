/*
 * File Path: frontend/src/hooks/useTaskSocket.js
 * Purpose: Manages Socket.IO connection for task updates in Allur Space Console, updating task state in real-time.
 * How It Works:
 *   - Establishes a single Socket.IO connection to receive taskUpdate events from the backend, updating tasks state in real-time.
 *   - Deduplicates events using eventId to prevent duplicate UI updates.
 *   - Acknowledges events via callbacks to ensure reliable delivery and prevent race conditions.
 *   - Uses socketRegistry.js to track connection instance.
 *   - Logs client-side errors to /api/grok/client-error for debugging.
 * Mechanics:
 *   - Initializes Socket.IO with JWT token from localStorage.auth, using polling transport to bypass WebSocket issues.
 *   - Handles taskUpdate events, updating tasks state with status, files, and errors.
 *   - Implements exponential backoff for reconnection (20s initial, 60s max, infinite attempts).
 *   - Validates token to ensure proper initialization.
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
 *   - 05/07/2025: Fixed WebSocket connection failure (Grok).
 *   - 05/08/2025: Enhanced WebSocket debugging with token details (Grok).
 *   - 05/08/2025: Simplified query params and added raw event logging (Grok).
 *   - 05/08/2025: Ensured full task data in taskUpdate events (Grok).
 *   - 05/08/2025: Enhanced event logging for task state sync (Grok).
 *   - 05/08/2025: Fixed missing pending_approval and task data (Grok).
 *   - 05/08/2025: Fixed incomplete task data sync (Grok).
 *   - 05/08/2025: Moved to singleton module to prevent multiple registrations (Grok).
 *   - 05/08/2025: Reinforced singleton and WebSocket stability (Grok).
 *   - 05/08/2025: Forced polling transport to bypass WebSocket failures (Grok).
 *   - 05/04/2025: Enhanced socket initialization debugging (Grok).
 *     - Why: Socket not initialized error in useProposals.js affecting task updates (User, 05/04/2025).
 *     - How: Added detailed logging for initialization failures, ensured singleton stability.
 *     - Test: Load /grok, submit task, verify no socket initialization errors, tasks update in TaskList.jsx.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit a task via TaskInput.jsx (e.g., "Build CRM system").
 *   - Verify single green log in LiveFeed.jsx for task creation, no WebSocket errors in console.
 *   - Check console for 'useTaskSocket: Processing taskUpdate' logs with correct status/testUrl/stagedFiles/proposedChanges/originalContent/newContent.
 *   - Delete a task, confirm single green log for deletion in LiveFeed.jsx.
 *   - Restart backend server, verify tasks update on reconnect, no WebSocket errors.
 *   - Open 10 /grok tabs, confirm single connection log per client in idurar_db.logs, registry size stable at 1.
 * Rollback Instructions:
 *   - Revert to useTaskSocket.js.bak (`mv frontend/src/hooks/useTaskSocket.js.bak frontend/src/hooks/useTaskSocket.js`).
 *   - Verify /grok loads, task updates appear in LiveFeed.jsx without duplicates.
 * Future Enhancements:
 *   - Add event filtering for specific task types (Sprint 4).
 *   - Support WebSocket scaling with Redis (Sprint 5).
 *   - Persist task updates to localStorage for offline recovery (Sprint 6).
 */

import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import socketRegistry from '../utils/socketRegistry';
import { logClientError } from '../utils/logClientError';
import { BASE_URL } from '../config/serverApiConfig';

// Singleton Socket.IO instance
let socketInstance = null;
const socketId = Symbol('useTaskSocket');
const seenEvents = new Set();
let listeners = [];

const initializeSocket = (token, setSocketError) => {
  if (socketInstance && socketInstance.connected) {
    console.log('useTaskSocket: Using existing socket instance', { socketId: socketInstance.id });
    return socketInstance;
  }

  // Validate inputs
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  const validToken = auth.token || token || 'mock-token';
  if (!validToken || typeof validToken !== 'string') {
    const errorMessage = 'Missing or invalid token';
    console.error('useTaskSocket: Initialization failed', {
      token: validToken ? 'present' : 'missing',
      timestamp: new Date().toISOString(),
    });
    logClientError({
      message: errorMessage,
      context: 'useTaskSocket',
      details: { token: validToken ? 'present' : 'missing', timestamp: new Date().toISOString() },
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
    console.warn('useTaskSocket: Failed to decode token payload', {
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
  console.log('useTaskSocket: Initializing with token:', {
    token: validToken.slice(0, 10) + '...',
    payload: tokenPayload,
    timestamp: new Date().toISOString(),
  });

  // Prevent redundant connections
  if (socketRegistry.has(socketId)) {
    console.log('useTaskSocket: Socket already registered, using existing instance', {
      registrySize: socketRegistry.size,
    });
    return socketInstance;
  }
  socketRegistry.add(socketId);
  console.log('useTaskSocket: Socket registered', { socketId, registrySize: socketRegistry.size });

  // Initialize Socket.IO
  try {
    socketInstance = io(BASE_URL, {
      auth: { token: validToken },
      query: { source: 'useTaskSocket' },
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 20000,
      reconnectionDelayMax: 60000,
      randomizationFactor: 0.5,
      timeout: 30000,
    });
  } catch (err) {
    console.error('useTaskSocket: Socket.IO initialization error', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    logClientError({
      message: 'Socket.IO initialization error',
      context: 'useTaskSocket',
      details: { error: err.message, stack: err.stack, timestamp: new Date().toISOString() },
    });
    setSocketError('Socket.IO initialization error');
    return null;
  }

  socketInstance.on('connect', () => {
    console.log('useTaskSocket: Polling connected', { socketId: socketInstance.id });
    setSocketError(null);
    logClientError({
      message: 'Polling connected',
      context: 'useTaskSocket',
      details: { socketId: socketInstance.id, tokenPayload, timestamp: new Date().toISOString() },
    });
  });

  socketInstance.on('taskUpdate', (data, callback) => {
    console.log('useTaskSocket: Raw taskUpdate event', { data });
    const {
      taskId,
      status,
      files,
      stagedFiles,
      stagedFilesCount,
      error,
      eventId,
      testUrl,
      testInstructions,
      proposedChanges,
      originalContent,
      newContent,
      message,
      logColor,
    } = data;
    if (!eventId || seenEvents.has(eventId)) {
      console.log('useTaskSocket: Skipped duplicate taskUpdate', { taskId, eventId });
      logClientError({
        message: 'Skipped duplicate taskUpdate event',
        context: 'useTaskSocket',
        details: { taskId, eventId, status, timestamp: new Date().toISOString() },
      });
      return;
    }
    seenEvents.add(eventId);

    console.log('useTaskSocket: Processing taskUpdate', {
      taskId,
      status,
      testUrl,
      stagedFilesCount: stagedFiles?.length || stagedFilesCount,
      proposedChangesCount: proposedChanges?.length,
      originalContentKeys: originalContent ? Object.keys(originalContent).length : 0,
      newContentKeys: newContent ? Object.keys(newContent).length : 0,
      eventId,
      timestamp: new Date().toISOString(),
    });

    const updatedTask = {
      taskId,
      status,
      files: files || [],
      stagedFiles: stagedFiles || [],
      stagedFilesCount: stagedFiles?.length || stagedFilesCount || 0,
      error,
      testUrl,
      testInstructions,
      proposedChanges: proposedChanges || [],
      originalContent: originalContent || {},
      newContent: newContent || {},
      message,
      logColor,
    };

    listeners.forEach((listener) => {
      listener(updatedTask);
    });

    if (callback && typeof callback === 'function') {
      callback(true);
      console.log('useTaskSocket: Acknowledged taskUpdate', { taskId, eventId });
    }
  });

  socketInstance.on('connect_error', (err) => {
    const errorMessage = err.message ? `Socket.IO connect error: ${err.message}` : 'Socket.IO connect error: Unknown error';
    console.error('useTaskSocket: Connection error', {
      error: err.message,
      stack: err.stack,
      tokenPayload,
      timestamp: new Date().toISOString(),
    });
    logClientError({
      message: errorMessage,
      context: 'useTaskSocket',
      details: { stack: err.stack, token: validToken.slice(0, 10) + '...', tokenPayload, timestamp: new Date().toISOString() },
    });
    setSocketError(errorMessage);
  });

  socketInstance.on('reconnect_attempt', (attempt) => {
    console.log('useTaskSocket: Reconnection attempt', { attempt, tokenPayload, timestamp: new Date().toISOString() });
    logClientError({
      message: `Reconnection attempt ${attempt}`,
      context: 'useTaskSocket',
      details: { attempt, timestamp: new Date().toISOString() },
    });
  });

  socketInstance.on('reconnect', (attempt) => {
    console.log('useTaskSocket: Reconnected successfully', { attempt, tokenPayload, timestamp: new Date().toISOString() });
    logClientError({
      message: `Reconnected after ${attempt} attempts`,
      context: 'useTaskSocket',
      details: { attempt, timestamp: new Date().toISOString() },
    });
    setSocketError(null);
  });

  socketInstance.onAny((event, ...args) => {
    console.log('useTaskSocket: Raw socket event', { event, args, timestamp: new Date().toISOString() });
  });

  return socketInstance;
};

const useTaskSocket = ({ token, setSocketError }) => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const socket = initializeSocket(token, setSocketError);
    if (!socket) {
      console.warn('useTaskSocket: Socket initialization failed', {
        token: token ? 'present' : 'missing',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const updateTasks = (updatedTask) => {
      setTasks((prev) => {
        if (updatedTask.status === 'deleted') {
          console.log('useTaskSocket: Task deleted', { taskId: updatedTask.taskId });
          return prev.filter((task) => task.taskId !== updatedTask.taskId);
        }
        const existingTask = prev.find((task) => task.taskId === updatedTask.taskId);
        if (existingTask) {
          console.log('useTaskSocket: Updated existing task', {
            taskId: updatedTask.taskId,
            status: updatedTask.status,
            testUrl: updatedTask.testUrl,
            stagedFilesCount: updatedTask.stagedFilesCount,
            proposedChangesCount: updatedTask.proposedChanges.length,
            originalContentKeys: Object.keys(updatedTask.originalContent).length,
            newContentKeys: Object.keys(updatedTask.newContent).length,
            timestamp: new Date().toISOString(),
          });
          return prev.map((task) =>
            task.taskId === updatedTask.taskId ? { ...task, ...updatedTask } : task
          );
        }
        console.log('useTaskSocket: Added new task', {
          taskId: updatedTask.taskId,
          status: updatedTask.status,
          testUrl: updatedTask.testUrl,
          stagedFilesCount: updatedTask.stagedFilesCount,
          proposedChangesCount: updatedTask.proposedChanges.length,
          originalContentKeys: Object.keys(updatedTask.originalContent).length,
          newContentKeys: Object.keys(updatedTask.newContent).length,
          timestamp: new Date().toISOString(),
        });
        return [updatedTask, ...prev];
      });
    };

    listeners.push(updateTasks);

    return () => {
      listeners = listeners.filter((listener) => listener !== updateTasks);
      if (listeners.length === 0 && socketInstance) {
        socketInstance.disconnect();
        socketRegistry.delete(socketId);
        socketInstance = null;
        console.log('useTaskSocket: Socket unregistered', { socketId, registrySize: socketRegistry.size });
      }
    };
  }, [token, setSocketError]);

  return { tasks, socket: socketInstance };
};

export default useTaskSocket;
