/*
 * File Path: frontend/src/hooks/useLiveFeed.js
 * Purpose: Custom hook for managing live feed state and Socket.IO events in Allur Space Console.
 * How It Works:
 *   - Listens to Socket.IO events (taskUpdate, fileUpdate, backendProposal, priorityUpdate, feedback, socket_test) for real-time updates.
 *   - Maintains live feed state, capped at 50 entries, with color-coded logs.
 *   - Supports debounced search and JSON export for debugging.
 * Mechanics:
 *   - Uses socket.io-client for real-time updates, validates taskId/proposalId.
 *   - Queues events during disconnects, flushes on reconnect with exponential backoff.
 *   - Includes auth token and props for socket.js handshake validation.
 * Dependencies:
 *   - React: useState, useEffect, useRef for state and lifecycle (version 18.3.1).
 *   - socket.io-client: Real-time updates (version 4.8.1).
 *   - antd: App, message for notifications (version 5.24.6).
 *   - moment: Timestamp formatting.
 *   - lodash: Debounced search (version ^4.17.21).
 * Dependents:
 *   - GrokUI.jsx: Renders LiveFeed.jsx with live feed state.
 *   - LiveFeed.jsx: Displays feed entries.
 * Why It’s Here:
 *   - Provides real-time feedback for Sprint 2 task and proposal actions (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized with taskUpdate, fileUpdate, backendProposal events.
 *   - 04/23/2025: Added priorityUpdate, debounced search, JSON export.
 *   - 04/23/2025: Enhanced Socket.IO stability with reconnect handling.
 *   - 04/23/2025: Added stagedFiles persistence debug logs.
 *   - 04/23/2025: Fixed lodash.debounce import error.
 *   - 04/24/2025: Replaced static message with messageApi, wrapped in App, added JWT token.
 *     - Why: Warning: [antd: message] Static function can not consume context, WebSocket failures (User, 04/24/2025).
 *     - How: Used messageApi from props, added App.useApp, included auth: { token } in Socket.IO.
 *   - 05/03/2025: Fixed WebSocket connection failure.
 *     - Why: Failed to connect due to missing props and invalid token (User, 05/03/2025).
 *     - How: Added props (token, setSocketError), queued events on missing token, enhanced handshake error logging, added socket_test handler.
 *     - Test: Run `npm run dev`, navigate to /grok, verify console logs socket_test event, LiveFeed shows taskUpdate and feedback events.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to http://localhost:3000/grok: Verify LiveFeed.jsx shows taskUpdate, fileUpdate, backendProposal, feedback events, capped at 50 entries.
 *   - Submit “Build CRM system”: Confirm blue/yellow logs with stagedFiles details in LiveFeed.
 *   - Stop/restart server: Verify LiveFeed resumes updates, events queued, console logs reconnect attempts.
 *   - Search LiveFeed: Confirm debounced search filters entries.
 *   - Export JSON: Verify feed entries exported with stagedFiles details.
 *   - Check console: Verify no WebSocket errors, socket_test event received.
 * Future Enhancements:
 *   - Add feed filtering by event type (Sprint 4).
 *   - Support persistent feed storage (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed message warning and WebSocket issues with messageApi and token auth (04/24/2025).
 *   - Nate: Fixed WebSocket connection with props and token validation (05/03/2025).
 * Rollback Instructions:
 *   - If LiveFeed fails: Copy useLiveFeed.js.bak to useLiveFeed.js (`copy frontend\src\hooks\useLiveFeed.js.bak frontend\src\hooks\useLiveFeed.js`).
 *   - Verify LiveFeed.jsx updates after rollback.
 */
import { useState, useEffect, useRef } from 'react';
import { App } from 'antd';
import io from 'socket.io-client';
import moment from 'moment';
import debounce from 'lodash/debounce';

const isValidTaskId = (taskId) => {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) console.warn(`useLiveFeed: Invalid taskId: ${taskId || 'missing'}`);
  return isValid;
};

const isValidProposalId = (proposalId) => {
  const isValid = typeof proposalId === 'string' && proposalId.length > 0;
  if (!isValid) console.warn(`useLiveFeed: Invalid proposalId: ${proposalId || 'missing'}`);
  return isValid;
};

