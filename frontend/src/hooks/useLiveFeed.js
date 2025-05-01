/*
 * File Path: frontend/src/hooks/useLiveFeed.js
 * Purpose: Manages WebSocket events for real-time updates in Allur Space Console, providing task and proposal events to LiveFeed.jsx.
 * How It Works:
 *   - Establishes a Socket.IO connection to receive taskUpdate, backendProposal, and feedback events.
 *   - Uses socketRegistry.js to prevent redundant connections.
 *   - Deduplicates events using eventId and debounces processing to avoid duplicate UI updates.
 * Dependencies:
 *   - React: useState, useEffect, useRef (version 18.3.1).
 *   - socket.io-client: WebSocket client (version 4.8.1).
 *   - socketRegistry.js: Tracks socket instances.
 *   - logClientError.js: Client-side error logging.
 *   - lodash/debounce: Debounces event processing (version 4.17.21).
 * Dependents:
 *   - LiveFeed.jsx: Consumes events for rendering.
 *   - GrokUI.jsx: Uses hook indirectly via LiveFeed.jsx.
 * Why It’s Here:
 *   - Enables real-time event handling for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized WebSocket hook for live feed.
 *   - 04/23/2025: Added event deduplication with eventId.
 *   - 04/29/2025: Fixed socketLiveFeed not iterable error.
 *   - 04/30/2025: Added debounce to fix duplicate taskUpdate events (Grok).
 *   - 04/30/2025: Fixed Vite import error for lodash.debounce (Grok).
 *   - 05/01/2025: Enhanced deduplication with stricter eventHash, added cleanup (Grok).
 *   - 05/01/2025: Increased debounce to 600ms, added detailed localStorage logging (Grok).
 *     - Why: Persistent duplicate taskUpdate events in LiveFeed.jsx (User, 05/01/2025).
 *     - How: Increased debounce, logged detailed event data to localStorage.
 *     - Test: POST /api/grok/edit, verify single green/yellow/red log in LiveFeed.jsx, no duplicate logs.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Submit "Build CRM system", verify single green/yellow/red log in LiveFeed.jsx, no console errors.
 *   - Submit "Add MFA to login": Confirm single yellow backendProposal log.
 *   - Restart server: Verify events resume on reconnect, no duplicate logs.
 *   - Check browser console and localStorage ('clientErrors') for no duplicate event logs.
 * Rollback Instructions:
 *   - Revert to useLiveFeed.js.bak (`mv frontend/src/hooks/useLiveFeed.js.bak frontend/src/hooks/useLiveFeed.js`).
 *   - Verify /grok loads, LiveFeed.jsx renders without duplicates.
 * Future Enhancements:
 *   - Add event filtering (Sprint 4).
 *   - Support event persistence (Sprint 5).
 */

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import socketRegistry from '../utils/socketRegistry';
import { logClientError } from '../utils/logClientError';
import { BASE_URL } from '../config/serverApiConfig';
import debounce from 'lodash/debounce';

const useLiveFeed = () => {
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);
  const seenEvents = useRef(new Set());
  const eventHashes = useRef(new Set());

  // Cleanup old events to prevent memory growth
  const cleanupEvents = () => {
    const maxEvents = 1000; // Retain only the last 1000 events
    if (seenEvents.current.size > maxEvents) {
      const oldEvents = Array.from(seenEvents.current).slice(0, seenEvents.current.size - maxEvents);
      oldEvents.forEach(eventId => seenEvents.current.delete(eventId));
    }
    if (eventHashes.current.size > maxEvents) {
      const oldHashes = Array.from(eventHashes.current).slice(0, eventHashes.current.size - maxEvents);
      oldHashes.forEach(hash => eventHashes.current.delete(hash));
    }
  };

  const handleEvent = debounce((type, data) => {
    const eventId = data.eventId || `${type}_${Date.now()}_${Math.random()}`;
    const eventHash = `${type}_${data.taskId || 'unknown'}_${data.status || 'unknown'}_${data.error || ''}_${data.timestamp || ''}_${data.message || ''}`;
    
    if (seenEvents.current.has(eventId) || eventHashes.current.has(eventHash)) {
      console.log('useLiveFeed: Skipped duplicate event', { type, eventId, eventHash, data });
      const errorData = {
        message: `Skipped duplicate event: ${type}`,
        context: 'LiveFeed',
        details: { eventId, eventHash, type, data, timestamp: new Date().toISOString() },
      };
      logClientError(errorData);
      // Log to localStorage for debugging
      try {
        const storedErrors = JSON.parse(localStorage.getItem('clientErrors') || '[]');
        storedErrors.push(errorData);
        localStorage.setItem('clientErrors', JSON.stringify(storedErrors.slice(-100)));
      } catch (err) {
        console.error('useLiveFeed: Failed to store duplicate event in localStorage:', err.message);
      }
      return;
    }
    
    seenEvents.current.add(eventId);
    eventHashes.current.add(eventHash);
    setEvents((prev) => [...prev, { type, data, eventId, timestamp: new Date().toISOString() }]);
    cleanupEvents();
  }, 600);

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const token = auth.token || null;
    if (!token) {
      logClientError({
        message: 'Missing auth token for live feed',
        context: 'useLiveFeed',
        details: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const socketId = Symbol('useLiveFeed');
    if (socketRegistry.has(socketId)) {
      console.log('useLiveFeed: Socket already registered');
      return;
    }
    socketRegistry.add(socketId);
    console.log('useLiveFeed: Socket registered, registry size:', socketRegistry.size);

    socketRef.current = io(BASE_URL, {
      auth: { token },
      query: {
        props: JSON.stringify({
          token,
          client: navigator.userAgent,
          source: 'useLiveFeed',
        }),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 32000,
    });

    socketRef.current.on('taskUpdate', (data) => handleEvent('taskUpdate', data));
    socketRef.current.on('backendProposal', (data) => handleEvent('backendProposal', data));
    socketRef.current.on('feedback', (data) => handleEvent('feedback', data));

    socketRef.current.on('connect_error', (err) => {
      logClientError({
        message: `Socket.IO connect error: ${err.message}`,
        context: 'useLiveFeed',
        details: { stack: err.stack, timestamp: new Date().toISOString() },
      });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRegistry.delete(socketId);
      console.log('useLiveFeed: Socket unregistered, registry size:', socketRegistry.size);
    };
  }, []);

  return {
    events,
    socketLiveFeed: socketRef.current ? [socketRef.current] : [],
  };
};

export default useLiveFeed;
