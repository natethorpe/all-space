// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\config\serverApiConfig.js
import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE === 'remote'
    ? import.meta.env.VITE_BACKEND_SERVER + 'api/'
    : 'http://localhost:8888/api/';
export const BASE_URL =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE
    ? import.meta.env.VITE_BACKEND_SERVER
    : 'http://localhost:8888/';
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
