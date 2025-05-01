/*
 * File Path: frontend/src/context/appContext/index.jsx
 * Purpose: Provides application-wide context for Allur Space Console, managing global state.
 * How It Works:
 *   - Creates a React Context for app-wide state (e.g., user, settings).
 *   - Provides AppContextProvider to wrap the app and manage state.
 *   - Exposes useAppContext hook for accessing context.
 * Dependencies:
 *   - React: createContext, useContext, useState (version 18.3.1).
 * Why It’s Here:
 *   - Centralizes global state management for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized context for user and settings.
 *   - 04/29/2025: Fixed context consumer errors.
 *     - Why: Logs showed TypeError: render2 is not a function and context consumer warnings (User, 04/29/2025).
 *     - How: Ensured proper provider setup, removed invalid consumer usage, preserved all context functionality.
 *     - Test: Load /grok, verify context provides user data, no consumer errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify UI loads, context provides user data (e.g., auth token), no consumer errors.
 *   - Submit "Build CRM system": Confirm context state updates (if applicable), no context-related errors.
 *   - Check browser console: Confirm no context consumer or render2 errors.
 * Future Enhancements:
 *   - Add context for theme settings (Sprint 4).
 *   - Support context persistence (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed context consumer setup, preserved all functionality (04/29/2025).
 */
import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    return auth.user || null;
  });
  const [settings, setSettings] = useState({ theme: 'light' });

  const value = {
    user,
    setUser,
    settings,
    setSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

export default AppContextProvider;
