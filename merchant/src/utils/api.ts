import axios from 'axios';

const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'https://eattable.kr';
  }
  if (window.location.hostname === 'merchant.eattable.kr') {
    return 'https://eattable.kr';
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return 'https://eattable.kr';
};

export const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('merchantToken');
    if (token) {
      if (!config.headers) {
        config.headers = {} as any;
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('merchantToken');
      localStorage.removeItem('merchantData');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
