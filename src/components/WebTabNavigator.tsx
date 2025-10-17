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
import ChatScreen from '../screens/ChatScreen';

const WebTabNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('login'); // 기본을 로그인으로 변경
  const [screenParams, setScreenParams] = useState({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const tabs = [
    {key: 'Home', title: '홈', icon: 'home' as IconName, component: HomeScreen},
    {key: 'Search', title: '탐색', icon: 'search' as IconName, component: SearchScreen},
    {key: 'Notifications', title: '알림', icon: 'bell' as IconName, component: NotificationScreen},
    {key: 'MyPage', title: '마이페이지', icon: 'user' as IconName, component: MyPageScreen},
  ];

  // 로그인 상태 확인 (페이지 로드 시)
  useEffect(() => {
    checkLoginStatus();
  }, []);

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
    setCurrentScreen('login');
  };

  // 네비게이션 함수들
  const navigateToLogin = () => {
    setCurrentScreen('login');
  };

  const navigateToMeetupDetail = (meetupId: number) => {
    setCurrentScreen('meetupDetail');
    setScreenParams({ meetupId });
  };

  const navigateToChat = (meetupId: number, meetupTitle: string) => {
    setCurrentScreen('chat');
    setScreenParams({ meetupId, meetupTitle });
  };

  const navigateBack = () => {
    setCurrentScreen('tabs');
    setScreenParams({});
  };

  // 웹용 네비게이션 객체 생성
  const webNavigation = {
    navigate: (screenName: string, params?: any) => {
      if (screenName === 'Login') {
        navigateToLogin();
      } else if (screenName === 'MeetupDetail') {
        navigateToMeetupDetail(params.meetupId);
      } else if (screenName === 'Chat') {
        navigateToChat(params.meetupId, params.meetupTitle);
      } else if (screenName === 'Home') {
        navigateBack();
      }
    },
    goBack: () => {
      navigateBack();
    },
    navigateToSearch: () => {
      setActiveTab('Search');
    },
    logout: handleLogout,
    user: user
  };

  const renderScreen = () => {
    if (currentScreen === 'login') {
      return <LoginScreen />;
    }
    
    if (currentScreen === 'meetupDetail') {
      return <MeetupDetailScreen route={{ params: screenParams }} navigation={webNavigation} />;
    }
    
    if (currentScreen === 'chat') {
      return <ChatScreen route={{ params: screenParams }} navigation={webNavigation} />;
    }
    
    const currentTab = tabs.find(tab => tab.key === activeTab);
    if (!currentTab) return null;
    
    const ScreenComponent = currentTab.component;
    
    // HomeScreen에 네비게이션 함수들 전달
    if (activeTab === 'Home') {
      return <ScreenComponent navigateToLogin={navigateToLogin} navigation={webNavigation} user={user} />;
    }
    
    // SearchScreen에도 네비게이션 전달
    if (activeTab === 'Search') {
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
              onPress={() => setActiveTab(tab.key)}
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
  header: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    alignItems: 'center',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...SHADOWS.large,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text.white,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.95,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: '#ede0c8',
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
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondary.light,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  placeholder: {
    width: 50,
  },
});

export default WebTabNavigator;