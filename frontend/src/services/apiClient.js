
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {

      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/auth/');
      
      if (!isAuthPage) {

        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/auth/sign-in';
      } else {

        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;