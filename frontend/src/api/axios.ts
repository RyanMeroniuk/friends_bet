
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: false,
});

// Intercept every request and inject the Authorization header
api.interceptors.request.use(config => {
  // Grab the full authUser JSON stashed at login
  const raw = localStorage.getItem('authUser');
  if (raw && config.headers) {
    try {
      const { token } = JSON.parse(raw);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // if parse fails, we just don’t set an auth header
    }
  }
  return config;
});

export default api;
