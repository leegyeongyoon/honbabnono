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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser, user } = useUserStore();

  const checkAuthStatus = async () => {
    console.log('🔐 [AuthContext] checkAuthStatus 시작');
    try {
      setIsLoading(true);
      
      // 저장된 토큰과 사용자 정보 확인
      const token = await storage.getItem('token');
      const userStr = await storage.getItem('user');
      
      console.log('🔐 [AuthContext] 인증 상태 확인:', { hasToken: !!token, hasUser: !!userStr, token: token?.substring(0, 10) + '...', userStr: userStr?.substring(0, 50) + '...' });
      
      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setIsAuthenticated(true);
          console.log('✅ [AuthContext] 자동 로그인 성공:', userData.name);
        } catch (error) {
          console.error('❌ [AuthContext] 사용자 데이터 파싱 실패:', error);
          // 잘못된 데이터 정리
          await storage.removeItem('token');
          await storage.removeItem('user');
          setIsAuthenticated(false);
        }
      } else {
        console.log('❌ [AuthContext] 로그인 정보 없음');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ [AuthContext] 인증 상태 확인 실패:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      console.log('🔐 [AuthContext] checkAuthStatus 완료, isAuthenticated:', isAuthenticated);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // user store 변화 감지
  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

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