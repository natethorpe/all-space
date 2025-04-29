/*
 * File Path: frontend/src/components/FeedbackButton.jsx
 * Purpose: Quick Feedback button component for Allur Space Console, allowing users to send real-time feedback via WebSocket.
 * How It Works:
 *   - Renders an Ant Design Input and Button for users to submit feedback messages.
 *   - Sends feedback via WebSocket 'feedback' event to socket.js, which logs to idurar_db.logs and updates LiveFeed.jsx.
 *   - Displays success/error notifications using Ant Design message API.
 * Mechanics:
 *   - Uses socket.io-client to emit feedback events with token for authentication.
 *   - Validates input to prevent empty submissions.
 *   - Maintains loading state to prevent duplicate submissions.
 * Dependencies:
 *   - antd: Input, Button, message for UI and notifications (version 5.24.6).
 *   - React: useState, useEffect, useRef for state and lifecycle management (version 18.3.1).
 *   - socket.io-client: Real-time communication (version 4.8.1).
 * Dependents:
 *   - GrokUI.jsx: Renders FeedbackButton in a Card for user feedback.
 * Why It’s Here:
 *   - Implements Quick Feedback feature for Sprint 3, enhancing collaboration efficiency (04/25/2025).
 * Change Log:
 *   - 04/25/2025: Created to resolve Vite import error and implement Quick Feedback.
 *   - 04/25/2025: Fixed WebSocket connection errors.
 *   - 04/25/2025: Fixed connection throttling and WebSocket closures.
 *   - 04/28/2025: Fixed ReferenceError: useRef is not defined.
 *   - 04/30/2025: Fixed 400 Bad Request errors by ensuring valid query props.
 *     - Why: Socket.IO connections failed due to invalid props in query (User, 04/30/2025).
 *     - How: Added valid query.props with client details, aligned with socket.js requirements.
 *     - Test: Run `npm run dev`, submit feedback, verify no 400 errors, idurar_db.logs shows valid props.
 * Test Instructions:
 *   - Run `npm start` (backend) and `npm run dev` (frontend), navigate to /grok: Verify FeedbackButton renders in Quick Feedback Card.
 *   - Enter "Test button broken" and submit: Confirm yellow log in LiveFeed.jsx, idurar_db.logs entry, success notification, no 400 errors.
 *   - Submit empty feedback: Verify error notification, no WebSocket event.
 *   - Simulate network failure (stop backend): Confirm error notification, no console errors, reconnects on server restart.
 *   - Check idurar_db.logs: Confirm feedback entries with valid props, no connection errors.
 * Future Enhancements:
 *   - Add feedback history display in UI (Sprint 4).
 *   - Support feedback categories (e.g., Bug, Feature) (Sprint 5).
 * Self-Notes:
 *   - Nate: Created to fix Vite import error and implement Quick Feedback for Sprint 3 (04/25/2025).
 *   - Nate: Fixed WebSocket errors with query props and enhanced logging (04/25/2025).
 *   - Nate: Fixed throttling and closure errors with reconnection logic (04/25/2025).
 *   - Nate: Fixed useRef ReferenceError by adding import (04/28/2025).
 *   - Nate: Fixed 400 Bad Request errors with valid query props (04/30/2025).
 * Rollback Instructions:
 *   - If FeedbackButton fails: Remove FeedbackButton.jsx (`rm frontend/src/components/FeedbackButton.jsx`) and revert GrokUI.jsx to .bak.
 *   - Verify /grok renders without feedback feature after rollback.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Space, message } from 'antd';
import io from 'socket.io-client';

const FeedbackButton = ({ messageApi, token }) => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const socketRef = useRef(null);

  console.log('FeedbackButton: Initializing with token:', token ? 'present' : 'missing');

  useEffect(() => {
    socketRef.current = io('http://localhost:8888', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      query: {
        props: JSON.stringify({
          token: token ? 'present' : 'missing',
          client: navigator.userAgent,
          source: 'FeedbackButton',
        }),
      },
    });

    socketRef.current.on('connect', () => {
      console.log('FeedbackButton: Socket.IO connected');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('FeedbackButton: Socket.IO connection error:', err.message);
      messageApi.error('Feedback connection lost');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('FeedbackButton: Socket.IO disconnected:', reason);
    });

    return () => {
      console.log('FeedbackButton: Disconnecting Socket.IO');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [messageApi, token]);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      messageApi.error('Feedback cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('FeedbackButton: Submitting feedback:', feedback);
      socketRef.current.emit('feedback', { message: feedback, timestamp: new Date().toISOString() });
      messageApi.success('Feedback submitted successfully');
      setFeedback('');
    } catch (err) {
      console.error('FeedbackButton: Submit error:', err.message);
      messageApi.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Enter your feedback (e.g., 'Test button broken')"
      />
      <Button
        type="primary"
        onClick={handleSubmit}
        loading={isSubmitting}
        disabled={!feedback.trim()}
      >
        Submit Feedback
      </Button>
    </Space>
  );
};

export default FeedbackButton;
