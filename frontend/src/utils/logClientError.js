/*
 * File Path: frontend/src/utils/logClientError.js
 * Purpose: Logs client-side errors to the backend for debugging in Allur Space Console.
 * How It Works:
 *   - Sends error details to /grok/client-error endpoint via axios.
 *   - Includes message, context, and details for MongoDB logging.
 * Mechanics:
 *   - Uses axios with retry logic (3 attempts) to ensure error delivery.
 *   - Falls back to console logging if API call fails.
 * Dependencies:
 *   - axios: API calls via serverApiConfig.js (version 0.28.1).
 * Dependents:
 *   - useProposalSocket.js, useTaskSocket.js, LiveFeed.jsx: Log client-side errors.
 * Why It’s Here:
 *   - Improves debugging for client-side issues in Sprint 2 (05/XX/2025).
 * Change Log:
 *   - 05/XX/2025: Created to log client errors to backend.
 *     - Why: Enhance error tracking for JSON parsing and Socket.IO issues (User, 05/XX/2025).
 *     - How: Added axios-based logging with retries, integrated with logUtils.js.
 *     - Test: Trigger error in LiveFeed.jsx, verify error logged in idurar_db.logs.
 * Test Instructions:
 *   - Run `npm start` (backend) and `npm run dev` (frontend), trigger error (e.g., invalid JSON in LiveFeed.jsx).
 *   - Check idurar_db.logs: Confirm client error logged with message, context, details.
 *   - Simulate API failure: Verify console fallback logging, no crashes.
 * Future Enhancements:
 *   - Add batch error logging (Sprint 4).
 *   - Integrate with error monitoring service (Sprint 6).
 * Self-Notes:
 *   - Nate: Created to improve client-side error debugging (05/XX/2025).
 */
import apiClient from '../config/serverApiConfig';

const logClientError = async (message, context, details = {}) => {
  const errorData = {
    message,
    context,
    details: JSON.stringify(details),
    timestamp: new Date().toISOString(),
  };

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      await apiClient.post('/grok/client-error', errorData);
      console.log('logClientError: Successfully logged error to backend', errorData);
      return;
    } catch (err) {
      attempt++;
      console.warn(`logClientError: Attempt ${attempt}/${maxAttempts} failed: ${err.message}`, { errorData });
      if (attempt >= maxAttempts) {
        console.error('logClientError: Failed to log error to backend after retries', errorData, err);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

export { logClientError };
