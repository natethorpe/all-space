/*
 * File Path: frontend/src/config/serverApiConfig.js
 * Purpose: Configures API base URL for Allur Space Console frontend requests.
 * How It Works:
 *   - Exports BASE_URL, API_BASE_URL, and other URLs for use in API calls (e.g., axios in useTasks.js).
 *   - Configures axios instance with Authorization header for authenticated requests.
 * Dependencies:
 *   - axios: HTTP client (version 1.7.7).
 * Why It’s Here:
 *   - Centralizes API configuration for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized with localhost:8888 (Nate).
 *   - 05/04/2025: Removed trailing slash from BASE_URL (Grok).
 *   - 05/04/2025: Updated API_BASE_URL for /api/grok prefix (Grok).
 *     - Why: 404 errors on GET /tasks and POST /edit due to missing /api/grok prefix (User, 05/04/2025).
 *     - How: Changed API_BASE_URL to 'http://localhost:8888/api/grok/', preserved other URLs.
 *     - Test: Load /grok, verify GET /api/grok/tasks and POST /api/grok/edit succeed, no 404 errors.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok, submit task.
 *   - Verify GET /api/grok/tasks and POST /api/grok/edit return 200 OK.
 *   - Check console for no 404 errors in useTasks.js or TaskInput.jsx.
 * Rollback Instructions:
 *   - Revert to serverApiConfig.js.bak (`mv frontend/src/config/serverApiConfig.js.bak frontend/src/config/serverApiConfig.js`).
 *   - Verify /grok loads (may have 404 errors).
 * Future Enhancements:
 *   - Support environment-based URLs (Sprint 4).
 *   - Add API versioning (Sprint 5).
 */

import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE === 'remote'
    ? import.meta.env.VITE_BACKEND_SERVER + 'api/grok/'
    : 'http://localhost:8888/api/grok/';
export const BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER
    : 'http://localhost:8888';
export const WEBSITE_URL = import.meta.env.PROD
  ? 'http://cloud.idurarapp.com/'
  : 'http://localhost:3000/';
export const DOWNLOAD_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER + 'download/'
    : 'http://localhost:8888/download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';
export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const authData = JSON.parse(localStorage.getItem('auth'));
    if (authData?.token) {
      config.headers.Authorization = `Bearer ${authData.token}`;
      console.log('Added Authorization header:', config.headers.Authorization);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
