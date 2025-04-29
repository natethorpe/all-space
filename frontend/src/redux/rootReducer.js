// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\rootReducer.js
// Historical Note: Original rootReducer for IDURAR combined auth, crud, erp, etc.; updated April 6, 2025, to include grokReducer.
// Future Direction: Expand with additional feature-specific reducers (e.g., events, crypto) as needed.
// Dependencies: redux (combineReducers), auth/reducer, crud/reducer, erp/reducer, adavancedCrud/reducer, settings/reducer, sponsors/reducer, grokSlice.
// Connections: Combines all reducers for store.js; grok ties to GrokAnalyzer component.

import { combineReducers } from 'redux';
import authReducer from './auth/reducer';
import crudReducer from './crud/reducer';
import erpReducer from './erp/reducer';
import adavancedCrudReducer from './adavancedCrud/reducer';
import settingsReducer from './settings/reducer';
import sponsorsReducer from './sponsors/reducer';
import grokReducer from './grokSlice'; // Added for Grok integration

const rootReducer = combineReducers({
  auth: authReducer,
  crud: crudReducer,
  erp: erpReducer,
  adavancedCrud: adavancedCrudReducer,
  settings: settingsReducer,
  sponsors: sponsorsReducer,
  grok: grokReducer, // Integrated Grok state
});

export default rootReducer;
