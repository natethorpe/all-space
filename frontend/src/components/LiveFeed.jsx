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
 *   - 05/08/2025: Fixed useLiveFeed parameter passing (Grok).
 *   - 05/08/2025: Guarded against undefined events (Grok).
 *   - 05/08/2025: Enhanced logging for skipped events (Grok).
 *   - 05/04/2025: Added detailed event validation logging (Grok).
 *     - Why: Events not rendering despite useLiveFeed.js processing (User, 05/04/2025).
 *     - How: Added detailed logging for event validation failures, preserved functionality.
 *     - Test: Load /grok, submit task, verify events render in LiveFeed.jsx, check logs for validation failures.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit multiple tasks.
 *   - Verify events render with colors (green/yellow/red/blue), max 50 displayed.
 *   - Click "Clear Live Feed", confirm feed empties.
 *   - Check browser console: No duplicate event errors or invalid event errors.
 * Rollback Instructions:
 *   - Revert to LiveFeed.jsx.bak (`mv frontend/src/components/LiveFeed.jsx.bak frontend/src/components/LiveFeed.jsx`).
 *   - Verify /grok loads (may have rendering issues).
 * Future Enhancements:
 *   - Add event filtering by type (Sprint 3).
 *   - Support event persistence (Sprint 4).
 */

import React, { useState } from 'react';
import { List, Button } from 'antd';
import useLiveFeed from '../hooks/useLiveFeed';
import { logClientError } from '../utils/logClientError';
import PropTypes from 'prop-types';

const LiveFeed = ({ token }) => {
  const { feed: events = [] } = useLiveFeed({
    singletonFlag: 'livefeed',
    token,
    maxEvents: 50,
  });
  const [displayEvents, setDisplayEvents] = useState([]);

  // Limit to 50 events
  React.useEffect(() => {
    const limitedEvents = (events || []).slice(-50);
    setDisplayEvents(limitedEvents);
    console.log('LiveFeed: Updated displayEvents', {
      eventCount: limitedEvents.length,
      eventIds: limitedEvents.map(event => event.id),
      timestamp: new Date().toISOString(),
    });
  }, [events]);

  const clearEvents = () => {
    setDisplayEvents([]);
    console.log('LiveFeed: Cleared events', { timestamp: new Date().toISOString() });
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
            console.log('LiveFeed: Skipped invalid event', {
              eventId: event.id,
              hasData: !!event.data,
              hasType: !!event.type,
              event: JSON.stringify(event, null, 2),
              timestamp: new Date().toISOString(),
            });
            logClientError({
              message: 'Skipped invalid event: missing data or type',
              context: 'LiveFeed',
              details: {
                eventId: event.id,
                hasData: !!event.data,
                hasType: !!event.type,
                event,
                timestamp: new Date().toISOString(),
              },
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

LiveFeed.propTypes = {
  token: PropTypes.string.isRequired,
};

export default LiveFeed;
