import axios from 'axios';

const api = axios.create({
  baseURL: 'https://thinkdifferent-lp-2.onrender.com/api', // Empty baseUrl ensures requests match local domain and hit Vite's port 3000 proxy (/api)
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
