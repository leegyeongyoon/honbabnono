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
    // /api/user/me 엔드포인트로 토큰 유효성 검증
    const response = await fetch(`${apiUrl}/user/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔐 [AuthContext] 토큰 검증 응답:', response.status);
    return response.ok;
  } catch (error) {
    console.error('🔐 [AuthContext] 토큰 검증 실패:', error);
    return false;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, logout, user } = useUserStore();

  const checkAuthStatus = async () => {
    console.log('🔐 [AuthContext] checkAuthStatus 시작');
    try {
      setIsLoading(true);

      // 저장된 토큰과 사용자 정보 확인
      const token = await storage.getItem('token');
      const userStr = await storage.getItem('user');

      console.log('🔐 [AuthContext] 인증 상태 확인:', { hasToken: !!token, hasUser: !!userStr });

      if (token && userStr) {
        // 서버에 토큰 유효성 검증
        console.log('🔐 [AuthContext] 서버에 토큰 유효성 검증 중...');
        const isValidToken = await validateTokenWithServer(token);

        if (isValidToken) {
          try {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setIsAuthenticated(true);
            console.log('✅ [AuthContext] 토큰 검증 성공, 자동 로그인:', userData.name);
          } catch (error) {
            console.error('❌ [AuthContext] 사용자 데이터 파싱 실패:', error);
            await clearAuthData();
          }
        } else {
          console.log('❌ [AuthContext] 토큰이 만료되었거나 유효하지 않음, 로그아웃 처리');
          await clearAuthData();
        }
      } else {
        console.log('❌ [AuthContext] 로그인 정보 없음');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ [AuthContext] 인증 상태 확인 실패:', error);
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
      console.log('🔐 [AuthContext] 인증 데이터 초기화 완료');
    } catch (error) {
      console.error('❌ [AuthContext] 인증 데이터 초기화 실패:', error);
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