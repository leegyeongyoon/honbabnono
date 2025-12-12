import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon, IconName } from './Icon';
import ChatBadge from './ChatBadge';
import apiClient from '../services/apiClient';
import chatService from '../services/chatService';

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const tabs = [
    { key: 'home', title: '홈', icon: 'home' as IconName, path: '/home' },
    { key: 'my-meetups', title: '내 모임', icon: 'calendar' as IconName, path: '/my-meetups' },
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
    
    // /my-meetups 경로는 my-meetups 탭으로 처리
    if (currentPath.startsWith('/my-meetups')) {
      return 'my-meetups';
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
      // 채팅 탭 클릭 시 즉시 배지 제거를 위해 읽지 않은 채팅 수를 0으로 설정
      setUnreadChatCount(0);
      navigate('/chat');
    } else {
      navigate(path);
    }
  };

  // 읽지 않은 채팅 수 조회
  const fetchUnreadChatCount = async () => {
    try {
      const response = await apiClient.get('/chat/unread-count');
      console.log('🔍 BottomTabBar fetchUnreadChatCount 응답:', response.data);
      if (response.data.success) {
        const count = response.data.unreadCount || 0;
        console.log('🔍 BottomTabBar setUnreadChatCount:', count);
        setUnreadChatCount(count);
      }
    } catch (error) {
      console.error('읽지 않은 채팅 수 조회 실패:', error);
      setUnreadChatCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadChatCount();
    
    // WebSocket 연결
    chatService.connect();
    
    // 30초마다 업데이트 (백업용)
    const interval = setInterval(fetchUnreadChatCount, 30 * 1000);
    
    // WebSocket 실시간 읽지 않은 채팅 수 업데이트 리스닝
    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      console.log('🔔 실시간 읽지 않은 채팅 수 업데이트:', data.unreadCount);
      setUnreadChatCount(data.unreadCount);
    };
    
    chatService.onUnreadCountUpdated(handleUnreadCountUpdate);
    
    return () => {
      clearInterval(interval);
      chatService.offUnreadCountUpdated(handleUnreadCountUpdate);
    };
  }, []);

  // 채팅 페이지에서 다른 페이지로 이동할 때 업데이트
  useEffect(() => {
    console.log('🔍 BottomTabBar location.pathname 변경:', location.pathname);
    
    if (location.pathname.startsWith('/chat')) {
      // 채팅 페이지 진입 시 즉시 배지 제거
      console.log('🔍 BottomTabBar 채팅 페이지 진입 - 배지 제거');
      setUnreadChatCount(0);
      
      // 좀 더 빨리 업데이트
      setTimeout(() => {
        console.log('🔍 BottomTabBar 채팅 페이지 진입 후 API 호출');
        fetchUnreadChatCount();
      }, 200);
    } else {
      // 채팅 페이지에서 나갈 때 업데이트
      console.log('🔍 BottomTabBar 채팅 페이지 나감 - API 호출');
      fetchUnreadChatCount();
    }
  }, [location.pathname]);

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
            {tab.key === 'chat' && unreadChatCount > 0 && (
              <ChatBadge count={unreadChatCount} size="small" />
            )}
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
    backgroundColor: COLORS.primary.light,
    ...SHADOWS.small,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
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