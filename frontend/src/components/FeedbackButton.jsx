/*
 * File Path: frontend/src/components/FeedbackButton.jsx
 * Purpose: Provides a quick feedback submission button for Allur Space Console, sending feedback via WebSocket.
 * How It Works:
 *   - Renders a button that opens a prompt for user feedback.
 *   - Sends feedback to the backend via Socket.IO taskSocket.
 *   - Displays success/error messages using antd message.
 * Dependencies:
 *   - React: useCallback (version 18.3.1).
 *   - antd: Button, message for UI and notifications (version 5.24.6).
 * Why It’s Here:
 *   - Enables user feedback for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized feedback button with WebSocket integration.
 *   - 04/29/2025: Fixed invalid token issue.
 *   - 04/29/2025: Fixed uuid import error.
 *     - Why: Vite error showed failed import of uuid (User, 04/29/2025).
 *     - How: Replaced uuid with browser-native crypto.randomUUID(), preserved all feedback functionality.
 *     - Test: Click feedback button, submit feedback, verify yellow log in LiveFeed.jsx, no import errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Click feedback button, submit "Test feedback", verify yellow log in LiveFeed.jsx.
 *   - Check browser console: Confirm no uuid import errors, valid JWT used.
 * Future Enhancements:
 *   - Add feedback form UI (Sprint 4).
 *   - Support feedback categories (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed uuid import with crypto.randomUUID(), preserved all functionality (04/29/2025).
 */
import React, { useCallback } from 'react';
import { Button, message } from 'antd';

const FeedbackButton = ({ token, socketTasks, messageApi }) => {
  const handleFeedback = useCallback(() => {
    const feedback = prompt('Enter your feedback:');
    if (feedback) {
      if (!socketTasks) {
        console.error('FeedbackButton: No socket instance available');
        messageApi.error('Feedback submission failed: No socket connection');
        return;
      }
      const eventId = crypto.randomUUID(); // Use browser-native UUID generator
      socketTasks.emit('feedback', {
        message: feedback,
        timestamp: new Date().toISOString(),
        eventId,
      });
      messageApi.success('Feedback submitted');
    }
  }, [socketTasks, messageApi]);

  console.log('FeedbackButton: Initializing with token:', token ? 'present' : 'missing');
  return (
    <Button type="primary" onClick={handleFeedback} style={{ marginTop: '20px' }}>
      Quick Feedback
    </Button>
  );
};

export default FeedbackButton;
