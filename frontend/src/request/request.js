// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\request\request.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8888/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const auth = JSON.parse(window.localStorage.getItem('auth') || '{}');
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
    console.log('Applying token to request:', auth.token);
  } else {
    console.log('No token found in localStorage');
  }
  console.log('Request config:', config);
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Response error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

const fetchSponsors = async (params) => {
  const response = await api.get('/sponsors', { params });
  console.log('fetchSponsors response:', response.data);
  return response.data;
};

const fetchSummary = async () => {
  const response = await api.get('/sponsors/summary');
  console.log('fetchSummary response:', response.data);
  return response.data;
};

const sendSponsorEmail = async (sponsorId, emailData) => {
  const response = await api.post(`/sponsors/${sponsorId}/email`, emailData); // Fixed endpoint
  console.log('sendSponsorEmail response:', response.data);
  return response.data;
};

const post = async (url, data) => {
  const response = await api.post(url, data);
  console.log('post response:', response.data);
  return response.data;
};

export default {
  fetchSponsors,
  fetchSummary,
  sendSponsorEmail,
  get: api.get,
  post,
  put: api.put,
  delete: api.delete,
};
