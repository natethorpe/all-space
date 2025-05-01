/*
 * File Path: frontend/src/components/ErrorAlerts.jsx
 * Purpose: Displays error alerts for task and file fetch failures in Allur Space Console.
 * How It Works:
 *   - Renders Ant Design Alert components for taskError and fileError, with consistent styling and conditional display.
 *   - Receives error states from useTasks.js to show messages for failed API calls (e.g., /grok/tasks, /grok/files).
 *   - Displays errors only when taskError or fileError is non-null, ensuring a clean UI when no errors occur.
 * Dependencies:
 *   - antd: Alert for error display and styling.
 *   - React: Core library for rendering.
 * Dependents:
 *   - GrokUI.jsx: Renders ErrorAlerts below the TaskInput Card to show task and file fetch errors.
 *   - useTasks.js: Provides taskError and fileError states from API call failures.
 * Why It’s Here:
 *   - Modularizes error alert UI from GrokUI.jsx, reducing its size by ~10 lines (04/21/2025).
 *   - Supports Sprint 2 usability by clearly communicating fetch failures to users, improving error handling visibility.
 * Key Info:
 *   - Uses consistent styling (marginTop: 16) for a polished appearance across alerts.
 *   - Conditionally renders alerts to avoid cluttering the UI when no errors are present.
 *   - Displays error messages like "Authentication failed: Invalid token" for 401 errors or "Failed to fetch tasks" for network issues.
 * Change Log:
 *   - 04/21/2025: Created to modularize GrokUI.jsx error alerts, fully implemented.
 *     - Why: Reduce GrokUI.jsx size, improve maintainability, ensure complete functionality (User, 04/21/2025).
 *     - How: Extracted Alert components from GrokUI.jsx, used props from useTasks.js, implemented conditional rendering.
 *     - Test:
 *       - Trigger 401 error (invalid token): Verify alerts appear with "Authentication failed: Invalid token".
 *       - Simulate network failure for /grok/tasks: Verify taskError alert shows "Failed to fetch tasks".
 *       - Simulate network failure for /grok/files: Verify fileError alert shows "Failed to fetch files".
 *       - Check live feed: Verify error events logged via useTasks.js.
 *       - No errors: Verify no alerts rendered, UI remains clean.
 * Future Enhancements:
 *   - Add dismissible alerts with timeout to reduce UI clutter (Sprint 4).
 *   - Support multiple error types (e.g., network, validation, server) with distinct styles or icons (Sprint 5).
 *   - Integrate with analytics to log error occurrences for monitoring and debugging (Sprint 6).
 *   - Add retry button for failed fetches to improve user experience (Sprint 4).
 *   - Customize alert styling for branding consistency (e.g., custom colors, fonts) (Sprint 4).
 * Self-Notes:
 *   - Nate: Extracted error alerts from GrokUI.jsx to simplify maintenance, ensured all error display functionality preserved from original (04/21/2025).
 *   - Nate: Triple-checked conditional rendering and integration with useTasks.js error states (04/21/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with autonomous system goals (04/21/2025).
 */

import React from 'react';
import { Alert } from 'antd';

const ErrorAlerts = ({ taskError, fileError }) => (
  <>
    {taskError && <Alert message={taskError} type="error" style={{ marginTop: 16 }} />}
    {fileError && <Alert message={fileError} type="error" style={{ marginTop: 16 }} />}
  </>
);

export default ErrorAlerts;
