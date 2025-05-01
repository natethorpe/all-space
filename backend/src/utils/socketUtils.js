/*
 * File Path: backend/src/utils/socketUtils.js
 * Purpose: Modularizes Socket.IO logic for Allur Space Console, handling connections and events.
 * How It Works:
 *   - Sets up Socket.IO with CORS, handling taskUpdate, backendProposal, feedback, clientError events.
 *   - Manages client connections with rate limiting (10 connections per 5s per IP).
 *   - Implements event queuing and acknowledgment to prevent race conditions.
 *   - Logs events to idurar_db.logs for traceability.
 * Mechanics:
 *   - Uses exponential backoff for reconnection (2s, 4s, 8s, max 64s, infinite attempts).
 *   - Validates auth.token (placeholder for JWT), logs invalid tokens.
 *   - Queues events with eventId for deduplication, supports acknowledgment callbacks.
 *   - Simulates 100 connections in development for load testing.
 * Dependencies:
 *   - socket.io: Real-time communication (version 4.8.1).
 *   - uuid: Generates eventId (version 11.1.0).
 *   - logUtils.js: MongoDB logging.
 * Dependents:
 *   - socket.js: Uses setupSocket and getSocket for initialization.
 *   - taskRoutes.js, proposalRoutes.js: Emit taskUpdate, backendProposal events.
 *   - useTaskSocket.js, useProposalSocket.js, FeedbackButton.jsx: Connect as clients.
 * Why It’s Here:
 *   - Modularizes socket.js for Sprint 2, fixing WebSocket connection failures (User, 04/30/2025).
 * Change Log:
 *   - 05/03/2025: Created to extract Socket.IO logic from socket.js (Nate).
 *   - 04/29/2025: Fixed WebSocket connection failures (Nate).
 *   - 05/03/2025: Added event acknowledgment and load testing (Nate).
 *   - 04/30/2025: Aligned with provided version, optimized logging (Grok).
 *   - 04/30/2025: Relaxed rate limiting, enhanced deduplication to fix duplicates (Grok).
 *     - Why: Duplicate taskUpdate events in LiveFeed.jsx (User, 04/30/2025).
 *     - How: Increased rate limit to 50 connections per 10s, strengthened eventKey deduplication, added reconnection logging.
 *     - Test: POST /api/grok/edit, verify single taskUpdate log in LiveFeed.jsx, no WebSocket errors.
 * Test Instructions:
 *   - Run `npm start`, load /grok, submit "Build CRM system".
 *   - Verify single green/yellow/red log in LiveFeed.jsx, no duplicates.
 *   - Open 10 /grok tabs, confirm stable connections, single connection log per client in idurar_db.logs.
 *   - Restart server, verify events resume, no WebSocket errors.
 * Rollback Instructions:
 *   - Revert to socketUtils.js.bak (`mv backend/src/utils/socketUtils.js.bak backend/src/utils/socketUtils.js`).
 *   - Verify frontend connects post-rollback.
 * Future Enhancements:
 *   - Add Redis for scaling (Sprint 5).
 *   - Support event persistence (Sprint 4).
 */

const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { logInfo, logWarn, logError, logDebug } = require('./logUtils');

let io = null;
let isInitialized = false;
const connectionTimestamps = new Map();
const connectionLimit = 50; // Increased from 10
const throttleWindow = 10000; // Increased from 5000ms
const eventQueue = new Map();
const acknowledgments = new Map();

