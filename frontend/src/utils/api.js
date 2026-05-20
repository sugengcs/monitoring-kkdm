
import axios from 'axios';

const resolvedBase =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

console.log(
  'VITE_API_URL =',
  import.meta.env.VITE_API_URL,
  '→ baseURL =',
  resolvedBase
);

const api = axios.create({
  baseURL: resolvedBase,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    // FORCE realtime request
    config.params = {
      ...config.params,
      _t: Date.now(),
    };

    // Anti cache
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );

    return config;
  },
  (error) => {
    console.error('[API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('[API] Response Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });

    return Promise.reject(error);
  }
);

export default api;