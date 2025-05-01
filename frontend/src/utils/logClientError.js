/*
 * File Path: frontend/src/utils/logClientError.js
 * Purpose: Logs client-side errors for Allur Space Console, sending them to the backend via API and storing locally.
 * How It Works:
 *   - Sends error details (message, context, details) to /api/grok/client-error using axios.
 *   - Retries failed requests up to 3 times with exponential backoff.
 *   - Falls back to console logging and localStorage if backend logging fails.
 * Dependencies:
 *   - axios: API requests via serverApiConfig.js (version 1.8.4).
 * Why It’s Here:
 *   - Centralizes client error logging for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized client error logging with API integration.
 *   - 04/29/2025: Fixed network error loop causing log spam.
 *   - 04/29/2025: Enhanced network error handling and logging.
 *     - Why: Logs showed net::ERR_CONNECTION_REFUSED errors (User, 04/29/2025).
 *     - How: Added detailed network error logging, suppressed redundant logs, preserved all logging functionality.
 *     - Test: Simulate server offline, verify single console log, errors stored in localStorage.
 *   - 05/01/2025: Added payload validation, increased retries to 3, enhanced localStorage logging (Grok).
 *     - Why: Prevent 400 errors due to invalid payloads (User, 05/01/2025).
 *     - How: Validated message/context/details, safe stringification, logged retry failures.
 *     - Test: Trigger invalid error, verify no 400 errors, errors in localStorage.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Trigger an error (e.g., invalid task submission), verify single console log, no looping errors.
 *   - Stop backend server, trigger error: Confirm single console log with detailed error, error stored in localStorage under 'clientErrors'.
 *   - Restart server, submit task: Verify backend logging resumes, no net::ERR_CONNECTION_REFUSED.
 * Future Enhancements:
 *   - Add error reporting UI (Sprint 4).
 *   - Support offline error queuing (Sprint 5).
 * Self-Notes:
 *   - Nate: Enhanced network error handling, preserved all functionality (04/29/2025).
 *   - Grok: Added payload validation, increased retries (05/01/2025).
 */

import apiClient from '../config/serverApiConfig';

const logClientError = async ({ message, context, details }) => {
  const timestamp = new Date().toISOString();
  // Validate inputs
  const validatedMessage = typeof message === 'string' && message.trim() ? message : 'Unknown error';
  const validatedContext = typeof context === 'string' && context.trim() ? context : 'Unknown context';
  let validatedDetails;
  try {
    validatedDetails = details ? JSON.stringify(details) : '{}';
  } catch (err) {
    validatedDetails = JSON.stringify({ error: 'Failed to stringify details', original: String(details) });
  }

  const errorData = {
    message: validatedMessage,
    context: validatedContext,
    details: validatedDetails,
    timestamp,
  };

  // Log to console with detailed error info
  console.error('logClientError:', errorData);

  // Store error locally as a fallback
  try {
    const storedErrors = JSON.parse(localStorage.getItem('clientErrors') || '[]');
    storedErrors.push(errorData);
    localStorage.setItem('clientErrors', JSON.stringify(storedErrors.slice(-100))); // Limit to 100 errors
  } catch (err) {
    console.error('logClientError: Failed to store error in localStorage:', err.message);
  }

  // Attempt to log to backend with increased retries
  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      await apiClient.post('/grok/client-error', errorData);
      return; // Success, exit
    } catch (err) {
      attempt++;
      const isNetworkError = err.code === 'ERR_NETWORK' || err.message.includes('Network Error');
      console.error(`logClientError: Attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
        errorData,
        isNetworkError,
        errorDetails: {
          code: err.code,
          message: err.message,
          stack: err.stack,
        },
      });

      if (attempt >= maxAttempts || isNetworkError) {
        console.error('logClientError: Failed to log error to backend after retries', {
          message: validatedMessage,
          context: validatedContext,
          details: validatedDetails,
          timestamp,
          error: err,
        });
        // Log retry failure to localStorage
        try {
          const storedErrors = JSON.parse(localStorage.getItem('clientErrors') || '[]');
          storedErrors.push({
            message: `Failed to log error to backend after ${maxAttempts} attempts`,
            context: 'logClientError',
            details: JSON.stringify({ error: err.message, attempt, timestamp }),
            timestamp,
          });
          localStorage.setItem('clientErrors', JSON.stringify(storedErrors.slice(-100)));
        } catch (storeErr) {
          console.error('logClientError: Failed to store retry failure in localStorage:', storeErr.message);
        }
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
};

export { logClientError };
