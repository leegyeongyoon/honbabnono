import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {COLORS, SHADOWS} from '../styles/colors';
import {Icon, IconName} from './Icon';
import HomeScreen from '../screens/HomeScreen.web';
import SearchScreen from '../screens/SearchScreen.web';
import NotificationScreen from '../screens/NotificationScreen.web';
import MyPageScreen from '../screens/MyPageScreen';
import LoginScreen from '../screens/LoginScreen.web';
import MeetupDetailScreen from '../screens/MeetupDetailScreen';
import CreateMeetupScreen from '../screens/CreateMeetupScreen.web';
import ChatScreen from '../screens/ChatScreen.web';
import AdvertisementDetailScreen from '../screens/AdvertisementDetailScreen';

const WebTabNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('login'); // 기본을 로그인으로 변경
  const [screenParams, setScreenParams] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const tabs = [
    {key: 'Home', title: '홈', icon: 'home' as IconName, component: HomeScreen},
    {key: 'Search', title: '검색', icon: 'search' as IconName, component: SearchScreen},
    {key: 'Notifications', title: '알림', icon: 'bell' as IconName, component: NotificationScreen},
    {key: 'Chat', title: '채팅', icon: 'message-circle' as IconName, component: ChatScreen},
    {key: 'MyPage', title: '마이페이지', icon: 'user' as IconName, component: MyPageScreen},
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

  // URL 변경을 감지하기 위한 추가 effect
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== window.lastCheckedPath) {
        console.log('🔄 URL 변경 감지:', { from: window.lastCheckedPath, to: currentPath });
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
    
    console.log('🔄 URL 변경 처리:', { path, isLoggedIn });
    
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
    const protectedPaths = ['/home', '/search', '/notifications', '/chat', '/mypage', '/create-meetup'];
    const isProtectedPath = protectedPaths.includes(path) || path.startsWith('/meetup/') || path.startsWith('/chat/');
    
    // 광고 디테일 페이지는 공개 (로그인 불필요)
    if (path.startsWith('/advertisement/')) {
      console.log('🎯 광고 디테일 페이지 감지:', path);
      const advertisementId = parseInt(path.split('/')[2]);
      console.log('🎯 광고 ID:', advertisementId);
      if (!isNaN(advertisementId)) {
        console.log('✅ 광고 디테일 페이지로 설정');
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
    } else if (path === '/search') {
      setCurrentScreen('tabs');
      setActiveTab('Search');
    } else if (path === '/notifications') {
      console.log('✅ 알림 페이지로 이동');
      setCurrentScreen('tabs');
      setActiveTab('Notifications');
    } else if (path === '/chat') {
      setCurrentScreen('tabs');
      setActiveTab('Chat');
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
      'Search': '/search',
      'Notifications': '/notifications',
      'Chat': '/chat',
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
      } else if (screenName === 'Notifications') {
        navigateToTab('Notifications');
      } else if (screenName === 'AdvertisementDetail') {
        navigateToAdvertisementDetail(params.advertisementId);
      }
    },
    goBack: () => {
      navigateBack();
    },
    navigateToSearch: () => {
      setActiveTab('Search');
    },
    navigateToNotifications: () => {
      navigateToTab('Notifications');
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
      console.log('🏠 HomeScreen 렌더링 - webNavigation:', webNavigation);
      console.log('🏠 HomeScreen 렌더링 - webNavigation 메서드들:', Object.keys(webNavigation));
      return <ScreenComponent navigateToLogin={navigateToLogin} navigation={webNavigation} user={user} />;
    }
    
    // SearchScreen에도 네비게이션 전달
    if (activeTab === 'Search') {
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
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                activeTab === tab.key && styles.activeTabItem
              ]}
              onPress={() => navigateToTab(tab.key)}
            >
              <View style={[
                styles.tabIcon,
                activeTab === tab.key && styles.activeTabIcon
              ]}>
                <Icon 
                  name={tab.icon} 
                  size={20} 
                  color={activeTab === tab.key ? COLORS.text.white : COLORS.text.secondary}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel
              ]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
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
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    ...SHADOWS.large,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: COLORS.primary.light,
    ...SHADOWS.small,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  activeTabIcon: {
    transform: [{scale: 1.1}],
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  activeTabLabel: {
    color: COLORS.primary.dark,
    fontWeight: '600',
  },
});

export default WebTabNavigator;