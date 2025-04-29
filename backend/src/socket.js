/*
 * File Path: backend/src/socket.js
 * Purpose: Wrapper for Socket.IO initialization in Allur Space Console.
 * How It Works:
 *   - Delegates to socketUtils.js for Socket.IO setup and event handling.
 *   - Provides initSocket and getIO for compatibility with taskManager.js, taskRoutes.js.
 * Dependencies:
 *   - ./utils/socketUtils: Socket.IO logic (setupSocket, getSocket).
 * Dependents:
 *   - app.js: Initializes Socket.IO with HTTP server.
 *   - taskManager.js, taskRoutes.js: Emit taskUpdate, backendProposal events.
 * Why It’s Here:
 *   - Maintains compatibility after modularizing socket logic to socketUtils.js (05/03/2025).
 * Change Log:
 *   - 04/07/2025: Initialized Socket.IO with taskUpdate, backendProposal events.
 *   - 05/03/2025: Simplified to use socketUtils.js.
 *     - Why: socket.js too complex, getIO(...).emit error (User, 05/03/2025).
 *     - How: Delegated logic to socketUtils.js, retained wrapper for compatibility.
 *     - Test: Run `npm start`, verify idurar_db.logs shows “Socket.IO initialized successfully”, no getIO errors.
 * Test Instructions:
 *   - Run `npm start`: Verify idurar_db.logs shows “Socket.IO initialized successfully”.
 *   - Load GrokUI.jsx: Confirm WebSocket connections succeed, LiveFeed.jsx shows taskUpdate events.
 *   - Check idurar_db.logs: Confirm connection logs, no filesystem writes.
 * Self-Notes:
 *   - Nate: Simplified to use socketUtils.js, fixed getIO issues (05/03/2025).
 */

const { setupSocket, getSocket } = require('./utils/socketUtils');

async function initSocket(server) {
  return await setupSocket(server);
}

function getIO() {
  return getSocket();
}

module.exports = { initSocket, getIO };
