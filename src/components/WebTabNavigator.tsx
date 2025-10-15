import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {COLORS, SHADOWS} from '../styles/colors';
import HomeScreen from '../screens/HomeScreen.web';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import MyPageScreen from '../screens/MyPageScreen';
import LoginScreen from '../screens/LoginScreen';
import MeetupDetailScreen from '../screens/MeetupDetailScreen';

const WebTabNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('tabs'); // 'tabs', 'login', 'meetupDetail', 'chat'
  const [screenParams, setScreenParams] = useState({});

  const tabs = [
    {key: 'Home', title: '홈', icon: '🏠', component: HomeScreen},
    {key: 'Search', title: '탐색', icon: '🔍', component: SearchScreen},
    {key: 'Notifications', title: '알림', icon: '🔔', component: ChatScreen}, // 임시로 채팅 컴포넌트 사용
    {key: 'MyPage', title: '마이페이지', icon: '👤', component: MyPageScreen},
  ];

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
      }
    },
    navigateToSearch: () => {
      setActiveTab('Search');
    }
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
      return <ScreenComponent navigateToLogin={navigateToLogin} navigation={webNavigation} />;
    }
    
    // SearchScreen에도 네비게이션 전달
    if (activeTab === 'Search') {
      return <ScreenComponent navigation={webNavigation} />;
    }
    
    return <ScreenComponent />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentScreen === 'login' ? (
          <View style={styles.headerWithBack}>
            <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
              <Text style={styles.backButtonText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>로그인</Text>
            <View style={styles.placeholder} />
          </View>
        ) : currentScreen === 'meetupDetail' ? (
          <View style={styles.headerWithBack}>
            <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
              <Text style={styles.backButtonText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>모임 상세</Text>
            <View style={styles.placeholder} />
          </View>
        ) : currentScreen === 'chat' ? (
          <View style={styles.headerWithBack}>
            <TouchableOpacity style={styles.backButton} onPress={navigateBack}>
              <Text style={styles.backButtonText}>← 뒤로</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>모임 채팅</Text>
            <View style={styles.placeholder} />
          </View>
        ) : (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {activeTab === 'Home' ? '🍚 혼밥시러' : tabs.find(tab => tab.key === activeTab)?.title}
            </Text>
            {activeTab === 'Home' && (
              <Text style={styles.headerSubtitle}>🤝 따뜻한 사람들과 함께하는 맛있는 시간</Text>
            )}
          </View>
        )}
      </View>
      
      {/* Screen Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bottom Tab Bar - 로그인 화면에서는 숨김 */}
      {currentScreen === 'tabs' && (
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
              <Text style={[
                styles.tabIcon,
                activeTab === tab.key && styles.activeTabIcon
              ]}>
                {tab.icon}
              </Text>
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
    backgroundColor: COLORS.neutral.background,
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