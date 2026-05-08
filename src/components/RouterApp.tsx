import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import SettingsScreen from '../screens/SettingsScreen.web';
import HostProfileScreen from '../screens/HostProfileScreen.web';
import OnboardingScreen from '../screens/OnboardingScreen.web';
import FAQScreen from '../screens/FAQScreen.web';
import TermsScreen from '../screens/TermsScreen.web';

// v2 피벗 화면
import RestaurantHomeScreen from '../screens/RestaurantHomeScreen.web';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen.web';
import ReservationFormScreen from '../screens/ReservationFormScreen.web';
// ReservationPaymentScreen는 PaymentScreen과 동일 컴포넌트 (line 16에서 이미 import)
const ReservationPaymentScreen = PaymentScreen;
import ReservationConfirmScreen from '../screens/ReservationConfirmScreen.web';
import MyReservationsScreenV2 from '../screens/MyReservationsScreen.web';
import WriteRestaurantReviewScreen from '../screens/WriteRestaurantReviewScreen.web';
import SearchRestaurantsScreen from '../screens/SearchRestaurantsScreen.web';

// Components
import BottomTabBar from './BottomTabBar';

const ONBOARDING_STORAGE_KEY = 'has_seen_onboarding_v2';

const RouterApp: React.FC = () => {
  const { user, isLoggedIn, login, logout, setUser, setToken } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  
  // 로그인 상태 확인
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    // 온보딩 확인
    try {
      const onboardingValue = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setHasSeenOnboarding(onboardingValue === 'true');
    } catch (_e) {
      setHasSeenOnboarding(true);
    }

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

  // screenName→path 매핑 (React Navigation 호환 네비게이션 어댑터)
  const screenRouteMap: Record<string, string | ((params?: any) => string)> = {
    Notifications: '/notifications',
    MeetupDetail: (p: any) => `/meetup/${p?.meetupId}`,
    CreateMeetup: '/create-meetup',
    Chat: (p: any) => `/chat/${p?.meetupId}?title=${encodeURIComponent(p?.meetupTitle || '')}`,
    Settings: '/settings',
    HostProfile: (p: any) => `/host-profile/${p?.userId}`,
    EditProfile: '/mypage',
    Profile: '/mypage',
    MyMeetups: '/my-meetups',
    Wishlist: '/wishlist',
    PointCharge: '/point-charge',
    MyReviews: '/my-reviews',
    RecentViews: '/recent-views',
    Notices: '/notices',
    FAQ: '/faq',
    Terms: '/terms',
    WriteReview: (p: any) => `/meetup/${p?.meetupId}`,
    DepositPayment: (p: any) => `/meetup/${p?.meetupId}/deposit-payment`,
    Explore: '/explore',
    Payment: '/payment',
    ReviewManagement: '/review-management',
    UserVerification: '/mypage',
    MyBadges: '/my-badges',
    OnboardingScreen: '/onboarding',
    Onboarding: '/onboarding',
    Home: '/home',
    RestaurantDetail: (p: any) => `/restaurant/${p?.restaurantId || p?.id}`,
    ReservationForm: (p: any) => `/reservation/${p?.restaurantId}`,
    ReservationPayment: (p: any) => `/payment/${p?.reservationId}`,
    ReservationConfirm: (p: any) => `/reservation-confirm/${p?.reservationId}`,
    MyReservations: '/my-reservations',
    SearchRestaurants: '/search-restaurants',
  };

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: COLORS.neutral.white,
        gap: '12px',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '24px',
        }}>
          🍚
        </div>
        <div style={{
          width: 120,
          height: 8,
          borderRadius: 4,
          backgroundColor: COLORS.neutral.light,
          overflow: 'hidden',
          position: 'relative' as const,
        }}>
          <div className="animate-shimmer" style={{
            width: '100%',
            height: '100%',
            borderRadius: 4,
          }} />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes
        user={user}
        isLoggedIn={isLoggedIn}
        hasSeenOnboarding={hasSeenOnboarding}
        handleLogout={handleLogout}
        screenRouteMap={screenRouteMap}
      />
    </Router>
  );
};

