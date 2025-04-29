// Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\grokSlice.js
// Historical Note: Created April 6, 2025, to manage Grok state in IDURAR frontend for xAI integration.
// Future Direction: Add thunks for more Grok features (e.g., email drafting, trend prediction).
// Dependencies: @reduxjs/toolkit (for createSlice, createAsyncThunk), axios (for API calls).
// Connections: Links to /api/grok/* endpoints in backend; used by GrokAnalyzer component.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const analyzeData = createAsyncThunk('grok/analyze', async (data) => {
  const response = await axios.post('http://localhost:8888/api/grok/analyze', { data });
  return response.data.result;
});

export const uploadFile = createAsyncThunk('grok/upload', async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post('http://localhost:8888/api/grok/upload', formData);
  return response.data.result;
});

const grokSlice = createSlice({
  name: 'grok',
  initialState: { result: '', loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(analyzeData.pending, (state) => { state.loading = true; })
      .addCase(analyzeData.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      })
      .addCase(analyzeData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(uploadFile.pending, (state) => { state.loading = true; })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export default grokSlice.reducer;
