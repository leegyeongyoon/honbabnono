import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';

// Screens
import HomeScreen from '../screens/HomeScreen.web';
import SearchScreen from '../screens/SearchScreen.web';
import ChatScreen from '../screens/ChatScreen.web';
import MyPageScreen from '../screens/MyPageScreen';
import LoginScreen from '../screens/LoginScreen.web';
import MeetupDetailScreen from '../screens/MeetupDetailScreen.web';
import CreateMeetupScreen from '../screens/CreateMeetupScreen.web';

// Components
import BottomTabBar from './BottomTabBar';

const RouterApp: React.FC = () => {
  const { user, isLoggedIn, login, logout, setUser, setToken } = useUserStore();
  const { fetchMeetups } = useMeetupStore();
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('RouterApp rendering, isLoggedIn:', isLoggedIn, 'isLoading:', isLoading, 'current path:', window.location.pathname);

  // 로그인 상태 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    console.log('checkLoginStatus called');
    // URL에서 토큰과 사용자 정보 확인 (카카오 로그인 후 리다이렉트)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    
    // 또는 localStorage에서 토큰 확인
    const storedToken = localStorage.getItem('token');
    
    console.log('🔍 RouterApp 초기화:', {
      hasToken: !!token,
      hasUserParam: !!userParam,
      hasStoredToken: !!storedToken,
      tokenLength: storedToken?.length,
      currentPath: window.location.pathname
    });

    if (token && userParam) {
      // 카카오 로그인 성공 후 리다이렉트된 경우
      const userData = JSON.parse(decodeURIComponent(userParam));
      login(userData, token);
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoading(false);
    } else if (storedToken) {
      // 저장된 토큰이 있으면 서버에서 검증
      console.log('Found stored token, verifying with server...');
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/verify-token`;
      console.log('📡 Sending verify-token request to:', apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: storedToken }),
        });

        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📡 Response data:', data);

        if (data.success) {
          // 토큰이 유효하면 자동 로그인
          console.log('✅ 자동 로그인 성공:', data.user.email);
          login(data.user, storedToken);
        } else {
          // 토큰이 유효하지 않으면 로그아웃 처리
          console.log('❌ 토큰 무효, 로그아웃 처리:', data.error);
          logout();
        }
      } catch (error) {
        // 네트워크 오류 등의 경우 로그아웃 처리
        console.error('📡 verify-token 요청 실패:', error);
        console.error('토큰 검증 오류:', error);
        logout();
      }
      setIsLoading(false);
    } else {
      // 토큰이 없으면 로그인되지 않은 상태
      console.log('No token found, staying logged out');
      setIsLoading(false);
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    logout();
  };

  // 로그인 성공 시 모임 목록 가져오기
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchMeetups();
    }
  }, [isLoggedIn, user]);

  // 보호된 라우트 컴포넌트
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('ProtectedRoute: isLoggedIn =', isLoggedIn);
    return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
  };

  // 로그인된 사용자 리다이렉트 컴포넌트
  const LoginRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return isLoggedIn ? <Navigate to="/home" replace /> : <>{children}</>;
  };

  // 공통 네비게이션 props
  const getNavigationProps = () => ({
    user,
    logout: handleLogout,
  });

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          fontSize: '16px',
          color: '#333333'
        }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <View style={styles.container}>
        <Routes>
          {/* 보호된 라우트들 - 구체적인 경로부터 먼저 */}
          <Route 
            path="/chat/:id" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ChatScreen {...getNavigationProps()} />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/meetup/:id" 
            element={
              <ProtectedRoute>
                <MeetupDetailScreen user={user} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <HomeScreen user={user} />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/search" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SearchScreen user={user} />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ChatScreen user={user} />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/mypage" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MyPageScreen user={user} onLogout={handleLogout} />
                </MainLayout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/create-meetup" 
            element={
              <ProtectedRoute>
                <CreateMeetupScreen user={user} />
              </ProtectedRoute>
            } 
          />

          {/* 로그인 페이지 */}
          <Route 
            path="/login" 
            element={
              <LoginRedirect>
                <LoginScreen />
              </LoginRedirect>
            } 
          />

          {/* 루트 경로 - 로그인 상태에 따라 리다이렉트 */}
          <Route 
            path="/" 
            element={
              isLoggedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
            } 
          />

          {/* 404 페이지 - 가장 마지막에 위치 */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </View>
    </Router>
  );
};

// 메인 레이아웃 (하단 탭바 포함)
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.mainLayout}>
      <View style={styles.content}>
        {children}
      </View>
      <BottomTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  mainLayout: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default RouterApp;