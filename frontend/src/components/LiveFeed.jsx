/*
 * File Path: frontend/src/components/LiveFeed.jsx
 * Purpose: Displays real-time WebSocket events in Allur Space Console, with a clear button and event limit.
 * How It Works:
 *   - Uses useLiveFeed.js to receive taskUpdate, backendProposal, and feedback events.
 *   - Renders events in a scrollable list with color-coded status and timestamps.
 *   - Limits display to 50 events, with a button to clear all events.
 * Dependencies:
 *   - React: Core library (version 18.3.1).
 *   - antd: Button, List for UI (version 5.24.6).
 *   - useLiveFeed.js: Provides WebSocket events.
 *   - logClientError.js: Logs skipped duplicate events.
 * Why It’s Here:
 *   - Provides real-time feedback for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized live feed with basic event rendering (Nate).
 *   - 04/29/2025: Fixed duplicate event rendering with eventId (Nate).
 *   - 05/02/2025: Added clear button, limited to 50 events (Grok).
 *     - Why: Prevent clutter, allow user to clear feed (User, 05/02/2025).
 *     - How: Added clearEvents, sliced events to 50, improved rendering.
 *     - Test: Submit tasks, verify 50 events max, clear feed, confirm empty.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit multiple tasks.
 *   - Verify events render with colors (green/yellow/red/blue), max 50 displayed.
 *   - Click "Clear Live Feed", confirm feed empties.
 *   - Check browser console: No duplicate event errors.
 * Future Enhancements:
 *   - Add event filtering by type (Sprint 3).
 *   - Support event persistence (Sprint 4).
 */

import React, { useState } from 'react';
import { List, Button } from 'antd';
import useLiveFeed from '../hooks/useLiveFeed';
import { logClientError } from '../utils/logClientError';

const LiveFeed = () => {
  const { events } = useLiveFeed();
  const [displayEvents, setDisplayEvents] = useState([]);

  // Limit to 50 events
  React.useEffect(() => {
    const limitedEvents = events.slice(-50);
    setDisplayEvents(limitedEvents);
  }, [events]);

  const clearEvents = () => {
    setDisplayEvents([]);
  };

  const getEventColor = (event) => {
    const status = event.data?.status || '';
    if (status === 'completed' || status === 'applied' || status === 'deleted' || status === 'fetched' || status === 'cleared') return 'green';
    if (status === 'pending_approval') return 'yellow';
    if (status === 'failed' || status === 'denied') return 'red';
    return 'blue';
  };

  return (
    <div className="mt-4">
      <Button type="primary" onClick={clearEvents} style={{ marginBottom: 10 }}>
        Clear Live Feed
      </Button>
      <List
        bordered
        dataSource={displayEvents}
        renderItem={(event) => {
          if (!event.data || !event.type) {
            console.log('LiveFeed: Skipped invalid event', { event });
            logClientError({
              message: 'Skipped invalid event: missing data or type',
              context: 'LiveFeed',
              details: { event, timestamp: new Date().toISOString() },
            });
            return null;
          }
          const color = getEventColor(event);
          const message = event.data.message || `Task ${event.data.taskId || 'unknown'} updated: ${event.data.status || 'unknown'}`;
          return (
            <List.Item style={{ color }}>
              <strong>{new Date(event.timestamp).toLocaleString()}</strong>: {message}
              {event.data.error && <span style={{ color: 'red' }}> - Error: {event.data.error}</span>}
            </List.Item>
          );
        }}
        style={{ maxHeight: '400px', overflowY: 'auto', background: '#fff' }}
      />
    </div>
  );
};

export default LiveFeed;
