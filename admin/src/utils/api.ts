import axios from 'axios';

// 환경에 따른 API URL 설정
const getApiBaseUrl = (): string => {
  // 서버사이드 렌더링이나 빌드 타임에는 window가 없을 수 있음
  if (typeof window === 'undefined') {
    return 'https://honbabnono.com'; // 기본값을 프로덕션 URL로 설정
  }
  
  // 프로덕션 환경에서 admin.honbabnono.com으로 접속한 경우
  if (window.location.hostname === 'admin.honbabnono.com') {
    return 'https://honbabnono.com';
  }
  
  // 로컬 개발 환경
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // 기타 환경 (fallback)
  return 'https://honbabnono.com';
};

// 런타임에 동적으로 API URL을 가져오는 함수
const getApiUrl = () => getApiBaseUrl();

// 레거시 호환성을 위한 export (사용되는 곳이 있을 수 있음)
export const API_BASE_URL = getApiUrl();

// Axios 인스턴스 생성
const apiClient = axios.create({
  timeout: 10000,
});

// 요청 인터셉터: 모든 요청에 Authorization 헤더 및 baseURL 동적 설정
apiClient.interceptors.request.use(
  (config) => {
    // 런타임에 baseURL 설정
    config.baseURL = getApiBaseUrl();
    
    const token = localStorage.getItem('adminToken');
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 에러 시 로그아웃 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰이 만료되거나 유효하지 않은 경우
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };