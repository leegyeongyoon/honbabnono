import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon, IconName } from './Icon';

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { key: 'home', title: '홈', icon: 'home' as IconName, path: '/home' },
    { key: 'search', title: '검색', icon: 'search' as IconName, path: '/search' },
    { key: 'chat', title: '채팅', icon: 'message-circle' as IconName, path: '/chat' },
    { key: 'mypage', title: '마이페이지', icon: 'user' as IconName, path: '/mypage' },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;
    console.log('BottomTabBar currentPath:', currentPath);
    
    // /chat/:id 형태의 경로는 chat 탭으로 처리
    if (currentPath.startsWith('/chat')) {
      return 'chat';
    }
    
    // /meetup/:id 형태의 경로는 홈 탭으로 처리 (모임 상세는 홈에서 접근)
    if (currentPath.startsWith('/meetup')) {
      return 'home';
    }
    
    // 정확히 일치하는 탭 찾기
    const activeTab = tabs.find(tab => tab.path === currentPath);
    return activeTab?.key || 'home';
  };

  const handleTabPress = (path: string) => {
    console.log('BottomTabBar handleTabPress:', path);
    
    // 채팅 탭을 클릭하면 항상 채팅 목록으로 이동
    if (path === '/chat') {
      navigate('/chat');
    } else {
      navigate(path);
    }
  };

  const activeTab = getActiveTab();

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabItem,
            activeTab === tab.key && styles.activeTabItem
          ]}
          onPress={() => handleTabPress(tab.path)}
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
  );
};

const styles = StyleSheet.create({
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
});

export default BottomTabBar;