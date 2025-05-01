/*
 * File Path: frontend/src/redux/auth/reducer.js
 * Purpose: Manages authentication state in Redux for IDURAR ERP CRM.
 * How It Works:
 *   - Tracks user login status, current user, token, and request states.
 *   - Responds to login, logout, register, and initialize actions from actions.js and selectors.js.
 * Dependencies:
 *   - @reduxjs/toolkit: For createAsyncThunk compatibility (version 2.6.1).
 *   - types.js: Action constants.
 * Dependents:
 *   - store.js: Integrates reducer into Redux store.
 *   - selectors.js: Reads auth state for IdurarOs.jsx.
 *   - actions.js: Dispatches login/logout actions.
 * Change Log:
 *   - 04/07/2025: Simplified login/fulfilled to set isLoggedIn: true, added debug logs.
 *   - 04/23/2025: Fixed login/fulfilled to apply full auth_state payload.
 *   - 04/24/2025: Added auth/initialize/fulfilled handler.
 *     - Why: Unhandled action for auth/initialize/fulfilled caused warning logs (User, 04/24/2025).
 *     - How: Added case for auth/initialize/fulfilled, mirroring login/fulfilled logic.
 *     - Test: Run `npm run dev`, login, verify no unhandled action logs, state updates with isLoggedIn: true.
 * Test Instructions:
 *   - Run `npm run dev`, login with admin@idurarapp.com/admin123: Verify console logs show auth/initialize/fulfilled handled, state updates with isLoggedIn: true.
 *   - Check store.js logs: Confirm auth state includes token, isLoggedIn: true.
 * Future Enhancements:
 *   - Refactor to createSlice for immutable updates (Sprint 3).
 *   - Add MFA state (e.g., mfaVerified) for security (Sprint 5).
 * Self-Notes:
 *   - Nate: Added auth/initialize/fulfilled handler to fix unhandled action (04/24/2025).
 */
import * as actionTypes from './types';

const INITIAL_STATE = {
  current: {},
  token: null,
  isLoggedIn: false,
  isLoading: false,
  isSuccess: false,
  error: null,
};

const authReducer = (state = INITIAL_STATE, action) => {
  if (action.type.includes('auth')) {
    console.log('authReducer: Received action:', action.type, 'Payload:', action.payload);
  }
  switch (action.type) {
    case `${actionTypes.AUTH_LOGIN}/pending`:
    case actionTypes.AUTH_REQUEST_LOADING:
      return { ...state, isLoggedIn: false, isLoading: true, error: null };
    case `${actionTypes.AUTH_LOGIN}/rejected`:
    case actionTypes.AUTH_REQUEST_FAILED:
      return { ...INITIAL_STATE, error: action.payload || 'Login failed' };
    case `${actionTypes.AUTH_LOGIN}/fulfilled`:
    case actionTypes.AUTH_REQUEST_SUCCESS:
      if (action.type.includes('auth')) {
        console.log('authReducer: login/fulfilled, payload:', action.payload);
      }
      const loginState = {
        ...state,
        current: action.payload.current || state.current,
        token: action.payload.token || state.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
        error: null,
      };
      if (action.type.includes('auth')) {
        console.log('authReducer: Returning new state:', loginState);
      }
      return loginState;
    case 'auth/initialize/fulfilled':
      if (action.type.includes('auth')) {
        console.log('authReducer: initialize/fulfilled, payload:', action.payload);
      }
      const initState = {
        ...state,
        current: action.payload.current || state.current,
        token: action.payload.token || state.token,
        isLoggedIn: action.payload.isLoggedIn ?? true,
        isLoading: action.payload.isLoading ?? false,
        isSuccess: action.payload.isSuccess ?? true,
        error: null,
      };
      if (action.type.includes('auth')) {
        console.log('authReducer: Returning new state:', initState);
      }
      return initState;
    case actionTypes.AUTH_REGISTER_SUCCESS:
      return { current: {}, token: null, isLoggedIn: false, isLoading: false, isSuccess: true, error: null };
    case actionTypes.AUTH_LOGOUT_SUCCESS:
      return INITIAL_STATE;
    case actionTypes.AUTH_LOGOUT_FAILED:
      return {
        current: action.payload.current,
        token: action.payload.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
        error: null,
      };
    default:
      if (action.type.includes('auth')) {
        console.log('authReducer: Unhandled action, returning state:', state);
      }
      return state;
  }
};

export default authReducer;
