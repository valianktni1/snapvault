import axios from 'axios';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('snapvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('snapvault_token');
      localStorage.removeItem('snapvault_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
