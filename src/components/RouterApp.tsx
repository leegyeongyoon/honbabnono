import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';

// Screens
import HomeScreen from '../screens/HomeScreen.web';
import MyMeetupsScreen from '../screens/MyMeetupsScreen.web';
import ChatScreen from '../screens/ChatScreen.web';
import MyPageScreen from '../screens/MyPageScreen';
import LoginScreen from '../screens/LoginScreen.web';
import MeetupDetailScreen from '../screens/MeetupDetailScreen.web';
import CreateMeetupWizard from '../screens/CreateMeetupWizard.web';
import PaymentScreen from '../screens/PaymentScreen.web';
import DepositPaymentScreen from '../screens/DepositPaymentScreen.web';
import MeetupListScreen from '../screens/MeetupListScreen.web';
import MyActivitiesScreen from '../screens/MyActivitiesScreen.web';
import JoinedMeetupsScreen from '../screens/JoinedMeetupsScreen.web';
import WishlistScreen from '../screens/WishlistScreen.web';
import MyReviewsScreen from '../screens/MyReviewsScreen.web';
import ReviewManagementScreen from '../screens/ReviewManagementScreen.web';
import PointHistoryScreen from '../screens/PointHistoryScreen.web';
import PointChargeScreen from '../screens/PointChargeScreen.web';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen.web';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen.web';
import MyBadgesScreen from '../screens/MyBadgesScreen';
import PointBalanceScreen from '../screens/PointBalanceScreen';
import RecentViewsScreen from '../screens/RecentViewsScreen.web';
import BlockedUsersScreen from '../screens/BlockedUsersScreen.web';
import NotificationScreen from '../screens/NotificationScreen.web';
import AdvertisementDetailScreen from '../screens/AdvertisementDetailScreen';
import NoticesScreen from '../screens/NoticesScreen.web';
import NoticeDetailScreen from '../screens/NoticeDetailScreen.web';
import SearchScreen from '../screens/SearchScreen.web';
import AISearchResultScreen from '../screens/AISearchResultScreen.web';
import ExploreScreen from '../screens/ExploreScreen.web';

// Components
import BottomTabBar from './BottomTabBar';