const useLiveFeed = ({ messageApi, token }) => {
  const { message } = App.useApp();
  console.log('useLiveFeed: Initializing hook with token:', token ? 'present' : 'missing');
  const [liveFeed, setLiveFeed] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [socketError, setSocketError] = useState(null);
  const socketRef = useRef(null);
  const eventQueue = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const debouncedSearch = debounce((term) => {
    console.log('useLiveFeed: Debounced search with term:', term);
    setSearchTerm(term);
  }, 300);

  useEffect(() => {
    console.log('useLiveFeed: Setting up Socket.IO');
    socketRef.current = io('http://localhost:8888', {
      auth: { token: token || 'fallback-token' }, // Fallback for testing
      query: {
        props: JSON.stringify({
          token: token || 'fallback-token',
          setSocketError: 'function',
        }),
      },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      randomizationFactor: 0.5,
    });

    socketRef.current.on('connect', () => {
      console.log('useLiveFeed: Socket.IO connected');
      reconnectAttemptsRef.current = 0;
      setSocketError(null);
      messageApi.success('Live feed connected');
      // Flush queued events
      eventQueue.current.forEach(event => setLiveFeed(prev => [...prev, event].slice(-50)));
      eventQueue.current = [];
    });

    socketRef.current.on('connect_error', (err) => {
      reconnectAttemptsRef.current += 1;
      const errorMsg = `useLiveFeed: Socket.IO connection error: ${err.message} (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`;
      console.error(errorMsg);
      setSocketError(errorMsg);
      messageApi.error(reconnectAttemptsRef.current < maxReconnectAttempts ? 'Live feed connection lost. Retrying...' : 'Live feed connection failed.');
    });

    socketRef.current.on('socket_test', (data) => {
      console.log('useLiveFeed: Socket.IO test event:', data);
      addEvent({ message: data.message, color: 'default', timestamp: data.timestamp });
    });

    socketRef.current.on('taskUpdate', (data) => {
      console.log('useLiveFeed: taskUpdate received:', data.taskId, 'stagedFiles:', data.stagedFiles);
      if (!isValidTaskId(data.taskId)) {
        addEvent({
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid task update received`,
          color: 'red',
          details: `Task ID: ${data.taskId || 'missing'}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (!socketRef.current.connected || !token) {
        console.log('useLiveFeed: Queuing taskUpdate due to disconnect or missing token');
        eventQueue.current.push(data);
        return;
      }
      addEvent({
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${data.taskId} updated`,
        color: data.logColor || 'default',
        details: JSON.stringify({
          taskId: data.taskId,
          status: data.status,
          files: data.stagedFiles?.map(f => f.path.split(/[\\/]/).pop()) || [],
          stagedFilesCount: data.stagedFiles?.length || 0,
          error: data.error || null,
        }, null, 2),
        timestamp: new Date().toISOString(),
      });
    });

    socketRef.current.on('fileUpdate', ({ taskId, file }) => {
      console.log('useLiveFeed: fileUpdate received:', taskId, file);
      if (!isValidTaskId(taskId)) {
        addEvent({
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid file update received`,
          color: 'red',
          details: `Task ID: ${taskId || 'missing'}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (!socketRef.current.connected || !token) {
        console.log('useLiveFeed: Queuing fileUpdate due to disconnect or missing token');
        eventQueue.current.push({ taskId, file });
        return;
      }
      addEvent({
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - File updated for task ${taskId}`,
        color: 'default',
        details: `File: ${file.split(/[\\/]/).pop()}`,
        timestamp: new Date().toISOString(),
      });
    });

    socketRef.current.on('backendProposal', ({ taskId, proposals }) => {
      console.log('useLiveFeed: backendProposal received:', taskId, proposals.length);
      if (!isValidTaskId(taskId)) {
        addEvent({
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid backend proposal received`,
          color: 'red',
          details: `Task ID: ${taskId || 'missing'}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (!socketRef.current.connected || !token) {
        console.log('useLiveFeed: Queuing backendProposal due to disconnect or missing token');
        eventQueue.current.push({ taskId, proposals });
        return;
      }
      addEvent({
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - New backend proposals for task ${taskId}`,
        color: 'yellow',
        details: `Proposals: ${proposals.map(p => p._id).join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    });

    socketRef.current.on('priorityUpdate', ({ taskId, priority }) => {
      console.log('useLiveFeed: priorityUpdate received:', taskId, priority);
      if (!isValidTaskId(taskId)) {
        addEvent({
          message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid priority update received`,
          color: 'red',
          details: `Task ID: ${taskId || 'missing'}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (!socketRef.current.connected || !token) {
        console.log('useLiveFeed: Queuing priorityUpdate due to disconnect or missing token');
        eventQueue.current.push({ taskId, priority });
        return;
      }
      addEvent({
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Priority updated for task ${taskId}`,
        color: 'default',
        details: `Priority: ${priority}`,
        timestamp: new Date().toISOString(),
      });
    });

    socketRef.current.on('feedback', (data) => {
      console.log('useLiveFeed: feedback received:', data.message);
      if (!socketRef.current.connected || !token) {
        console.log('useLiveFeed: Queuing feedback due to disconnect or missing token');
        eventQueue.current.push(data);
        return;
      }
      addEvent({
        message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - ${data.message}`,
        color: data.color || 'yellow',
        details: data.details || 'User feedback',
        timestamp: data.timestamp,
      });
    });

    return () => {
      console.log('useLiveFeed: Disconnecting Socket.IO');
      socketRef.current.disconnect();
    };
  }, [messageApi, token]);

  const addEvent = (event) => {
    setLiveFeed((prev) => {
      const newFeed = [...prev, event].slice(-50);
      const filtered = filterFeed(newFeed, searchTerm);
      setLiveFeed(newFeed);
      setFilteredFeed(filtered);
      return newFeed;
    });
  };

  const filterFeed = (feed, query) => {
    if (!query) return feed;
    return feed.filter(
      (item) =>
        item.message.toLowerCase().includes(query.toLowerCase()) ||
        (item.details && item.details.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const setFilteredFeed = (feed) => {
    setLiveFeed(feed);
  };

  const exportFeed = () => {
    console.log('useLiveFeed: Exporting feed to JSON');
    const json = JSON.stringify(liveFeed, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live-feed-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    messageApi.success('Live feed exported to JSON');
  };

  return {
    liveFeed,
    filteredFeed: filterFeed(liveFeed, searchTerm),
    searchTerm,
    setSearchTerm: debouncedSearch,
    exportFeed,
    setLiveFeed,
    socketError,
    setSocketError,
  };
};

export default useLiveFeed;
