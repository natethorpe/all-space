/*
 * File Path: backend/src/socket.js
 * Purpose: Initializes Socket.IO for real-time communication in Allur Space Console.
 * How It Works:
 *   - Delegates Socket.IO setup to socketUtils.js for modularity.
 *   - Provides initSocket and getIO for compatibility with taskRoutes.js, proposalRoutes.js.
 *   - Ensures stable WebSocket connections for frontend updates.
 * Mechanics:
 *   - Wraps socketUtils.js setupSocket and getSocket functions.
 *   - Logs initialization to idurar_db.logs for traceability.
 * Dependencies:
 *   - socketUtils.js: Core Socket.IO logic (setupSocket, getSocket).
 *   - logUtils.js: MongoDB logging.
 * Why It's Here:
 *   - Maintains compatibility after moving Socket.IO logic to socketUtils.js, fixing net::ERR_CONNECTION_REFUSED (User, 04/30/2025).
 * Change Log:
 *   - 04/07/2025: Initialized basic Socket.IO setup (Nate).
 *   - 05/03/2025: Moved logic to socketUtils.js for modularity (Nate).
 *   - 04/30/2025: Ensured stable wrapper for WebSocket connectivity (Grok).
 *     - Why: Fix frontend connectivity issues after server crash (User, 04/30/2025).
 *     - How: Simplified wrapper, verified socketUtils.js compatibility.
 * Test Instructions:
 *   - Run `npm start`: Verify "Socket.IO initialized" in idurar_db.logs, no errors.
 *   - Load frontend (npm run dev): Confirm no net::ERR_CONNECTION_REFUSED in browser console.
 *   - Submit task via TaskInput.jsx: Verify single green taskUpdate log in LiveFeed.jsx.
 *   - Open 10 /grok tabs: Confirm single connection log per client in idurar_db.logs.
 * Rollback Instructions:
 *   - Revert to socket.js.bak (`mv backend/src/socket.js.bak backend/src/socket.js`).
 *   - Verify frontend connects post-rollback.
 * Future Enhancements:
 *   - Add Socket.IO namespaces for task/proposal events (Sprint 4).
 */

const { setupSocket, getSocket } = require('./utils/socketUtils');
const { logInfo, logError } = require('./utils/logUtils');

async function initSocket(server) {
  try {
    const io = await setupSocket(server);
    await logInfo('Socket.IO initialized', 'socket.js', { timestamp: new Date().toISOString() });
    return io;
  } catch (err) {
    await logError('Socket.IO initialization failed', 'socket.js', { error: err.message || err, timestamp: new Date().toISOString() });
    throw err;
  }
}

function getIO() {
  try {
    return getSocket();
  } catch (err) {
    logError('Failed to get Socket.IO instance', 'socket.js', { error: err.message || err, timestamp: new Date().toISOString() });
    throw err;
  }
}

module.exports = { initSocket, getIO };
