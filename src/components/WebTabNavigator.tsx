import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import MyPageScreen from '../screens/MyPageScreen';
import LoginScreen from '../screens/LoginScreen';

const WebTabNavigator = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('tabs'); // 'tabs' or 'login'

  const tabs = [
    {key: 'Home', title: '홈', icon: '🏠', component: HomeScreen},
    {key: 'Search', title: '탐색', icon: '🔍', component: SearchScreen},
    {key: 'Chat', title: '채팅', icon: '💬', component: ChatScreen},
    {key: 'MyPage', title: '마이페이지', icon: '👤', component: MyPageScreen},
  ];

  // 로그인 화면으로 네비게이션하는 함수를 HomeScreen에 전달
  const navigateToLogin = () => {
    setCurrentScreen('login');
  };

  const navigateBack = () => {
    setCurrentScreen('tabs');
  };

  const renderScreen = () => {
    if (currentScreen === 'login') {
      return <LoginScreen />;
    }
    
    const currentTab = tabs.find(tab => tab.key === activeTab);
    if (!currentTab) return null;
    
    const ScreenComponent = currentTab.component;
    
    // HomeScreen에만 네비게이션 함수 전달
    if (activeTab === 'Home') {
      return <ScreenComponent navigateToLogin={navigateToLogin} />;
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
        ) : (
          <Text style={styles.headerTitle}>
            {tabs.find(tab => tab.key === activeTab)?.title || '혼밥시러'}
          </Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    // 활성 탭 스타일
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  activeTabIcon: {
    // 활성 아이콘 스타일
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  activeTabLabel: {
    color: '#007AFF',
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  placeholder: {
    width: 50, // backButton과 동일한 크기로 중앙 정렬
  },
});

export default WebTabNavigator;