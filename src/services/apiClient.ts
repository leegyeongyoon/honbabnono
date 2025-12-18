import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API 기본 URL을 런타임에 동적으로 설정
const getApiBaseUrl = (): string => {
  // 1. 환경변수가 설정되어 있으면 사용
  if (process.env.REACT_APP_API_URL) {
    console.log('🔧 Using API URL from env:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // React Native 환경 감지
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    console.log('🔧 Detecting API URL for hostname:', hostname);
    
    // 2. localhost 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const url = 'http://localhost:3001/api';
      console.log('🔧 Using localhost API URL:', url);
      return url;
    }
    
    // 3. 프로덕션 환경 - nginx 프록시를 통한 /api 경로
    const url = `${window.location.origin}/api`;
    console.log('🔧 Using production API URL:', url);
    return url;
  }
  
  // React Native 환경이나 SSR fallback
  const url = 'http://localhost:3001/api';
  console.log('🔧 Using React Native/SSR fallback API URL:', url);
  return url;
};

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage helper - Web과 React Native 호환
const getStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  } catch (error) {
    console.warn('Storage access failed:', error);
    return null;
  }
};

const removeStorageItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Storage remove failed:', error);
  }
};

// 요청 인터셉터: 토큰 자동 추가
apiClient.interceptors.request.use(
  (config: any) => {
    const token = getStorageItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🌐 API 요청: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
      hasToken: !!token
    });
    
    return config;
  },
  (error) => {
    console.error('❌ API 요청 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API 응답: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ API 응답 오류: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      data: error.response?.data
    });

    // 401 Unauthorized: 토큰 만료 또는 무효
    if (error.response?.status === 401) {
      console.log('🔐 인증 토큰 무효, 로그아웃 처리');
      removeStorageItem('token');
      removeStorageItem('user');
      
      // Web 환경에서 로그인 페이지로 리다이렉트
      if (typeof window !== 'undefined' && window.location) {
        console.log('🔄 로그인 페이지로 리다이렉트');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;