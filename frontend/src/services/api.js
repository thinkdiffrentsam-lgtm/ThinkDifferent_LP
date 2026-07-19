import axios from 'axios';

const api = axios.create({
  // Point to the Render backend in production, otherwise use empty string (Vite proxy)
  baseURL: import.meta.env.PROD ? 'https://thinkdifferent-lp-2.onrender.com' : '', 
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