async function setupSocket(server) {
  if (isInitialized && io) {
    await logWarn('Socket.IO already initialized', 'socketUtils', { timestamp: new Date().toISOString() });
    return io;
  }

  try {
    console.log('socketUtils: Initializing Socket.IO');
    await logInfo('Initializing Socket.IO', 'socketUtils', { timestamp: new Date().toISOString() });

    io = socketIo(server, {
      cors: {
        origin: ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 64000,
      randomizationFactor: 0.5,
      pingTimeout: 300000,
      pingInterval: 25000,
    });

    io.on('connection', async (socket) => {
      const authToken = socket.handshake.auth?.token || 'missing';
      const now = Date.now();
      const clientId = socket.id;
      const clientIp = socket.handshake.address;

      // Rate limit connections
      const recentConnections = Array.from(connectionTimestamps.entries()).filter(
        ([_, { timestamp, ip }]) => ip === clientIp && now - timestamp < throttleWindow
      );
      if (recentConnections.length >= connectionLimit) {
        await logWarn('Socket.IO connection rate limited', 'socketUtils', {
          socketId: clientId,
          connectionCount: recentConnections.length,
          clientIp,
          timestamp: new Date().toISOString(),
        });
        socket.disconnect(true);
        return;
      }
      connectionTimestamps.set(clientId, { timestamp: now, ip: clientIp });

      if (authToken === 'missing' || typeof authToken !== 'string' || authToken === 'present') {
        await logWarn('Socket.IO client missing valid token', 'socketUtils', {
          socketId: clientId,
          clientIp,
          authToken,
          timestamp: new Date().toISOString(),
        });
        socket.disconnect(true);
        return;
      }

      await logInfo('Socket.IO client connected', 'socketUtils', {
        socketId: clientId,
        authToken: 'present',
        clientIp,
        timestamp: new Date().toISOString(),
      });

      // Process queued events
      const queuedEvents = eventQueue.get(clientId) || [];
      for (const event of queuedEvents) {
        socket.emit(event.type, event.data, (ack) => {
          if (ack) {
            acknowledgments.set(event.eventId, { status: 'acknowledged', timestamp: new Date().toISOString() });
            eventQueue.delete(`${clientId}_${event.eventId}`);
            logDebug('Event acknowledged by client', 'socketUtils', {
              eventId: event.eventId,
              clientId,
              timestamp: new Date().toISOString(),
            });
          }
        });
      }

      socket.on('feedback', async (data) => {
        const { message, timestamp, eventId = uuidv4() } = data;
        const eventKey = `${clientId}_${message}_${eventId}`; // Simplified eventKey
        if (eventQueue.has(eventKey)) {
          console.log('socketUtils: Skipped duplicate feedback', { eventId });
          return;
        }
        eventQueue.set(eventKey, { type: 'feedback', data, eventId });
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
          details: JSON.stringify({ details: `User feedback submitted` }),
          eventId,
        }, (ack) => {
          if (ack) {
            acknowledgments.set(eventId, { status: 'acknowledged', timestamp: new Date().toISOString() });
            eventQueue.delete(eventKey);
            logDebug('Feedback event acknowledged', 'socketUtils', {
              eventId,
              clientId,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

      socket.on('clientError', async (data) => {
        const { message, context, details, eventId = uuidv4() } = data;
        const eventKey = `${clientId}_${message}_${eventId}`;
        if (eventQueue.has(eventKey)) {
          console.log('socketUtils: Skipped duplicate clientError', { eventId });
          return;
        }
        eventQueue.set(eventKey, { type: 'clientError', data, eventId });
        await logError(`Client error reported: ${message}`, context || 'socketUtils', {
          socketId: clientId,
          clientIp,
          details,
          eventId,
          timestamp: new Date().toISOString(),
        });
        acknowledgments.set(eventId, { status: 'acknowledged', timestamp: new Date().toISOString() });
        eventQueue.delete(eventKey);
      });

      socket.on('disconnect', async (reason) => {
        await logInfo('Socket.IO client disconnected', 'socketUtils', {
          socketId: clientId,
          reason,
          clientIp,
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
          timestamp: new Date().toISOString(),
        });
      });

      // Simulate load testing in development
      if (process.env.NODE_ENV === 'development') {
        const simulateConnections = async () => {
          for (let i = 0; i < 100; i++) {
            const testSocket = socketIo('http://localhost:8888', {
              auth: { token: authToken },
              transports: ['websocket'],
            });
            testSocket.on('connect', () => {
              logDebug('Test connection established', 'socketUtils', {
                testSocketId: testSocket.id,
                connectionNumber: i + 1,
                timestamp: new Date().toISOString(),
              });
            });
            testSocket.on('connect_error', (err) => {
              logWarn('Test connection failed', 'socketUtils', {
                error: err.message,
                connectionNumber: i + 1,
                timestamp: new Date().toISOString(),
              });
            });
            testSocket.on('taskUpdate', (data, callback) => {
              if (callback) callback(true);
            });
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        };
        simulateConnections().catch(err => {
          logError('Load testing failed', 'socketUtils', {
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          });
        });
      }
    });

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
