/*
 * File Path: frontend/src/components/LiveFeed.jsx
 * Purpose: Displays real-time event logs in Allur Space Console for tasks, proposals, and feedback.
 * How It Works:
 *   - Renders a list of log entries from liveFeed (provided by useTaskSocket.js, useTaskActions.js).
 *   - Uses Ant Design List and Typography for styled, color-coded logs.
 *   - Supports capped feed (50 entries) with scrollable container.
 * Mechanics:
 *   - Maps liveFeed entries to List.Item, ensuring message and details are strings or JSX.
 *   - Applies color styles based on logColor (blue, green, red, yellow, default).
 * Dependencies:
 *   - antd: List, Typography for UI (version 5.24.6).
 *   - React: Functional component (version 18.3.1).
 * Dependents:
 *   - GrokUI.jsx: Renders LiveFeed in a Card for real-time updates.
 * Why It’s Here:
 *   - Provides real-time feedback for Sprint 2 task and proposal actions (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created to display taskUpdate, backendProposal events.
 *   - 04/28/2025: Fixed React warning: Functions are not valid as a React child.
 *   - 04/30/2025: Strengthened renderLogContent to handle functions.
 *   - 05/XX/2025: Enhanced event deduplication and validation for Sprint 2 stability.
 *   - 05/XX/2025: Fixed JSON parsing error in deduplicateEvents.
 *     - Why: Prevent crashes from invalid JSON in details (User, 05/XX/2025).
 *     - How: Added safe JSON parsing, try-catch rendering, logged errors via logClientError.
 *     - Test: Submit task, disconnect/reconnect Socket.IO, verify no JSON parse errors or crashes.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify LiveFeed renders in Card, capped at 50 entries.
 *   - Submit task via TaskInput.jsx: Confirm blue log, no JSON parse errors in console.
 *   - Submit feedback via FeedbackButton.jsx: Confirm yellow log, no crashes.
 *   - Stop/restart server: Verify no duplicate logs or JSON parse errors in LiveFeed.jsx.
 *   - Check browser console: Confirm no “Unexpected token” or “Functions are not valid as a React child” warnings.
 * Future Enhancements:
 *   - Add log filtering by type (e.g., task, proposal) (Sprint 4).
 *   - Support expandable details view (Sprint 5).
 * Self-Notes:
 *   - Nate: Created for real-time event display in Sprint 2 (04/23/2025).
 *   - Nate: Fixed React rendering warning by validating liveFeed entries (04/28/2025).
 *   - Nate: Strengthened validation for functions (04/30/2025).
 *   - Nate: Fixed JSON parsing and crash issues (05/XX/2025).
 */
import React from 'react';
import { List, Typography } from 'antd';
import { logClientError } from '../utils/logClientError';

const { Text } = Typography;

const LiveFeed = ({ liveFeed }) => {
  const renderLogContent = (content) => {
    if (typeof content === 'string') return content;
    if (React.isValidElement(content)) return content;
    if (content === null || content === undefined) return 'N/A';
    if (typeof content === 'function') {
      console.warn('LiveFeed: Function detected in log content, converting to string', content);
      logClientError('Function detected in log content', 'LiveFeed', { content });
      return '[Function]';
    }
    if (typeof content === 'object') {
      try {
        return JSON.stringify(content, null, 2);
      } catch (err) {
        console.warn('LiveFeed: Failed to stringify object content', content, err);
        logClientError('Failed to stringify object content', 'LiveFeed', { content, error: err.message });
        return '[Invalid Object]';
      }
    }
    console.warn(`LiveFeed: Invalid log content type: ${typeof content}`, content);
    logClientError('Invalid log content type', 'LiveFeed', { content, type: typeof content });
    return String(content);
  };

  // Deduplicate events based on timestamp, taskId/proposalId, and eventId
  const deduplicateEvents = (feed) => {
    const seen = new Set();
    return feed.filter((item) => {
      let detailsObj = {};
      if (typeof item.details === 'string') {
        try {
          // Check if details is valid JSON
          JSON.parse(item.details);
          detailsObj = JSON.parse(item.details);
        } catch (err) {
          // Handle non-JSON details (e.g., "Reason: io client disconnect")
          console.warn('LiveFeed: Invalid JSON in details, treating as string', item.details, err);
          logClientError('Invalid JSON in details', 'LiveFeed', { details: item.details, error: err.message });
          detailsObj = { rawDetails: item.details };
        }
      } else {
        detailsObj = item.details || {};
      }
      const key = `${item.timestamp}_${detailsObj.taskId || detailsObj.proposalId || item.message}_${item.eventId || ''}`;
      if (seen.has(key)) {
        console.log('LiveFeed: Filtered duplicate event:', key);
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  let uniqueFeed = [];
  try {
    uniqueFeed = deduplicateEvents(liveFeed);
  } catch (err) {
    console.error('LiveFeed: Failed to deduplicate events', err);
    logClientError('Failed to deduplicate events', 'LiveFeed', { error: err.message });
    uniqueFeed = liveFeed; // Fallback to raw feed to prevent crash
  }

  return (
    <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px', border: '1px solid #f0f0f0' }}>
      <List
        dataSource={uniqueFeed.slice(-50)}
        renderItem={(item) => {
          try {
            return (
              <List.Item>
                <div>
                  <Text style={{ color: item.color || 'black' }}>
                    {renderLogContent(item.message)}
                  </Text>
                  {item.details && (
                    <Text type="secondary" style={{ display: 'block', marginTop: '4px' }}>
                      {renderLogContent(item.details)}
                    </Text>
                  )}
                </div>
              </List.Item>
            );
          } catch (renderErr) {
            console.error('LiveFeed: Failed to render item', item, renderErr);
            logClientError('Failed to render item', 'LiveFeed', { item, error: renderErr.message });
            return null; // Skip invalid item
          }
        }}
      />
    </div>
  );
};

export default LiveFeed;