/** Router 내부 컴포넌트 — useNavigate() 사용 가능 */
const AppRoutes: React.FC<{
  user: any;
  isLoggedIn: boolean;
  hasSeenOnboarding: boolean;
  handleLogout: () => void;
  screenRouteMap: Record<string, string | ((params?: any) => string)>;
}> = ({ user, isLoggedIn, hasSeenOnboarding, handleLogout, screenRouteMap }) => {
  const routerNavigate = useNavigate();

  const getReactRouterNavigation = useMemo(() => () => ({
    navigate: (screenName: string, params?: any) => {
      const route = screenRouteMap[screenName];
      if (route) {
        const path = typeof route === 'function' ? route(params) : route;
        routerNavigate(path);
      }
    },
    navigateToNotifications: () => routerNavigate('/notifications'),
    goBack: () => routerNavigate(-1 as any),
    user,
  }), [routerNavigate, screenRouteMap, user]);

  const protectedElement = (children: React.ReactNode) =>
    isLoggedIn ? children : <Navigate to="/login" replace />;

  const loginRedirectElement = (children: React.ReactNode) =>
    isLoggedIn ? <Navigate to="/home" replace /> : children;

  const getNavigationProps = () => ({
    user,
    logout: handleLogout,
  });

  return (
    <View style={styles.container}>
      <Routes>
        {/* 공개 라우트들 - 로그인 불필요 */}
        <Route path="/advertisement/:id" element={<AdvertisementDetailScreen user={user} navigation={getReactRouterNavigation()} />} />
        <Route path="/notices" element={<NoticesScreen />} />
        <Route path="/notices/:id" element={<NoticeDetailScreen />} />
        <Route path="/faq" element={<FAQScreen />} />
        <Route path="/terms" element={<TermsScreen />} />

        {/* 보호된 라우트들 */}
        <Route path="/chat/:id" element={protectedElement(<MainLayout><ChatScreen {...getNavigationProps()} /></MainLayout>)} />
        <Route path="/meetup/:id/deposit-payment" element={protectedElement(<DepositPaymentScreen />)} />
        <Route path="/meetup/:id" element={protectedElement(<MeetupDetailScreen user={user} />)} />
        <Route path="/home" element={protectedElement(<MainLayout><RestaurantHomeScreen /></MainLayout>)} />
        <Route path="/legacy-home" element={protectedElement(<MainLayout><HomeScreen user={user} navigation={getReactRouterNavigation()} /></MainLayout>)} />
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
        <Route path="/host-profile/:userId" element={protectedElement(<HostProfileScreen />)} />
        <Route path="/settings" element={protectedElement(<SettingsScreen />)} />

        {/* v2 피벗: 매장/예약 라우트 */}
        <Route path="/restaurants" element={<Navigate to="/home" replace />} />
        <Route path="/restaurant/:id" element={protectedElement(<RestaurantDetailScreen />)} />
        <Route path="/reservation/:restaurantId" element={protectedElement(<ReservationFormScreen />)} />
        <Route path="/payment/:reservationId" element={protectedElement(<ReservationPaymentScreen />)} />
        <Route path="/reservation-confirm/:reservationId" element={protectedElement(<ReservationConfirmScreen />)} />
        <Route path="/my-reservations" element={protectedElement(<MainLayout><MyReservationsScreenV2 /></MainLayout>)} />
        <Route path="/write-restaurant-review/:reservationId" element={protectedElement(<WriteRestaurantReviewScreen />)} />
        <Route path="/search-restaurants" element={protectedElement(<MainLayout><SearchRestaurantsScreen /></MainLayout>)} />

        {/* 온보딩 페이지 */}
        <Route path="/onboarding" element={hasSeenOnboarding ? <Navigate to="/login" replace /> : <OnboardingScreen />} />

        {/* 로그인 페이지 */}
        <Route path="/login" element={loginRedirectElement(<LoginScreen />)} />

        {/* 루트 경로 - 온보딩 → 로그인 → 홈 순서로 리다이렉트 */}
        <Route path="/" element={
          !hasSeenOnboarding
            ? <Navigate to="/onboarding" replace />
            : isLoggedIn
              ? <Navigate to="/home" replace />
              : <Navigate to="/login" replace />
        } />

        {/* 404 — 로그인 안 됐으면 /login으로, 됐으면 /home으로 */}
        <Route path="*" element={isLoggedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
      </Routes>
    </View>
  );
};

// 메인 레이아웃 (하단 탭바 포함)
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.mainLayout}>
      <View style={styles.content}>
        {children}
      </View>
      {/* 고정 탭바 높이만큼 spacer */}
      <View style={{ height: 64 }} />
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