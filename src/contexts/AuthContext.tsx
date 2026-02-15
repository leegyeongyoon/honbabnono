import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUserStore } from '../store/userStore';
import storage from '../utils/storage';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// 토큰 유효성 검증 함수
const validateTokenWithServer = async (token: string): Promise<boolean> => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/user/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // 서버 에러(5xx)나 네트워크 문제 시에도 토큰이 있으면 유효로 간주 (오프라인 지원)
    if (!response.ok && response.status >= 500) {
      return !!token;
    }
    return response.ok;
  } catch (error) {
    return !!token;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, logout, user } = useUserStore();

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      // 저장된 토큰과 사용자 정보 확인
      const token = await storage.getItem('token');
      const userStr = await storage.getItem('user');

      if (token && userStr) {
        // 서버에 토큰 유효성 검증
        const isValidToken = await validateTokenWithServer(token);

        if (isValidToken) {
          try {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setIsAuthenticated(true);
          } catch (error) {
            await clearAuthData();
          }
        } else {
          await clearAuthData();
        }
      } else {
        // testgy 프리뷰 모드
        // URL에 ?preview=testgy가 있으면 플래그 저장
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('preview') === 'testgy') {
            localStorage.setItem('preview-mode', 'testgy');
          }
        }
        // 플래그가 있으면 인증 우회
        const previewFlag = typeof window !== 'undefined' ? localStorage.getItem('preview-mode') : null;
        if (previewFlag === 'testgy') {
          const previewUser = {
            id: '999',
            name: '경윤(테스트)',
            email: 'testgy@preview.local',
            provider: 'preview',
            isVerified: true,
            babAlScore: 75,
            meetupsHosted: 3,
            meetupsJoined: 12,
            rating: 4.5,
            createdAt: '2024-01-01',
          } as any;
          await storage.setItem('token', 'preview-testgy');
          await storage.setItem('user', JSON.stringify(previewUser));
          setUser(previewUser);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 데이터 초기화 함수
  const clearAuthData = async () => {
    try {
      await storage.removeItem('token');
      await storage.removeItem('user');
      // zustand persist가 사용하는 키도 정리
      await storage.removeItem('user-storage');
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      // silently handle error
      setIsAuthenticated(false);
    }
  };

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuthStatus();
      setIsInitialized(true);
    };
    initAuth();
  }, []);

  // user store 변화 감지 - 초기화 완료 후에만 적용
  // (zustand persist 복원 시 user가 있어도 토큰 검증 전에는 무시)
  useEffect(() => {
    if (isInitialized) {
      setIsAuthenticated(!!user);
    }
  }, [user, isInitialized]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};