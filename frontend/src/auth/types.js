// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\auth\types.js

// Purpose: Defines action types for authentication-related Redux actions.
// Context: Used by auth reducer (reducer.js) and actions (actions.js) to handle login, logout, 
// register, and other auth-related state changes. Matches createAsyncThunk types (e.g., 'auth/login') 
// for login actions. No issues found in current usage, but expanded for future auth features.
// Owner: nthorpe, with Grok 3 (xAI) assistance, April 2025.
// Future Enhancements:
// - Add types for MFA (multi-factor authentication) actions (e.g., AUTH_MFA_REQUEST).
// - Add types for OAuth login (e.g., AUTH_OAUTH_LOGIN).
// - Add types for session refresh (e.g., AUTH_REFRESH_TOKEN).
// - Add types for passwordless login (e.g., AUTH_PASSWORDLESS_LOGIN).
// Known Issues:
// - None currently; types align with reducer and actions.

export const AUTH_LOGIN = 'auth/login'; // Used for login action (createAsyncThunk in actions.js)
export const AUTH_REQUEST_LOADING = 'AUTH_REQUEST_LOADING'; // Indicates auth request in progress
export const AUTH_REQUEST_SUCCESS = 'AUTH_REQUEST_SUCCESS'; // Indicates auth request success
export const AUTH_REQUEST_FAILED = 'AUTH_REQUEST_FAILED'; // Indicates auth request failure
export const AUTH_REGISTER_SUCCESS = 'AUTH_REGISTER_SUCCESS'; // Indicates successful registration
export const AUTH_LOGOUT_SUCCESS = 'AUTH_LOGOUT_SUCCESS'; // Indicates successful logout
export const AUTH_LOGOUT_FAILED = 'AUTH_LOGOUT_FAILED'; // Indicates logout failure

// TODO: Add types for future auth features
// export const AUTH_MFA_REQUEST = 'AUTH_MFA_REQUEST'; // For multi-factor authentication
// export const AUTH_OAUTH_LOGIN = 'AUTH_OAUTH_LOGIN'; // For OAuth-based login (e.g., Google, GitHub)
// export const AUTH_REFRESH_TOKEN = 'AUTH_REFRESH_TOKEN'; // For token refresh actions
// export const AUTH_PASSWORDLESS_LOGIN = 'AUTH_PASSWORDLESS_LOGIN'; // For passwordless login (e.g., magic links)
