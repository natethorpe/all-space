// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\store.js
// Historical Note: Original store setup for IDURAR with auth persistence; updated April 6, 2025, to preload grok state.
// Future Direction: Add middleware (e.g., thunk) for complex async actions; expand preloadedState as reducers grow.
// Dependencies: @reduxjs/toolkit (configureStore), rootReducer (combined reducers), storePersist (local storage).
// Connections: Links grokSlice to GrokAnalyzer via rootReducer; auth state persists across sessions.

import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import storePersist from './storePersist';

const AUTH_INITIAL_STATE = {
  current: {},
  token: null,
  isLoggedIn: false,
  isLoading: false,
  isSuccess: false,
};

const GROK_INITIAL_STATE = {
  result: '',
  loading: false,
  error: null
};

const auth_state = storePersist.get('auth') ? storePersist.get('auth') : AUTH_INITIAL_STATE;

const initialState = { 
  auth: auth_state,
  grok: GROK_INITIAL_STATE // Preload grok state to match grokSlice
  // Add other reducers’ initial states if needed in the future
};

const store = configureStore({
  reducer: rootReducer,
  preloadedState: initialState,
  devTools: import.meta.env.PROD === false,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

store.subscribe(() => {
  console.log('Store updated in store.js, state:', store.getState());
});

export default store;
