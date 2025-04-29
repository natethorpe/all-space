// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\request\index.js
import axios from 'axios';

const request = axios.create({ baseURL: 'http://localhost:8888/api' });

const getToken = () => {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}');
  console.log('Retrieved auth from localStorage:', auth);
  const token = auth.token || '';
  console.log('Using token:', token);
  return token;
};

request.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  console.log('Requesting:', config.url, 'with headers:', config.headers);
  return config;
});

request.list = ({ entity, options = {} }) => {
  const { page = 1, items = 10, q = '', fields = '' } = options;
  const url = `/${entity}?page=${page}&items=${items}&q=${q}&fields=${fields}`;
  return request.get(url).then((res) => {
    console.log(`List response for ${entity}:`, res.data);
    return res.data;
  });
};

request.listAll = ({ entity }) => {
  console.log('listAll called for entity:', entity);
  return request.get(`/${entity}/listAll`).then((res) => {
    console.log('listAll response:', res.data);
    return res.data;
  }).catch((err) => {
    console.log('listAll error:', err.response || err.message);
    throw err;
  });
};

request.summary = ({ entity }) => {
  console.log('summary called for entity:', entity);
  return request.get(`/${entity}/summary`).then((res) => {
    console.log('summary response:', res.data);
    return res.data;
  }).catch((err) => {
    console.log('summary error:', err.response || err.message);
    throw err;
  });
};

export const fetchSponsors = () => {
  console.log('fetchSponsors defined and called');
  return request.get('/sponsors').then((res) => {
    console.log('fetchSponsors response:', res.data);
    return res.data;
  });
};

export const fetchSummary = () => {
  console.log('fetchSummary defined and called');
  return request.get('/sponsors/summary').then((res) => {
    console.log('fetchSummary response:', res.data);
    return res.data;
  });
};

export const createSponsor = (data) => request.post('/sponsors', data).then((res) => res.data);
export const updateSponsor = (id, data) => request.put(`/sponsors/${id}`, data).then((res) => res.data);
export const deleteSponsor = (id) => request.delete(`/sponsors/${id}`).then((res) => res.data);
export const sendSponsorEmail = (sponsorId, data) =>
  request.post(`/sponsors/${sponsorId}/email`, data).then((res) => res.data);

export default request;
