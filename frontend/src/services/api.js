import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // always send the session cookie
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error?.message || 'Something went wrong';
    const status = err.response?.status;
    // 401 = not authenticated (handled by each page individually)
    // 404 = not found (usually handled inline)
    if (status !== 401 && status !== 404) {
      toast.error(message);
    }
    return Promise.reject(err);
  }
);

export default api;
