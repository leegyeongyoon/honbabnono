import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {COLORS} from '../styles/colors';
import {SPACING} from '../styles/spacing';
import NavIcon from './NavIcon';
import HomeScreen from '../screens/HomeScreen.web';
import ExploreScreen from '../screens/ExploreScreen.web';
import ChatScreen from '../screens/ChatScreen.web';
import MyMeetupsScreen from '../screens/MyMeetupsScreen.web';
import MyPageScreen from '../screens/MyPageScreen';
import LoginScreen from '../screens/LoginScreen.web';
import MeetupDetailScreen from '../screens/MeetupDetailScreen';
import CreateMeetupScreen from '../screens/CreateMeetupScreen.web';
import AdvertisementDetailScreen from '../screens/AdvertisementDetailScreen';
import apiClient from '../services/apiClient';
import chatService from '../services/chatService';

const WebTabNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('login'); // 기본을 로그인으로 변경
  const [screenParams, setScreenParams] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  const tabs = [
    {key: 'Home', title: '홈', navIcon: 'home' as const, component: HomeScreen},
    {key: 'Explore', title: '탐색', navIcon: 'explore' as const, component: ExploreScreen},
    {key: 'Chat', title: '채팅', navIcon: 'chat' as const, component: ChatScreen},
    {key: 'MyMeetups', title: '내약속', navIcon: 'mymeetups' as const, component: MyMeetupsScreen},
    {key: 'MyPage', title: '마이페이지', navIcon: 'mypage' as const, component: MyPageScreen},
  ];

  // 로그인 상태 확인 및 URL 라우팅 (페이지 로드 시)
  useEffect(() => {
    checkLoginStatus();
    
    // 브라우저 뒤로가기/앞으로가기 처리
    const handlePopState = () => {
      handleUrlChange();
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 로그인 상태가 변경될 때마다 URL 처리
  useEffect(() => {
    handleUrlChange();
  }, [isLoggedIn]);

  // 알림 및 채팅 읽지 않은 상태 가져오기
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchUnreadStatus = async () => {
      try {
        const chatRes = await apiClient.get('/chat/unread-count');
        if (chatRes.data.success) {
          setHasUnreadChats((chatRes.data.unreadCount || 0) > 0);
        }
      } catch {
        // 무시
      }
      try {
        const notiRes = await apiClient.get('/notifications/unread-count');
        if (notiRes.data.success) {
          setHasUnreadNotifications((notiRes.data.unreadCount || 0) > 0);
        }
      } catch {
        // 알림 API가 없을 수 있으므로 데모 목적으로 true 설정
        setHasUnreadNotifications(true);
      }
    };

    fetchUnreadStatus();

    chatService.connect();
    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      setHasUnreadChats((data.unreadCount || 0) > 0);
    };
    chatService.onUnreadCountUpdated(handleUnreadCountUpdate);

    const interval = setInterval(fetchUnreadStatus, 30 * 1000);
    return () => {
      clearInterval(interval);
      chatService.offUnreadCountUpdated(handleUnreadCountUpdate);
    };
  }, [isLoggedIn]);

  // URL 변경을 감지하기 위한 추가 effect
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== window.lastCheckedPath) {
        window.lastCheckedPath = currentPath;
        handleUrlChange();
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // URL 변경 처리
  const handleUrlChange = () => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // 루트 경로 처리 - 로그인 상태에 따라 분기
    if (path === '/') {
      if (isLoggedIn) {
        window.history.replaceState({}, '', '/home');
        setCurrentScreen('tabs');
        setActiveTab('Home');
      } else {
        window.history.replaceState({}, '', '/login');
        setCurrentScreen('login');
      }
      return;
    }
    
    // 로그인이 필요한 페이지들 - 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    const protectedPaths = ['/home', '/explore', '/chat', '/my-meetups', '/mypage', '/create-meetup'];
    const isProtectedPath = protectedPaths.includes(path) || path.startsWith('/meetup/') || path.startsWith('/chat/');
    
    // 광고 디테일 페이지는 공개 (로그인 불필요)
    if (path.startsWith('/advertisement/')) {
      const advertisementId = parseInt(path.split('/')[2]);
      if (!isNaN(advertisementId)) {
        setCurrentScreen('advertisementDetail');
        setScreenParams({ advertisementId });
        return;
      }
    }
    
    if (isProtectedPath && !isLoggedIn) {
      window.history.replaceState({}, '', '/login');
      setCurrentScreen('login');
      return;
    }
    
    if (path === '/login') {
      // 이미 로그인된 경우 홈으로 리다이렉트
      if (isLoggedIn) {
        window.history.replaceState({}, '', '/home');
        setCurrentScreen('tabs');
        setActiveTab('Home');
      } else {
        setCurrentScreen('login');
      }
    } else if (path.startsWith('/meetup/')) {
      const meetupId = parseInt(path.split('/')[2]);
      if (!isNaN(meetupId)) {
        setCurrentScreen('meetupDetail');
        setScreenParams({ meetupId });
      }
    } else if (path.startsWith('/chat/')) {
      const chatId = parseInt(path.split('/')[2]);
      const meetupTitle = urlParams.get('title') || '채팅';
      if (!isNaN(chatId)) {
        setCurrentScreen('chat');
        setScreenParams({ meetupId: chatId, meetupTitle });
      }
    } else if (path === '/create-meetup') {
      setCurrentScreen('createMeetup');
    } else if (path === '/home') {
      setCurrentScreen('tabs');
      setActiveTab('Home');
    } else if (path === '/explore' || path === '/search') {
      setCurrentScreen('tabs');
      setActiveTab('Explore');
    } else if (path === '/chat') {
      setCurrentScreen('tabs');
      setActiveTab('Chat');
    } else if (path === '/my-meetups') {
      setCurrentScreen('tabs');
      setActiveTab('MyMeetups');
    } else if (path === '/mypage') {
      setCurrentScreen('tabs');
      setActiveTab('MyPage');
    }
  };

  const checkLoginStatus = () => {
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
      setCurrentScreen('tabs');
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (storedToken && storedUser) {
      // 이미 로그인된 경우
      setIsLoggedIn(true);
      setUser(JSON.parse(storedUser));
      setCurrentScreen('tabs');
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    window.history.pushState({}, '', '/login');
    setCurrentScreen('login');
  };

  // 네비게이션 함수들 (URL 변경 포함)
  const navigateToLogin = () => {
    window.history.pushState({}, '', '/login');
    setCurrentScreen('login');
  };

  const navigateToMeetupDetail = (meetupId: number) => {
    window.history.pushState({}, '', `/meetup/${meetupId}`);
    setCurrentScreen('meetupDetail');
    setScreenParams({ meetupId });
  };

  const navigateToChat = (meetupId: number, meetupTitle: string) => {
    window.history.pushState({}, '', `/chat/${meetupId}?title=${encodeURIComponent(meetupTitle)}`);
    setCurrentScreen('chat');
    setScreenParams({ meetupId, meetupTitle });
  };

  const navigateToCreateMeetup = () => {
    window.history.pushState({}, '', '/create-meetup');
    setCurrentScreen('createMeetup');
    setScreenParams({});
  };

  const navigateToAdvertisementDetail = (advertisementId: number) => {
    window.history.pushState({}, '', `/advertisement/${advertisementId}`);
    setCurrentScreen('advertisementDetail');
    setScreenParams({ advertisementId });
  };

  const navigateBack = () => {
    window.history.pushState({}, '', '/home');
    setCurrentScreen('tabs');
    setScreenParams({});
  };

  const navigateToTab = (tabKey: string) => {
    const paths = {
      'Home': '/home',
      'Explore': '/explore',
      'Chat': '/chat',
      'MyMeetups': '/my-meetups',
      'MyPage': '/mypage'
    };
    window.history.pushState({}, '', paths[tabKey] || '/home');
    setCurrentScreen('tabs');
    setActiveTab(tabKey);
  };

  // 웹용 네비게이션 객체 생성
  const webNavigation = {
    navigate: (screenName: string, params?: any) => {
      if (screenName === 'Login') {
        navigateToLogin();
      } else if (screenName === 'MeetupDetail') {
        navigateToMeetupDetail(params.meetupId);
      } else if (screenName === 'CreateMeetup') {
        navigateToCreateMeetup();
      } else if (screenName === 'Chat') {
        navigateToChat(params.meetupId, params.meetupTitle);
      } else if (screenName === 'Home') {
        navigateBack();
      } else if (screenName === 'Explore' || screenName === 'Search') {
        navigateToTab('Explore');
      } else if (screenName === 'Notifications') {
        navigateToTab('Home');
      } else if (screenName === 'MyMeetups') {
        navigateToTab('MyMeetups');
      } else if (screenName === 'AdvertisementDetail') {
        navigateToAdvertisementDetail(params.advertisementId);
      }
    },
    goBack: () => {
      navigateBack();
    },
    navigateToSearch: () => {
      navigateToTab('Explore');
    },
    navigateToNotifications: () => {
      navigateToTab('Home');
    },
    logout: handleLogout,
    user: user
  };

  const renderScreen = () => {
    if (currentScreen === 'login') {
      return <LoginScreen />;
    }
    
    if (currentScreen === 'meetupDetail') {
      return <MeetupDetailScreen route={{ params: screenParams }} navigation={webNavigation} user={user} />;
    }
    
    if (currentScreen === 'createMeetup') {
      return <CreateMeetupScreen navigation={webNavigation} user={user} />;
    }
    
    if (currentScreen === 'chat') {
      return <ChatScreen route={{ params: screenParams }} navigation={webNavigation} />;
    }
    
    if (currentScreen === 'advertisementDetail') {
      return <AdvertisementDetailScreen route={{ params: screenParams }} navigation={webNavigation} user={user} />;
    }
    
    const currentTab = tabs.find(tab => tab.key === activeTab);
    if (!currentTab) {return null;}
    
    const ScreenComponent = currentTab.component;
    
    // HomeScreen에 네비게이션 함수들 전달
    if (activeTab === 'Home') {
      return <ScreenComponent navigateToLogin={navigateToLogin} navigation={webNavigation} user={user} />;
    }
    
    // ExploreScreen에 네비게이션 전달
    if (activeTab === 'Explore') {
      return <ScreenComponent navigation={webNavigation} user={user} />;
    }

    // MyMeetupsScreen에 네비게이션 전달
    if (activeTab === 'MyMeetups') {
      return <ScreenComponent navigation={webNavigation} user={user} />;
    }
    
    // ChatScreen에 네비게이션 전달
    if (activeTab === 'Chat') {
      return <ScreenComponent navigation={webNavigation} user={user} />;
    }
    
    // MyPageScreen에 로그아웃 함수 전달
    if (activeTab === 'MyPage') {
      return <ScreenComponent navigation={webNavigation} user={user} onLogout={handleLogout} />;
    }
    
    return <ScreenComponent navigation={webNavigation} user={user} />;
  };

  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bottom Tab Bar - 로그인 화면에서는 숨김 */}
      {currentScreen === 'tabs' && isLoggedIn && (
        <View style={styles.tabBar}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => navigateToTab(tab.key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.tabIconContainer}>
                  <NavIcon
                    name={tab.navIcon}
                    size={24}
                    color={isActive ? '#151515' : '#8F99A9'}
                  />
                  {tab.key === 'Chat' && hasUnreadChats && !isActive && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <Text style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel
                ]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.tab.paddingVertical,
    position: 'relative' as const,
  },
  tabIndicator: {
    display: 'none' as const,
  },
  tabIconContainer: {
    position: 'relative' as const,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  unreadDot: {
    position: 'absolute' as const,
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.functional.error,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#8F99A9',
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#151515',
    fontWeight: '500' as const,
  },
});

export default WebTabNavigator;