const RouterApp: React.FC = () => {
  const { user, isLoggedIn, login, logout, setUser, setToken } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // 로그인 상태 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    // URL에서 토큰과 사용자 정보 확인 (카카오 로그인 후 리다이렉트)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    // testgy 프리뷰 모드: URL 파라미터로 플래그 저장
    if (urlParams.get('preview') === 'testgy') {
      localStorage.setItem('preview-mode', 'testgy');
    }
    const isPreviewMode = localStorage.getItem('preview-mode') === 'testgy';

    // 또는 localStorage에서 토큰 확인
    const storedToken = localStorage.getItem('token');

    // 완전한 로그아웃 (zustand persist 스토리지도 클리어)
    const fullLogout = () => {
      logout();
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('user-storage');
      } catch (_e) { /* ignore */ }
    };

    if (token && userParam) {
      // 카카오 로그인 성공 후 리다이렉트된 경우
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        login(userData, token);
      } catch (_e) {
        fullLogout();
      }
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoading(false);
    } else if (storedToken) {
      // 저장된 토큰이 있으면 서버에서 검증
      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/verify-token`;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: storedToken }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          // 토큰이 유효하면 자동 로그인
          login(data.user, storedToken);
        } else {
          // 토큰이 유효하지 않으면 완전 로그아웃 처리
          fullLogout();
        }
      } catch (error) {
        // 서버 오류 시 프리뷰 모드면 유지, 아니면 완전 로그아웃
        if (!isPreviewMode) {
          fullLogout();
        }
      }
      setIsLoading(false);
    } else if (isPreviewMode) {
      // testgy 프리뷰 모드 — DB 없이 더미 유저로 진입
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
      };
      localStorage.setItem('token', 'preview-testgy');
      localStorage.setItem('user', JSON.stringify(previewUser));
      login(previewUser as any, 'preview-testgy');
      setIsLoading(false);
    } else {
      // 토큰 없고 프리뷰도 아닌 경우 — 확실하게 로그아웃 상태 보장
      fullLogout();
      setIsLoading(false);
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    logout();
  };

  // fetchMeetups를 useCallback으로 안정화
  const fetchMeetups = useCallback(() => {
    const fetchFn = useMeetupStore.getState().fetchMeetups;
    fetchFn();
  }, []);

  // 로그인 성공 시 모임 목록 가져오기
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchMeetups();
    }
  }, [isLoggedIn, user, fetchMeetups]);

  // 보호된 라우트 헬퍼 (컴포넌트가 아닌 함수로 — 매 렌더 재생성 방지)
  const protectedElement = (children: React.ReactNode) => {
    return isLoggedIn ? children : <Navigate to="/login" replace />;
  };

  // 로그인된 사용자 리다이렉트 헬퍼
  const loginRedirectElement = (children: React.ReactNode) => {
    return isLoggedIn ? <Navigate to="/home" replace /> : children;
  };

  // 공통 네비게이션 props
  const getNavigationProps = () => ({
    user,
    logout: handleLogout,
  });

  // React Router 기반 네비게이션 객체
  const getReactRouterNavigation = () => ({
    navigate: (screenName: string, params?: any) => {
      if (screenName === 'Notifications') {
        window.location.href = '/notifications';
      } else if (screenName === 'MeetupDetail') {
        window.location.href = `/meetup/${params.meetupId}`;
      } else if (screenName === 'CreateMeetup') {
        window.location.href = '/create-meetup';
      } else if (screenName === 'Chat') {
        window.location.href = `/chat/${params.meetupId}?title=${encodeURIComponent(params.meetupTitle)}`;
      }
    },
    navigateToNotifications: () => {
      window.location.href = '/notifications';
    },
    goBack: () => {
      window.history.back();
    },
    user: user
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
        backgroundColor: COLORS.neutral.white
      }}>
        <div style={{
          fontSize: '16px',
          color: COLORS.text.primary
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
          {/* 공개 라우트들 - 로그인 불필요 */}
          <Route path="/advertisement/:id" element={<AdvertisementDetailScreen user={user} navigation={getReactRouterNavigation()} />} />
          <Route path="/notices" element={<NoticesScreen />} />
          <Route path="/notices/:id" element={<NoticeDetailScreen />} />

          {/* 보호된 라우트들 */}
          <Route path="/chat/:id" element={protectedElement(<MainLayout><ChatScreen {...getNavigationProps()} /></MainLayout>)} />
          <Route path="/meetup/:id/deposit-payment" element={protectedElement(<DepositPaymentScreen />)} />
          <Route path="/meetup/:id" element={protectedElement(<MeetupDetailScreen user={user} />)} />
          <Route path="/home" element={protectedElement(<MainLayout><HomeScreen user={user} navigation={getReactRouterNavigation()} /></MainLayout>)} />
          <Route path="/search" element={protectedElement(<MainLayout><SearchScreen user={user} navigation={getReactRouterNavigation()} /></MainLayout>)} />
          <Route path="/ai-search" element={protectedElement(<AISearchResultScreen user={user} navigation={getReactRouterNavigation()} />)} />
          <Route path="/notifications" element={protectedElement(<MainLayout><NotificationScreen user={user} navigation={getReactRouterNavigation()} /></MainLayout>)} />
          <Route path="/my-meetups" element={protectedElement(<MainLayout><MyMeetupsScreen user={user} /></MainLayout>)} />
          <Route path="/chat" element={protectedElement(<MainLayout><ChatScreen user={user} /></MainLayout>)} />
          <Route path="/mypage" element={protectedElement(<MainLayout><MyPageScreen user={user} onLogout={handleLogout} /></MainLayout>)} />
          <Route path="/create-meetup" element={protectedElement(<CreateMeetupWizard user={user} />)} />
          <Route path="/explore" element={protectedElement(<MainLayout><ExploreScreen /></MainLayout>)} />
          <Route path="/meetup-list" element={protectedElement(<MeetupListScreen />)} />
          <Route path="/payment" element={protectedElement(<PaymentScreen />)} />
          <Route path="/my-activities" element={protectedElement(<MyActivitiesScreen />)} />
          <Route path="/wishlist" element={protectedElement(<WishlistScreen />)} />
          <Route path="/my-reviews" element={protectedElement(<MyReviewsScreen />)} />
          <Route path="/joined-meetups" element={protectedElement(<JoinedMeetupsScreen />)} />
          <Route path="/point-history" element={protectedElement(<PointHistoryScreen />)} />
          <Route path="/point-charge" element={protectedElement(<PointChargeScreen />)} />
          <Route path="/review-management" element={protectedElement(<ReviewManagementScreen />)} />
          <Route path="/notification-settings" element={protectedElement(<NotificationSettingsScreen />)} />
          <Route path="/privacy-settings" element={protectedElement(<PrivacySettingsScreen />)} />
          <Route path="/my-badges" element={protectedElement(<MyBadgesScreen />)} />
          <Route path="/point-balance" element={protectedElement(<PointBalanceScreen />)} />
          <Route path="/recent-views" element={protectedElement(<RecentViewsScreen />)} />
          <Route path="/blocked-users" element={protectedElement(<BlockedUsersScreen />)} />

          {/* 로그인 페이지 */}
          <Route path="/login" element={loginRedirectElement(<LoginScreen />)} />

          {/* 루트 경로 - 로그인 상태에 따라 리다이렉트 */}
          <Route path="/" element={isLoggedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />

          {/* 404 — 로그인 안 됐으면 /login으로, 됐으면 /home으로 */}
          <Route path="*" element={isLoggedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
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