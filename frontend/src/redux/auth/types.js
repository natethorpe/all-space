/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\auth\types.js
 * Purpose: Defines action types for authentication-related Redux actions in IDURAR ERP CRM.
 * Context: Used by auth reducer (reducer.js) and actions (actions.js) to handle login, logout, etc.
 * Updates:
 *   - 04/01/2025 (Nate): Added missing action types.
 *     - Why: Build fails due to undefined constants in reducer.
 *     - How: Defined all used action types.
 *     - Impact: Fixed build errors, enabled reducer functionality.
 *   - 04/07/2025 (Grok 3): Corrected AUTH_LOGIN to match createAsyncThunk format.
 *     - Why: Mismatch with actions.js 'auth/login' caused reducer to miss login/fulfilled case.
 *     - How: Changed AUTH_LOGIN to 'auth/login' to align with thunk naming.
 *     - Impact: Ensures reducer catches login/fulfilled action, fixing isLoggedIn update.
 *     - Historical Note: Original types (e.g., 'AUTH_LOGIN') didn’t match thunk’s prefixed format.
 * Future Enhancements:
 *   - Add types for MFA (e.g., AUTH_MFA_REQUEST).
 *   - Add types for OAuth login (e.g., AUTH_OAUTH_LOGIN).
 *   - Add types for session refresh (e.g., AUTH_REFRESH_TOKEN).
 * Known Issues:
 *   - None post-04/07 fix; previously misaligned with thunk action types.
 */

export const AUTH_LOGIN = 'auth/login'; // Matches createAsyncThunk in actions.js
export const AUTH_REQUEST_LOADING = 'AUTH_REQUEST_LOADING';
export const AUTH_REQUEST_FAILED = 'AUTH_REQUEST_FAILED';
export const AUTH_REQUEST_SUCCESS = 'AUTH_REQUEST_SUCCESS';
export const AUTH_REGISTER_SUCCESS = 'AUTH_REGISTER_SUCCESS';
export const AUTH_LOGOUT_SUCCESS = 'AUTH_LOGOUT_SUCCESS';
export const AUTH_LOGOUT_FAILED = 'AUTH_LOGOUT_FAILED';
