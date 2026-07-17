import axios from 'axios';

const resolveBaseURL = () => {
  if (process.env.REACT_APP_API_URL !== undefined) return process.env.REACT_APP_API_URL;
  if (process.env.NODE_ENV === 'production') return '';
  return 'http://127.0.0.1:8000';
};

const API = axios.create({
    baseURL: resolveBaseURL(),
});

// add token auto for each request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;