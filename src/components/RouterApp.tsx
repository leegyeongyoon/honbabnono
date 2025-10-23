import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('RouterApp rendering, isLoggedIn:', isLoggedIn, 'isLoading:', isLoading, 'current path:', window.location.pathname);

  // 로그인 상태 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    console.log('checkLoginStatus called');
    // URL에서 토큰과 사용자 정보 확인 (카카오 로그인 후 리다이렉트)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    
    // 또는 localStorage에서 토큰 확인
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && userParam) {
      // 카카오 로그인 성공 후 리다이렉트된 경우
      localStorage.setItem('token', token);
      localStorage.setItem('user', userParam);
      setIsLoggedIn(true);
      setUser(JSON.parse(decodeURIComponent(userParam)));
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (storedToken && storedUser) {
      // 이미 로그인된 경우
      console.log('Found stored credentials');
      setIsLoggedIn(true);
      setUser(JSON.parse(storedUser));
    } else {
      // 임시: 테스트용 기본 사용자 설정
      console.log('Setting test user');
      const testUser = {
        id: '11111111-1111-1111-1111-111111111111',
        name: '테스트유저1',
        email: 'test1@test.com'
      };
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify(testUser));
      setIsLoggedIn(true);
      setUser(testUser);
    }
    
    setIsLoading(false);
  };

  // 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

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