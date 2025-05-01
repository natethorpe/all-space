/*
 * File Path: frontend/src/redux/auth/selectors.js
 * Purpose: Redux selectors for auth state in IDURAR ERP CRM.
 * How It Works:
 *   - Provides selectors for auth state (selectAuth, selectCurrentAdmin, isLoggedIn).
 *   - Temporarily includes logOut and initializeAuth actions to fix auth issues.
 * Dependencies:
 *   - reselect: createSelector for memoized selectors (version 5.1.0).
 * Dependents:
 *   - IdurarOs.jsx: Uses selectAuth, logOut, initializeAuth for auth routing.
 * Change Log:
 *   - 04/23/2025: Added temporary logOut action to fix SyntaxError.
 *   - 04/24/2025: Fixed isAuthenticated: false issue.
 *     - Why: App stuck at AuthRouter despite valid token (User, 04/24/2025).
 *     - How: Mapped isLoggedIn to isAuthenticated, added initializeAuth action.
 *     - Test: Run `npm run dev`, login, verify redirect to ErpApp, no isAuthenticated: false with valid token.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Confirm redirect to /login if unauthenticated, ErpApp if authenticated.
 *   - Login with admin@idurarapp.com/admin123: Verify isAuthenticated: true, redirect to ErpApp.
 *   - Clear localStorage.auth: Confirm redirect to /login, no isAuthenticated: false with valid token.
 * Future Enhancements:
 *   - Move logOut, initializeAuth to redux/auth/actions.js when available (Sprint 3).
 * Self-Notes:
 *   - Nate: Fixed isAuthenticated: false by mapping isLoggedIn, added initializeAuth (04/24/2025).
 */
import { createSelector } from 'reselect';

const authSelect = (state) => state.auth || { isLoggedIn: false, isLoading: false };

export const selectAuth = createSelector(
  [authSelect],
  (auth) => ({
    isAuthenticated: auth.isLoggedIn ?? false, // Map isLoggedIn to isAuthenticated
    isLoading: auth.isLoading ?? false,
    current: auth.current,
  })
);

export const selectCurrentAdmin = createSelector([selectAuth], (auth) => auth.current);

export const isLoggedIn = createSelector([selectAuth], (auth) => auth.isAuthenticated);

// Temporary logOut action (move to actions.js in Sprint 3)
export const logOut = () => (dispatch) => {
  console.log('selectors: Dispatching LOG_OUT action');
  dispatch({ type: 'LOG_OUT' });
  localStorage.removeItem('auth');
};

// Temporary initializeAuth action (move to actions.js in Sprint 3)
export const initializeAuth = (authData) => (dispatch) => {
  console.log('selectors: Dispatching INITIALIZE_AUTH with:', authData);
  dispatch({
    type: 'auth/initialize/fulfilled',
    payload: {
      current: authData.current,
      token: authData.token,
      isLoggedIn: authData.isLoggedIn,
      isLoading: false,
      isSuccess: authData.isSuccess,
    },
  });
};
