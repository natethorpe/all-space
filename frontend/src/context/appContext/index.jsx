/*
 * File Path: frontend/src/context/appContext/index.jsx
 * Purpose: Provides a basic AppContext for IDURAR ERP CRM, enabling app-wide state sharing.
 * How It Works:
 *   - Creates a React context (AppContext) with a default value (e.g., appName: 'IDURAR ERP CRM').
 *   - Provides a Provider component (AppContextProvider) to wrap the app and manage state.
 *   - Includes a useAppContext hook for accessing context in components.
 * Mechanics:
 *   - Uses React.createContext to define AppContext.
 *   - AppContextProvider manages state (e.g., appName) and passes it to consumers.
 *   - useAppContext hook throws an error if used outside the Provider.
 * Dependencies:
 *   - react: Context and hooks for state management (version 18.3.1).
 * Dependents:
 *   - AppRouter.jsx: May use AppContext for app-wide state (currently removed to fix SyntaxError).
 *   - ErpApp.jsx: Potential wrapper for AppContextProvider.
 * Why It’s Here:
 *   - Created to resolve SyntaxError in AppRouter.jsx for missing AppContext export (04/23/2025).
 *   - Provides a minimal context for Sprint 2, enabling AppRouter.jsx to function (04/23/2025).
 * Key Info:
 *   - Placeholder context; replace with your actual appContext/index.jsx if available (e.g., with settings, auth state).
 *   - Currently minimal to avoid errors; expand as needed for app-wide state.
 * Change Log:
 *   - 04/23/2025: Created to fix SyntaxError in AppRouter.jsx.
 *     - Why: MODULE_NOT_FOUND for AppContext export (User, 04/23/2025).
 *     - How: Defined basic AppContext, AppContextProvider, and useAppContext hook.
 *     - Test: Run `npm run dev`, verify AppRouter.jsx renders, no SyntaxError.
 * Test Instructions:
 *   - Apply AppRouter.jsx, appContext/index.jsx, IdurarOs.jsx, run `npm run dev`: Verify frontend starts, no SyntaxError, routes load at http://localhost:3000/grok.
 *   - Navigate to /grok: Confirm GrokUI.jsx renders, console logs “useAppContext: Accessing context”, context provides appName: 'IDURAR ERP CRM'.
 *   - Check browser console: Confirm no SyntaxError, context logs, no uncaught errors.
 * Future Enhancements:
 *   - Add app-wide state (e.g., settings, user data) to AppContext (Sprint 4).
 *   - Integrate with Redux for complex state management (Sprint 5).
 * Self-Notes:
 *   - Nate: Created minimal AppContext to fix SyntaxError in AppRouter.jsx (04/23/2025).
 *   - Nate: Added debug logging and basic state for Sprint 2 compatibility (04/23/2025).
 *   - Nate: Noted to replace with actual appContext if provided by user (04/23/2025).
 * Rollback Instructions:
 *   - If context causes errors: Delete appContext/index.jsx, revert AppRouter.jsx to avoid AppContext import.
 *   - If actual appContext/index.jsx exists, restore it and update AppRouter.jsx import.
 *   - Verify /grok renders and no SyntaxError after rollback.
 */
import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [appState, setAppState] = useState({
    appName: 'IDURAR ERP CRM',
    // Add other app-wide state here (e.g., settings, theme)
  });

  console.log('AppContextProvider: Providing context', appState);

  return (
    <AppContext.Provider value={{ appState, setAppState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    console.error('useAppContext: Must be used within AppContextProvider');
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  console.log('useAppContext: Accessing context', context.appState);
  return context;
}

export default AppContext;
