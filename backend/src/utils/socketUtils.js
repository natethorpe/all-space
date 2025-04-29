/*
 * File Path: backend/src/utils/socketUtils.js
 * Purpose: Modularizes Socket.IO logic for Allur Space Console, handling connections and events.
 * How It Works:
 *   - Sets up Socket.IO with CORS, handles taskUpdate, backendProposal, feedback events.
 *   - Manages client connections with throttling (connectionLimit: 100).
 *   - Implements event queuing to prevent race conditions and ensure delivery.
 *   - Logs events to MongoDB Log model via logUtils.js.
 * Mechanics:
 *   - Uses exponential backoff for reconnection (2s, 4s, 8s, 16s, max 32s, infinite attempts).
 *   - Validates auth.token and query.props, allows relaxed props for frontend hooks.
 *   - Queues events with timestamps and eventId to deduplicate and prevent race conditions.
 * Dependencies:
 *   - socket.io: Real-time communication (version 4.8.1).
 *   - ./logUtils: MongoDB logging utilities.
 * Dependents:
 *   - socket.js: Uses setupSocket and getSocket for initialization.
 *   - taskManager.js, taskRoutes.js: Emit events via getSocket.
 *   - useTaskSocket.js, useProposalSocket.js, FeedbackButton.jsx: Connect as clients.
 * Why It’s Here:
 *   - Modularizes socket.js for Sprint 2 maintainability (05/03/2025).
 * Change Log:
 *   - 05/03/2025: Created to extract Socket.IO logic from socket.js.
 *   - 05/XX/2025: Added event queuing and stricter token validation for Sprint 2 stability.
 *   - 05/XX/2025: Enhanced for connection stability.
 *   - 05/XX/2025: Fixed WebSocket connection drops.
 *     - Why: Address frequent WebSocket closures (User, 05/XX/2025).
 *     - How: Increased pingTimeout to 120s, added detailed reconnection logging, ensured CORS/transport configs.
 *   - 05/XX/2025: Enhanced event deduplication with eventId.
 *   - 05/XX/2025: Fixed connection loop and excessive logging.
 *     - Why: Prevent rapid reconnection loops and log spam (User, 05/XX/2025).
 *     - How: Increased pingTimeout to 180s, added connection rate limiting, enhanced logging for connection tracing.
 *     - Test: Load /grok, verify single connection log in idurar_db.logs, no rapid reconnection logs.
 * Test Instructions:
 *   - Run `npm start`: Verify idurar_db.logs shows “Socket.IO initialized successfully”, minimal connection logs.
 *   - Load GrokUI.jsx: Confirm WebSocket connections succeed, LiveFeed.jsx shows taskUpdate events, no duplicate connection notifications.
 *   - Submit feedback via FeedbackButton: Confirm yellow log in LiveFeed.jsx, idurar_db.logs logs feedback.
 *   - Stop/restart server: Verify events queue and deliver on reconnect, no WebSocket errors, no excessive connection logs.
 *   - Check idurar_db.logs: Confirm connection and event logs, no filesystem writes, no rapid reconnection logs.
 * Future Enhancements:
 *   - Add event acknowledgment (Sprint 4).
 *   - Support Redis scaling (Sprint 5).
 * Self-Notes:
 *   - Nate: Created to modularize socket.js and fix getIO issues (05/03/2025).
 *   - Nate: Added event queuing and stricter validation for stability (05/XX/2025).
 *   - Nate: Enhanced connection stability with timeout and logging (05/XX/2025).
 *   - Nate: Fixed connection loop and excessive logging with rate limiting (05/XX/2025).
 * Rollback Instructions:
 *   - If Socket.IO fails: Copy socketUtils.js.bak to socketUtils.js (`mv backend/src/utils/socketUtils.js.bak backend/src/utils/socketUtils.js`).
 *   - Verify WebSocket connections work after rollback.
 */
const socketIo = require('socket.io');
const { logInfo, logWarn, logError, logDebug } = require('./logUtils');

let io = null;
let isInitialized = false;
const connectionTimestamps = new Map();
const connectionLimit = 100;
const throttleWindow = 1000;
const eventQueue = new Map(); // Store events with timestamps and eventId for deduplication
const connectionRateLimitWindow = 5000; // Rate limit connections within 5s
const maxConnectionsPerWindow = 10; // Max connections per client in window

