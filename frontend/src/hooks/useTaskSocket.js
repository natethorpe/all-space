/*
          * File Path: frontend/src/hooks/useTaskSocket.js
          * Purpose: Custom hook for handling Socket.IO task events in Allur Space Console.
          * How It Works:
          *   - Listens to Socket.IO events (taskUpdate, priorityUpdate, tasks_fetched, tasks_cleared) from taskManager.js, taskProcessorV18.js, testGenerator.js.
          *   - Updates tasks and live feed in real-time, with reconnection handling and event queuing.
          *   - Validates taskId to prevent errors.
          * Mechanics:
          *   - Uses socket.io-client for real-time updates, with exponential backoff reconnection (5s, 10s, 20s, 40s, max 32s, 15 attempts).
          *   - Queues events during disconnects, flushes on reconnect to ensure no events are lost.
          *   - Maintains live feed capped at 50 entries with color-coded logs (blue, green, red, default).
          *   - Implements stricter event deduplication using eventId.
          * Dependencies:
          *   - React: useState, useEffect, useRef for state and lifecycle management (version 18.3.1).
          *   - socket.io-client: Real-time updates (version 4.8.1).
          *   - antd: App, message for notifications (version 5.24.6).
          *   - moment: Timestamp formatting for live feed entries.
          *   - socketRegistry.js: Shared Set for tracking Socket.IO instances.
          * Dependents:
          *   - useTasks.js: Uses Socket.IO handlers for task updates, integrates live feed.
          *   - GrokUI.jsx: Indirectly receives live feed updates via useTasks.js.
          *   - TaskList.jsx: Displays updated tasks based on socket events.
          * Why It’s Here:
          *   - Modularizes Socket.IO logic from useTasks.js, reducing its size to ~200 lines for Sprint 2 hook splitting (04/23/2025).
          * Change Log:
          *   - 04/23/2025: Created by extracting Socket.IO logic from useTasks.js.
          *   - 04/24/2025: Added JWT token in auth option, used messageApi, wrapped message in App.
          *   - 04/25/2025: Fixed setSocketError TypeError and WebSocket cleanup.
          *   - 04/25/2025: Added retry logic and prop fallbacks for token issues.
          *   - 04/25/2025: Fixed unauthorized calls and WebSocket closure errors.
          *   - 04/25/2025: Fixed 'externals socketRegistry' error with socketRegistry.js module.
          *   - 04/28/2025: Enhanced reconnection delay and missed event logging.
          *   - 04/30/2025: Fixed 400 Bad Request errors by ensuring valid query props.
          *   - 05/03/2025: Fixed WebSocket connection failures.
          *   - 05/XX/2025: Enhanced for Sprint 2 Socket.IO stability and deduplication.
          *   - 05/XX/2025: Fixed connection drops and JSON details issues.
          *     - Why: Address WebSocket failures and invalid JSON in liveFeed (User, 05/XX/2025).
          *     - How: Increased retry delay to 5s, ensured JSON-stringified details, added logClientError.
          *   - 05/XX/2025: Enhanced event deduplication for Sprint 2.
          *     - Why: Prevent duplicate taskUpdate events (User, 05/XX/2025).
          *     - How: Added eventId to deduplication logic, strengthened eventQueue checks, enhanced logging.
          *     - Test: Submit task, verify single taskUpdate event in LiveFeed.jsx, no duplicates in console.
          * Test Instructions:
          *   - Run `npm start` (backend) and `npm run dev` (frontend), navigate to /grok: Verify TaskList.jsx shows tasks, LiveFeed.jsx displays taskUpdate events.
          *   - Submit “Build CRM system” via TaskInput.jsx: Confirm taskUpdate event with blue log, no WebSocket errors.
          *   - Delete task: Confirm single green log in LiveFeed.jsx, no duplicates.
          *   - Stop/restart server: Verify events queue, display on reconnect, no WebSocket or JSON errors, no duplicate events.
          *   - Check idurar_db.logs: Confirm Socket.IO connection logs with valid props, no invalid props warnings, no duplicate event logs.
          * Future Enhancements:
          *   - Add event acknowledgment for reliable delivery (Sprint 4).
          * Self-Notes:
          *   - Nate: Fixed setSocketError TypeError and WebSocket cleanup (04/25/2025).
          *   - Nate: Fixed 400 Bad Request errors with valid query props (04/30/2025).
          *   - Nate: Fixed WebSocket issues with backoff and props (05/03/2025).
          *   - Nate: Enhanced for Socket.IO stability and JSON handling (05/XX/2025).
          *   - Nate: Enhanced event deduplication with eventId (05/XX/2025).
          * Rollback Instructions:
          *   - If Socket.IO fails: Copy useTaskSocket.js.bak to useTaskSocket.js (`mv frontend/src/hooks/useTaskSocket.js.bak frontend/src/hooks/useTaskSocket.js`).
          *   - Verify WebSocket connections and task updates work after rollback.
          */
         import { useState, useEffect, useRef } from 'react';
         import { App } from 'antd';
         import io from 'socket.io-client';
         import moment from 'moment';
         import socketRegistry from '../utils/socketRegistry';
         import { logClientError } from '../utils/logClientError';
         
         let globalTaskSocketInstance = null;
         
         const isValidTaskId = (taskId) => {
           const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
           if (!isValid) {
             console.warn(`useTaskSocket: Invalid taskId: ${taskId || 'missing'}`, { timestamp: new Date().toISOString() });
             logClientError('Invalid taskId', 'useTaskSocket', { taskId });
           }
           return isValid;
         };
         
         const useTaskSocket = ({
           tasks = [],
           setTasks = () => {},
           selectedTask = null,
           setSelectedTask = () => {},
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
           const [isInitialized, setIsInitialized] = useState(false);
           const missedEvents = useRef([]);
         
           // Fallback for messageApi
           const message = messageApi || {
             success: (msg) => console.log(`[Antd Message] Success: ${msg}`),
             error: (msg) => console.error(`[Antd Message] Error: ${msg}`),
           };
         
           useEffect(() => {
             console.log('useTaskSocket: Initializing hook with parameters:', {
               token: token ? 'present' : 'missing',
               messageApi: !!messageApi,
               setSocketError: typeof setSocketError,
               singletonFlag: singletonFlag ? 'present' : 'missing',
               timestamp: new Date().toISOString(),
             });
         
             // Fallback for missing singletonFlag
             if (!singletonFlag) {
               console.warn('useTaskSocket: Missing singletonFlag, using fallback', {
                 token: token ? 'present' : 'missing',
                 setSocketError: typeof setSocketError,
                 stack: new Error().stack,
                 timestamp: new Date().toISOString(),
               });
               logClientError('Missing singletonFlag, using fallback', 'useTaskSocket', {
                 token: token ? 'present' : 'missing',
                 setSocketError: typeof setSocketError,
               });
               setLiveFeed((prev) => [
                 ...prev,
                 {
                   message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task feed warning`,
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
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task feed error`,
                     color: 'red',
                     details: JSON.stringify({ error: 'Missing token, socket initialization skipped' }),
                     timestamp: new Date().toISOString(),
                   },
                 ].slice(-50));
                 return () => {};
               }
             }
         
             if (!token || typeof setSocketError !== 'function') {
               console.warn('useTaskSocket: Missing token or invalid setSocketError, will retry on prop update', {
                 token: token ? 'present' : 'missing',
                 setSocketError: typeof setSocketError,
                 stack: new Error().stack,
                 timestamp: new Date().toISOString(),
               });
               logClientError('Missing token or invalid setSocketError', 'useTaskSocket', {
                 token: token ? 'present' : 'missing',
                 setSocketError: typeof setSocketError,
               });
               setLiveFeed((prev) => [
                 ...prev,
                 {
                   message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task feed error`,
                   color: 'red',
                   details: JSON.stringify({ error: `Invalid parameters: token=${token ? 'present' : 'missing'}, setSocketError=${typeof setSocketError}` }),
                   timestamp: new Date().toISOString(),
                 },
               ].slice(-50));
               return;
             }
         
             if (isInitialized || globalTaskSocketInstance) {
               console.log('useTaskSocket: Already initialized or global instance exists, skipping setup', { timestamp: new Date().toISOString() });
               return;
             }
         
             const socketId = Symbol('TaskSocket');
             socketRegistry.add(socketId);
             console.log('useTaskSocket: Registered socket instance:', socketId, 'Registry size:', socketRegistry.size, {
               timestamp: new Date().toISOString(),
             });
         
             const connectSocket = (attempt = 1) => {
               console.log('useTaskSocket: Setting up Socket.IO, attempt:', attempt, { timestamp: new Date().toISOString() });
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
                     source: 'useTaskSocket',
                   }),
                 },
               });
         
               globalTaskSocketInstance = socketRef.current;
         
               socketRef.current.on('connect', () => {
                 console.log('useTaskSocket: Socket.IO connected', { timestamp: new Date().toISOString() });
                 reconnectAttemptsRef.current = 0;
                 if (setSocketError) setSocketError(null);
                 message.success('Task feed connected');
                 eventQueue.current.forEach(event => setLiveFeed(prev => [...prev, event].slice(-50)));
                 eventQueue.current = [];
                 setIsInitialized(true);
                 if (missedEvents.current.length > 0) {
                   console.warn('useTaskSocket: Processing missed events:', missedEvents.current.length, { timestamp: new Date().toISOString() });
                   missedEvents.current.forEach(event => setLiveFeed(prev => [...prev, {
                     ...event,
                     details: JSON.stringify({ ...JSON.parse(event.details || '{}'), recovered: true }),
                   }].slice(-50)));
                   missedEvents.current = [];
                 }
               });
         
               socketRef.current.on('connect_error', (err) => {
                 reconnectAttemptsRef.current += 1;
                 const errorMsg = `Socket.IO connection error: ${err.message} (Attempt ${reconnectAttemptsRef.current}/${maxRetries})`;
                 console.error('useTaskSocket:', errorMsg, { stack: err.stack, client: navigator.userAgent, timestamp: new Date().toISOString() });
                 logClientError('Socket.IO connection error', 'useTaskSocket', {
                   error: err.message,
                   attempt: reconnectAttemptsRef.current,
                   maxRetries,
                   client: navigator.userAgent,
                 });
                 if (setSocketError) setSocketError('Task feed connection lost. Retrying...');
                 message.error('Task feed connection lost. Retrying...');
                 setLiveFeed((prev) => [
                   ...prev,
                   {
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task feed connection error`,
                     color: 'red',
                     details: JSON.stringify({ error: errorMsg }),
                     timestamp: new Date().toISOString(),
                   },
                 ].slice(-50));
               });
         
               socketRef.current.on('disconnect', (reason) => {
                 console.log('useTaskSocket: Socket.IO disconnected:', reason, { timestamp: new Date().toISOString() });
                 logClientError('Socket.IO disconnected', 'useTaskSocket', { reason });
                 if (setSocketError) setSocketError(`Task feed disconnected: ${reason}`);
                 setLiveFeed((prev) => [
                   ...prev,
                   {
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task feed disconnected`,
                     color: 'red',
                     details: JSON.stringify({ reason }),
                     timestamp: new Date().toISOString(),
                   },
                 ].slice(-50));
               });
         
               socketRef.current.on('reconnect', () => {
                 console.log('useTaskSocket: Socket.IO reconnected', { timestamp: new Date().toISOString() });
                 if (setSocketError) setSocketError(null);
                 message.success('Task feed reconnected!');
               });
         
               socketRef.current.on('reconnect_attempt', (attempt) => {
                 console.log(`useTaskSocket: Reconnect attempt ${attempt}/${maxRetries}`, { timestamp: new Date().toISOString() });
               });
         
               socketRef.current.on('reconnect_failed', () => {
                 console.error('useTaskSocket: Socket.IO reconnection failed after max attempts', { timestamp: new Date().toISOString() });
                 logClientError('Socket.IO reconnection failed', 'useTaskSocket', { maxRetries });
                 if (setSocketError) setSocketError('Task feed connection failed permanently.');
                 message.error('Task feed connection failed permanently.');
               });
         
               socketRef.current.on('taskUpdate', (data) => {
                 if (!isValidTaskId(data.taskId)) {
                   setLiveFeed((prev) => [
                     ...prev,
                     {
                       message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid task update received`,
                       color: 'red',
                       details: JSON.stringify({ taskId: data.taskId || 'missing', error: 'Invalid taskId' }),
                       timestamp: new Date().toISOString(),
                     },
                   ].slice(-50));
                   return;
                 }
                 if (!socketRef.current.connected) {
                   console.log('useTaskSocket: Queuing taskUpdate due to disconnect', { taskId: data.taskId, eventId: data.eventId, timestamp: new Date().toISOString() });
                   eventQueue.current.push(data);
                   missedEvents.current.push({
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${data.taskId} updated`,
                     color: data.logColor || 'default',
                     details: JSON.stringify({
                       taskId: data.taskId,
                       status: data.status,
                       files: data.stagedFiles?.map(f => f.path.split(/[\\/]/).pop()) || [],
                       error: data.error || null,
                     }),
                     timestamp: new Date().toISOString(),
                     eventId: data.eventId,
                   });
                   return;
                 }
                 const eventKey = `${data.taskId}_${data.status}_${data.eventId || moment().toISOString()}`;
                 if (eventQueue.current.some(e => e.eventId === data.eventId)) {
                   console.log('useTaskSocket: Skipped duplicate taskUpdate event:', { eventKey, timestamp: new Date().toISOString() });
                   return;
                 }
                 console.log('useTaskSocket: taskUpdate received:', data, { timestamp: new Date().toISOString() });
                 eventQueue.current.push(data);
                 setTasks((prev) => {
                   const existingTask = prev.find((t) => t.taskId === data.taskId);
                   const updatedTask = {
                     ...existingTask,
                     ...data,
                     prompt: data.prompt || existingTask?.prompt || 'Untitled',
                     stagedFiles: Array.isArray(data.stagedFiles) ? data.stagedFiles : existingTask?.stagedFiles || [],
                     generatedFiles: Array.isArray(data.generatedFiles) ? data.generatedFiles : existingTask?.generatedFiles || [],
                   };
                   return existingTask ? prev.map((t) => t.taskId === data.taskId ? updatedTask : t) : [...prev, updatedTask];
                 });
                 if (selectedTask?.taskId === data.taskId) {
                   setSelectedTask((prev) => ({ ...prev, ...data }));
                 }
                 const feedEntry = {
                   message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Task ${data.taskId} updated`,
                   color: data.logColor || 'default',
                   details: JSON.stringify({
                     taskId: data.taskId,
                     status: data.status,
                     files: data.stagedFiles?.map(f => f.path.split(/[\\/]/).pop()) || [],
                     error: data.error || null,
                   }),
                   timestamp: new Date().toISOString(),
                   eventId: data.eventId,
                 };
                 if (typeof feedEntry.message !== 'string' || typeof feedEntry.details !== 'string') {
                   console.warn('useTaskSocket: Invalid liveFeed entry, skipping', feedEntry);
                   logClientError('Invalid liveFeed entry', 'useTaskSocket', { feedEntry });
                   return;
                 }
                 setLiveFeed((prev) => [
                   ...prev,
                   feedEntry,
                 ].slice(-50));
               });
         
               socketRef.current.on('priorityUpdate', ({ taskId, priority, eventId }) => {
                 if (!isValidTaskId(taskId)) {
                   setLiveFeed((prev) => [
                     ...prev,
                     {
                       message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Invalid priority update received`,
                       color: 'red',
                       details: JSON.stringify({ taskId: taskId || 'missing', error: 'Invalid taskId' }),
                       timestamp: new Date().toISOString(),
                     },
                   ].slice(-50));
                   return;
                 }
                 if (!socketRef.current.connected) {
                   console.log('useTaskSocket: Queuing priorityUpdate due to disconnect', { taskId, eventId, timestamp: new Date().toISOString() });
                   eventQueue.current.push({ taskId, priority, eventId });
                   missedEvents.current.push({
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Priority updated for task ${taskId}`,
                     color: 'default',
                     details: JSON.stringify({ priority }),
                     timestamp: new Date().toISOString(),
                     eventId,
                   });
                   return;
                 }
                 const eventKey = `${taskId}_priority_${eventId || moment().toISOString()}`;
                 if (eventQueue.current.some(e => e.eventId === eventId)) {
                   console.log('useTaskSocket: Skipped duplicate priorityUpdate event:', { eventKey, timestamp: new Date().toISOString() });
                   return;
                 }
                 console.log('useTaskSocket: priorityUpdate received:', { taskId, priority, eventId }, { timestamp: new Date().toISOString() });
                 eventQueue.current.push({ taskId, priority, eventId });
                 setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, priority } : t)));
                 const feedEntry = {
                   message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Priority updated for task ${taskId}`,
                   color: 'default',
                   details: JSON.stringify({ priority }),
                   timestamp: new Date().toISOString(),
                   eventId,
                 };
                 if (typeof feedEntry.message !== 'string' || typeof feedEntry.details !== 'string') {
                   console.warn('useTaskSocket: Invalid liveFeed entry, skipping', feedEntry);
                   logClientError('Invalid liveFeed entry', 'useTaskSocket', { feedEntry });
                   return;
                 }
                 setLiveFeed((prev) => [
                   ...prev,
                   feedEntry,
                 ].slice(-50));
               });
         
               socketRef.current.on('tasks_fetched', ({ tasks, eventId }) => {
                 console.log('useTaskSocket: tasks_fetched received:', tasks.length, { eventId, timestamp: new Date().toISOString() });
                 if (!socketRef.current.connected) {
                   console.log('useTaskSocket: Queuing tasks_fetched due to disconnect', { eventId, timestamp: new Date().toISOString() });
                   eventQueue.current.push({ tasks, eventId });
                   missedEvents.current.push({
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Fetched ${tasks.length} tasks`,
                     color: 'default',
                     details: JSON.stringify({ taskIds: tasks.map(t => t.taskId).join(', ') }),
                     timestamp: new Date().toISOString(),
                     eventId,
                   });
                   return;
                 }
                 const eventKey = `tasks_fetched_${eventId || moment().toISOString()}`;
                 if (eventQueue.current.some(e => e.eventId === eventId)) {
                   console.log('useTaskSocket: Skipped duplicate tasks_fetched event:', { eventKey, timestamp: new Date().toISOString() });
                   return;
                 }
                 eventQueue.current.push({ tasks, eventId });
                 setTasks(tasks.map(t => ({
                   ...t,
                   prompt: t.prompt || 'Untitled',
                   stagedFiles: Array.isArray(t.stagedFiles) ? t.stagedFiles : [],
                   generatedFiles: Array.isArray(t.generatedFiles) ? t.generatedFiles : [],
                 })));
                 const feedEntry = {
                   message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - Fetched ${tasks.length} tasks`,
                   color: 'default',
                   details: JSON.stringify({ taskIds: tasks.map(t => t.taskId).join(', ') }),
                   timestamp: new Date().toISOString(),
                   eventId,
                 };
                 if (typeof feedEntry.message !== 'string' || typeof feedEntry.details !== 'string') {
                   console.warn('useTaskSocket: Invalid liveFeed entry, skipping', feedEntry);
                   logClientError('Invalid liveFeed entry', 'useTaskSocket', { feedEntry });
                   return;
                 }
                 setLiveFeed((prev) => [
                   ...prev,
                   feedEntry,
                 ].slice(-50));
               });
         
               socketRef.current.on('tasks_cleared', ({ eventId }) => {
                 console.log('useTaskSocket: tasks_cleared received', { eventId, timestamp: new Date().toISOString() });
                 if (!socketRef.current.connected) {
                   console.log('useTaskSocket: Queuing tasks_cleared due to disconnect', { eventId, timestamp: new Date().toISOString() });
                   eventQueue.current.push({ eventId });
                   missedEvents.current.push({
                     message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - All tasks cleared`,
                     color: 'green',
                     details: JSON.stringify({ details: 'Tasks removed via API' }),
                     timestamp: new Date().toISOString(),
                     eventId,
                   });
                   return;
                 }
                 const eventKey = `tasks_cleared_${eventId || moment().toISOString()}`;
                 if (eventQueue.current.some(e => e.eventId === eventId)) {
                   console.log('useTaskSocket: Skipped duplicate tasks_cleared event:', { eventKey, timestamp: new Date().toISOString() });
                   return;
                 }
                 eventQueue.current.push({ eventId });
                 setTasks([]);
                 message.success('All tasks cleared');
                 const feedEntry = {
                   message: `${moment().format('MMMM Do YYYY, h:mm:ss a')} - All tasks cleared`,
                   color: 'green',
                   details: JSON.stringify({ details: 'Tasks removed via API' }),
                   timestamp: new Date().toISOString(),
                   eventId,
                 };
                 if (typeof feedEntry.message !== 'string' || typeof feedEntry.details !== 'string') {
                   console.warn('useTaskSocket: Invalid liveFeed entry, skipping', feedEntry);
                   logClientError('Invalid liveFeed entry', 'useTaskSocket', { feedEntry });
                   return;
                 }
                 setLiveFeed((prev) => [
                   ...prev,
                   feedEntry,
                 ].slice(-50));
               });
             };
         
             connectSocket();
         
             return () => {
               console.log('useTaskSocket: Disconnecting Socket.IO', { timestamp: new Date().toISOString() });
               if (socketRef.current) {
                 socketRef.current.disconnect();
                 socketRef.current = null;
                 globalTaskSocketInstance = null;
                 socketRegistry.delete(socketId);
                 console.log('useTaskSocket: Unregistered socket instance:', socketId, 'Registry size:', socketRegistry.size, {
                   timestamp: new Date().toISOString(),
                 });
                 setIsInitialized(false);
               }
             };
           }, [messageApi, tasks, setTasks, selectedTask, setSelectedTask, token, setSocketError, singletonFlag]);
         
           return { liveFeed, setLiveFeed };
         };
         
         export default useTaskSocket;
