/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\sponsors\reducer.js
 * Purpose: Manages the sponsors state in Redux for IDURAR ERP CRM.
 * Functionality:
 *   - Handles actions for loading sponsors, summaries, events, emails, and CRUD operations.
 *   - Updates state with sponsor list, summary, and pagination data.
 * Structure:
 *   - Uses createSlice for Redux Toolkit reducer logic.
 * Connections:
 *   - Depends on: actions.js (action creators), types.js (action types).
 *   - Used by: useSponsorDashboard.js (via useSelector), Dashboard.jsx.
 * Updates:
 *   - 04/02/2025: Fixed loadSponsors.fulfilled to update sponsors with filtered results.
 *   - 04/06/2025: Added debug logs, fixed state shape to use items, corrected data structure.
 *   - 04/09/2025: Enhanced logging, fixed total and pagination handling.
 *   - 04/07/2025 (Grok 3): Aligned with new backend response format.
 *     - Why: Dashboard empty; backend now returns { success, result: { sponsors, total } }.
 *     - How: Updated loadSponsors.fulfilled to use result.sponsors, added error logging.
 *     - Impact: Populates Dashboard.jsx with actual sponsor data from MongoDB.
 *     - Historical Note: Earlier fixes assumed different payload shapes; 404s hid issues.
 * Future Enhancements:
 *   - Add Allur payment state tracking.
 *   - Implement local caching for offline mode.
 * Known Issues:
 *   - None post-04/07 fix; previously failed to load data due to 404s and shape mismatch.
 */
/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\sponsors\reducer.js
 * Updates:
 *   - 04/07/2025 (Grok 3): Added sponsors-specific logs
 *     - Why: Confirm sponsorsReducer handles actions, not authReducer
 *     - How: Prefixed logs with 'sponsorsReducer'
 *     - Impact: Clearer debug output
 */

import { createSlice } from '@reduxjs/toolkit';
import { loadSponsors, loadSummary, addSponsorEvent, updateSponsorEvent, sendSponsorEmailAction, createSponsor, updateSponsor } from './actions';

const initialState = {
  items: [],
  summary: {},
  loading: false,
  error: null,
  total: 0,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
};

const sponsorsSlice = createSlice({
  name: 'sponsors',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSponsors.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('sponsorsReducer: loadSponsors pending, setting loading to true');
      })
      .addCase(loadSponsors.fulfilled, (state, action) => {
        state.loading = false;
        console.log('sponsorsReducer: loadSponsors fulfilled, action payload:', action.payload);
        const sponsorData = action.payload.result?.sponsors || [];
        state.items = sponsorData;
        state.total = action.payload.result?.total || sponsorData.length || 0;
        state.pagination = {
          current: action.payload.pagination?.current || state.pagination.current,
          pageSize: action.payload.pagination?.pageSize || state.pagination.pageSize,
          total: state.total,
        };
        console.log('sponsorsReducer: loadSponsors fulfilled, updated state:', { items: state.items, total: state.total });
      })
      .addCase(loadSponsors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('sponsorsReducer: loadSponsors rejected:', action.payload);
      })
      .addCase(loadSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log('sponsorsReducer: loadSummary pending');
      })
      .addCase(loadSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload.result || {};
        console.log('sponsorsReducer: loadSummary fulfilled, summary:', state.summary);
      })
      .addCase(loadSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('sponsorsReducer: loadSummary rejected:', action.payload);
      })
      // Remaining cases unchanged
      .addCase(addSponsorEvent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(addSponsorEvent.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSponsor = action.payload;
        const index = state.items.findIndex(s => s._id === updatedSponsor._id);
        if (index !== -1) state.items[index] = updatedSponsor;
      })
      .addCase(addSponsorEvent.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(updateSponsorEvent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateSponsorEvent.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSponsor = action.payload;
        const index = state.items.findIndex(s => s._id === updatedSponsor._id);
        if (index !== -1) state.items[index] = updatedSponsor;
      })
      .addCase(updateSponsorEvent.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(sendSponsorEmailAction.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(sendSponsorEmailAction.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSponsor = action.payload;
        const index = state.items.findIndex(s => s._id === updatedSponsor._id);
        if (index !== -1) state.items[index] = updatedSponsor;
      })
      .addCase(sendSponsorEmailAction.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createSponsor.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createSponsor.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
        state.total += 1;
      })
      .addCase(createSponsor.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(updateSponsor.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateSponsor.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSponsor = action.payload;
        const index = state.items.findIndex(s => s._id === updatedSponsor._id);
        if (index !== -1) state.items[index] = updatedSponsor;
      })
      .addCase(updateSponsor.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export default sponsorsSlice.reducer;
