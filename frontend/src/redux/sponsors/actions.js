/*
 * File: actions.js
 * Path: frontend/src/redux/sponsors/actions.js
 * Purpose: Redux action creators for sponsor-related operations.
 * Functionality:
 *   - Defines thunks for loading, updating, and managing sponsors/events.
 * Structure:
 *   - Uses createAsyncThunk for async Redux actions.
 * Dependencies:
 *   - @reduxjs/toolkit: createAsyncThunk.
 *   - request/request: API utility (api).
 * Connections:
 *   - Used by: useSponsorDashboard.js (loadSponsors, loadSummary), handlers.js (updateSponsor).
 *   - Depends on: reducer.js (state updates).
 * Updates:
 *   - 04/07/2025 (Grok 3): No changes—verified alignment with backend routes.
 *     - Why: Edit/update actions 404’d due to missing PUT—backend fixed.
 *     - How: Confirmed updateSponsor uses PUT /sponsors/:id.
 *     - Impact: Full CRUD support with new backend routes.
 * Future Enhancements:
 *   - Add batch sponsor updates.
 *   - Include event deletion action.
 * Known Issues:
 *   - None post-backend fixes; previously blocked by missing PUT.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/request/request';

export const loadSponsors = createAsyncThunk(
  'sponsors/loadSponsors',
  async (params, { rejectWithValue }) => {
    console.log('loadSponsors - Requesting sponsors with params:', params);
    try {
      const response = await api.get('/sponsors', { params });
      console.log('loadSponsors - Backend response:', response.data);
      return response.data;
    } catch (error) {
      console.error('loadSponsors - Request error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const loadSummary = createAsyncThunk(
  'sponsors/loadSummary',
  async (_, { rejectWithValue }) => {
    console.log('loadSummary - Requesting summary');
    try {
      const response = await api.get('/sponsors/summary');
      console.log('loadSummary - Backend response:', response.data);
      return response.data;
    } catch (error) {
      console.error('loadSummary - Request error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const addSponsorEvent = createAsyncThunk(
  'sponsors/addSponsorEvent',
  async ({ sponsorId, eventData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/sponsors/${sponsorId}/schedule`, eventData);
      return response.data.result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateSponsorEvent = createAsyncThunk(
  'sponsors/updateSponsorEvent',
  async ({ sponsorId, eventId, eventData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/sponsors/${sponsorId}/schedule/${eventId}`, eventData);
      return response.data.result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendSponsorEmailAction = createAsyncThunk(
  'sponsors/sendSponsorEmail',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await api.post(`/sponsors/${emailData.sponsorId}/email`, emailData);
      return response.data.result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createSponsor = createAsyncThunk(
  'sponsors/createSponsor',
  async (sponsorData, { rejectWithValue }) => {
    try {
      const response = await api.post('/sponsors', sponsorData);
      return response.data.result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateSponsor = createAsyncThunk(
  'sponsors/updateSponsor',
  async (sponsorData, { rejectWithValue }) => {
    try {
      const response = await api.put(`/sponsors/${sponsorData._id}`, sponsorData);
      console.log('updateSponsor - Backend response:', response.data);
      return response.data.result;
    } catch (error) {
      console.error('updateSponsor error:', error.message);
      return rejectWithValue(error.message);
    }
  }
);
