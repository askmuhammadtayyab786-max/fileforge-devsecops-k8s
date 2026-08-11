import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Add Request Interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error normalization
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export const getFiles = (params = {}) =>
  api.get('/files', { params });

export const getFile = (fileId) =>
  api.get(`/files/${fileId}`);

export const getStats = () =>
  api.get('/files/stats/summary');

export const deleteFile = (fileId) =>
  api.delete(`/files/${fileId}`);

export const getDownloadUrl = (fileId) =>
  `${BASE_URL}/files/${fileId}/download`;

export const uploadFiles = (formData, onProgress) =>
  api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    timeout: 120000,
  });

export default api;