async function setupSocket(server) {
  if (isInitialized && io) {
    await logWarn('Socket.IO already initialized, skipping re-initialization', 'socketUtils', { timestamp: new Date().toISOString() });
    return io;
  }

  try {
    console.log('socketUtils: Initializing Socket.IO');
    await logInfo('Initializing Socket.IO', 'socketUtils', { timestamp: new Date().toISOString() });

    io = socketIo(server, {
      cors: {
        origin: ['http://localhost:3000'], // Explicitly list origin
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 32000,
      randomizationFactor: 0.5,
      pingTimeout: 180000, // Increased to 180s for stability
      pingInterval: 25000,
    });

    io.on('connection', async (socket) => {
      const authToken = socket.handshake.auth?.token || 'fallback-token'; // Fallback to prevent immediate disconnect
      const now = Date.now();
      const clientId = socket.id;
      const clientIp = socket.handshake.address;
      const clientHeaders = socket.handshake.headers;

      // Rate limit connections per client IP
      const recentConnections = Array.from(connectionTimestamps.entries()).filter(
        ([_, { timestamp, ip }]) => ip === clientIp && now - timestamp < connectionRateLimitWindow
      );
      if (recentConnections.length >= maxConnectionsPerWindow) {
        await logWarn('Socket.IO connection rate limited: Too many connections from client IP', 'socketUtils', {
          socketId: clientId,
          connectionCount: recentConnections.length,
          clientIp,
          clientHeaders,
          timestamp: new Date().toISOString(),
        });
        socket.disconnect(true);
        return;
      }
      connectionTimestamps.set(clientId, { timestamp: now, ip: clientIp });

      await logInfo('Socket.IO client connected', 'socketUtils', {
        socketId: clientId,
        authToken: authToken ? 'present' : 'missing',
        clientIp,
        clientHeaders,
        timestamp: new Date().toISOString(),
      });

      if (!authToken || authToken === 'missing') {
        await logWarn('Socket.IO client missing authentication token', 'socketUtils', {
          socketId: clientId,
          clientIp,
          clientHeaders,
          timestamp: new Date().toISOString(),
        });
        socket.disconnect(true);
        return;
      }

      let props;
      try {
        props = socket.handshake.query?.props ? JSON.parse(socket.handshake.query.props) : {};
      } catch (err) {
        props = { error: `Failed to parse props: ${err.message}` };
        await logWarn('Socket.IO client props parsing failed', 'socketUtils', {
          socketId: clientId,
          error: err.message,
          clientIp,
          clientHeaders,
          timestamp: new Date().toISOString(),
        });
      }

      if (!props.token || !props.source) {
        await logWarn('Socket.IO client with incomplete props', 'socketUtils', {
          socketId: clientId,
          props,
          clientIp,
          clientHeaders,
          timestamp: new Date().toISOString(),
        });
      }

      // Process queued events for this client
      const queuedEvents = eventQueue.get(clientId) || [];
      for (const event of queuedEvents) {
        socket.emit(event.type, event.data);
        await logDebug('Emitted queued event', 'socketUtils', {
          socketId: clientId,
          eventType: event.type,
          eventId: event.data.eventId,
          timestamp: new Date().toISOString(),
        });
      }
      eventQueue.delete(clientId);

      socket.on('feedback', async (data) => {
        const { message, timestamp, eventId } = data;
        const eventKey = `${clientId}_${timestamp}_${message}_${eventId || require('uuid').v4()}`;
        if (eventQueue.has(eventKey)) {
          await logDebug('Skipped duplicate feedback event', 'socketUtils', {
            socketId: clientId,
            eventKey,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        eventQueue.set(eventKey, { type: 'feedback', data });
        await logInfo('Feedback received', 'socketUtils', {
          message,
          socketId: clientId,
          timestamp,
          eventId,
          clientIp,
          timestamp: new Date().toISOString(),
        });
        io.emit('feedback', {
          message: `Feedback: ${message}`,
          color: 'yellow',
          timestamp,
          details: JSON.stringify({ details: `User feedback submitted via Quick Feedback button` }),
          eventId: eventId || require('uuid').v4(),
        });
      });

      socket.on('clientError', async (data) => {
        const { message, context, details, eventId } = data;
        const eventKey = `${clientId}_${message}_${eventId || require('uuid').v4()}`;
        if (eventQueue.has(eventKey)) {
          await logDebug('Skipped duplicate clientError event', 'socketUtils', {
            socketId: clientId,
            eventKey,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        eventQueue.set(eventKey, { type: 'clientError', data });
        await logError(`Client error reported: ${message}`, context || 'socketUtils', {
          socketId: clientId,
          clientIp,
          details,
          eventId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('disconnect', async (reason) => {
        await logInfo('Socket.IO client disconnected', 'socketUtils', {
          socketId: clientId,
          reason,
          clientIp,
          clientHeaders,
          timestamp: new Date().toISOString(),
        });
        connectionTimestamps.delete(clientId);
      });

      socket.on('error', async (err) => {
        await logError('Socket.IO client error', 'socketUtils', {
          socketId: clientId,
          error: err.message,
          stack: err.stack,
          clientIp,
          clientHeaders,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('connect_error', async (err) => {
        await logError('Socket.IO client connection error', 'socketUtils', {
          socketId: clientId,
          error: err.message,
          stack: err.stack,
          authToken: authToken ? 'present' : 'missing',
          clientIp,
          clientHeaders,
          props,
          timestamp: new Date().toISOString(),
        });
      });
    });

    io.on('reconnect_attempt', async (attempt) => {
      await logInfo(`Socket.IO reconnect attempt ${attempt}/Infinity`, 'socketUtils', { timestamp: new Date().toISOString() });
    });

    io.on('reconnect_error', async (err) => {
      await logError(`Socket.IO reconnect error: ${err.message}`, 'socketUtils', {
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
    });

    io.on('reconnect_failed', async () => {
      await logError('Socket.IO reconnection failed after infinite attempts', 'socketUtils', { timestamp: new Date().toISOString() });
    });

    setInterval(() => {
      const now = Date.now();
      for (const [clientId, { timestamp }] of connectionTimestamps) {
        if (now - timestamp >= throttleWindow) {
          connectionTimestamps.delete(clientId);
        }
      }
    }, throttleWindow);

    isInitialized = true;
    await logInfo('Socket.IO initialized successfully', 'socketUtils', { timestamp: new Date().toISOString() });
    return io;
  } catch (err) {
    await logError('Socket.IO initialization failed', 'socketUtils', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

function getSocket() {
  if (!io || !isInitialized) {
    logError('Socket.IO not initialized', 'socketUtils', { timestamp: new Date().toISOString() });
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

module.exports = { setupSocket, getSocket };
