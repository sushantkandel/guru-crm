import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const APP_BASE = import.meta.env.BASE_URL || '/';

function appPath(path) {
  const base = APP_BASE.endsWith('/') ? APP_BASE : `${APP_BASE}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = appPath('login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
