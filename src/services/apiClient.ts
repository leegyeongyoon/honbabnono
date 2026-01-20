import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import storage from '../utils/storage';

// 사용 가능한 API 서버 IP 목록 (우선순위 순)
export const API_HOSTS = [
  '172.16.1.74',    // 현재 네트워크
  '192.168.0.101',  // 이전 네트워크
  'localhost',      // 시뮬레이터용
];

// 현재 활성화된 API 호스트 저장
let activeApiHost: string | null = null;

// API 호스트를 찾는 함수
export const findWorkingApiHost = async (): Promise<string> => {
  // 이미 활성화된 호스트가 있으면 반환
  if (activeApiHost) {
    return activeApiHost;
  }

  for (const host of API_HOSTS) {
    try {
      const testUrl = `http://${host}:3001/api/health`;
      console.log(`🔍 Testing API host: ${host}`);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        activeApiHost = host;
        console.log(`✅ Found working API host: ${host}`);
        return host;
      }
    } catch (error) {
      console.log(`❌ API host ${host} not reachable`);
    }
  }

  // 기본값으로 첫 번째 호스트 반환
  console.log('⚠️ No working host found, using default:', API_HOSTS[0]);
  return API_HOSTS[0];
};

// 현재 API Base URL 가져오기
export const getApiBaseUrl = (): string => {
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
  // 활성화된 호스트가 있으면 사용, 없으면 첫 번째 호스트 사용
  const host = activeApiHost || API_HOSTS[0];
  const url = `http://${host}:3001/api`;
  console.log('🔧 Using React Native/SSR fallback API URL:', url);
  return url;
};

// API 호스트 설정 함수 (외부에서 호출 가능)
export const setActiveApiHost = (host: string) => {
  activeApiHost = host;
  // baseURL 업데이트
  apiClient.defaults.baseURL = `http://${host}:3001/api`;
  console.log('🔧 API host updated to:', host);
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
const getStorageItem = async (key: string): Promise<string | null> => {
  return await storage.getItem(key);
};

const removeStorageItem = async (key: string): Promise<void> => {
  return await storage.removeItem(key);
};

// 요청 인터셉터: 토큰 자동 추가
apiClient.interceptors.request.use(
  async (config: any) => {
    const token = await getStorageItem('token');
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
  async (error) => {
    console.error(`❌ API 응답 오류: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      data: error.response?.data
    });

    // 401 Unauthorized: 토큰 만료 또는 무효
    if (error.response?.status === 401) {
      console.log('🔐 인증 토큰 무효, 로그아웃 처리');
      await removeStorageItem('token');
      await removeStorageItem('user');
      
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