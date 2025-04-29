/*
 * File Path: frontend/src/utils/socketRegistry.js
 * Purpose: Provides a shared Set to track Socket.IO instances across the Allur Space Console frontend.
 * How It Works:
 *   - Exports a single Set instance to register unique socket IDs from useProposalSocket.js, useTaskSocket.js, and other components.
 *   - Ensures global tracking of active Socket.IO clients to prevent redundant connections.
 * Mechanics:
 *   - Uses a Set to store Symbol-based socket IDs, ensuring uniqueness and efficient lookup.
 * Dependencies:
 *   - None (pure JavaScript module).
 * Dependents:
 *   - GrokUI.jsx: Tracks socket instances created by useProposalSocket and useTaskSocket.
 *   - useProposalSocket.js: Registers and deregisters socket instances.
 *   - useTaskSocket.js: Registers and deregisters socket instances.
 * Why It’s Here:
 *   - Resolves 'externals socketRegistry' error by providing a proper module for sharing socketRegistry (04/25/2025).
 *   - Supports singleton pattern for Socket.IO clients, reducing redundant connections for Sprint 2 (04/25/2025).
 * Change Log:
 *   - 04/25/2025: Created to fix 'externals socketRegistry' error and centralize socket instance tracking.
 *     - Why: Invalid 'externals' syntax caused VSCode error in useProposalSocket.js and useTaskSocket.js (User, 04/25/2025).
 *     - How: Created module exporting a single Set instance, updated dependent files to import socketRegistry.
 *     - Test: Run `npm run dev`, navigate to /grok, verify console logs show socketRegistry size, no redundant socket instances.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify console logs in GrokUI.jsx, useProposalSocket.js, useTaskSocket.js show socketRegistry size (e.g., 2 for valid instances).
 *   - Submit task/feedback: Confirm no redundant socket instances (socketRegistry size remains stable), no WebSocket errors.
 *   - Check browser console: Confirm socketRegistry logs, no 'externals' or undefined errors.
 * Future Enhancements:
 *   - Add cleanup mechanism for stale socket IDs (Sprint 4).
 *   - Integrate with WebSocket scaling logic (Sprint 5).
 * Self-Notes:
 *   - Nate: Created to fix 'externals socketRegistry' error and centralize socket tracking (04/25/2025).
 * Rollback Instructions:
 *   - If module causes issues: Remove socketRegistry.js (`rm frontend/src/utils/socketRegistry.js`) and revert GrokUI.jsx, useProposalSocket.js, useTaskSocket.js to .bak versions.
 */
const socketRegistry = new Set();

export default socketRegistry;
