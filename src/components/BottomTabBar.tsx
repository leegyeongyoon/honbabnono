import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../styles/colors';
import { SPACING } from '../styles/spacing';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon, IconName } from './Icon';
import apiClient from '../services/apiClient';
import chatService from '../services/chatService';

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const tabs = [
    { key: 'home', title: '홈', icon: 'home' as IconName, path: '/home' },
    { key: 'my-meetups', title: '내모임', icon: 'calendar' as IconName, path: '/my-meetups' },
    { key: 'chat', title: '채팅', icon: 'message-circle' as IconName, path: '/chat' },
    { key: 'mypage', title: '마이', icon: 'user' as IconName, path: '/mypage' },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;

    if (currentPath.startsWith('/chat')) {
      return 'chat';
    }
    if (currentPath.startsWith('/my-meetups')) {
      return 'my-meetups';
    }
    if (currentPath.startsWith('/meetup')) {
      return 'home';
    }

    const activeTab = tabs.find(tab => tab.path === currentPath);
    return activeTab?.key || 'home';
  };

  const handleTabPress = (path: string) => {
    if (path === '/chat') {
      setUnreadChatCount(0);
      navigate('/chat');
    } else {
      navigate(path);
    }
  };

  const fetchUnreadChatCount = async () => {
    try {
      const response = await apiClient.get('/chat/unread-count');
      if (response.data.success) {
        const count = response.data.unreadCount || 0;
        setUnreadChatCount(count);
      }
    } catch (error) {
      setUnreadChatCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadChatCount();

    chatService.connect();

    const interval = setInterval(fetchUnreadChatCount, 30 * 1000);

    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      setUnreadChatCount(data.unreadCount);
    };

    chatService.onUnreadCountUpdated(handleUnreadCountUpdate);

    return () => {
      clearInterval(interval);
      chatService.offUnreadCountUpdated(handleUnreadCountUpdate);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/chat')) {
      setUnreadChatCount(0);
      setTimeout(() => {
        fetchUnreadChatCount();
      }, 200);
    } else {
      fetchUnreadChatCount();
    }
  }, [location.pathname]);

  const activeTab = getActiveTab();

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.path)}
            activeOpacity={0.7}
          >
            <View style={styles.tabIconContainer}>
              <Icon
                name={tab.icon}
                size={24}
                color={isActive ? COLORS.primary.main : COLORS.neutral.grey400}
              />
              {tab.key === 'chat' && unreadChatCount > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>
                    {unreadChatCount > 99 ? '99+' : unreadChatCount.toString()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.tabLabel,
              isActive && styles.activeTabLabel,
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: SPACING.bottomNav.height,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary.accent,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.tab.paddingVertical,
  },
  tabIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  chatBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: COLORS.functional.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: COLORS.text.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.tab.fontSize,
    fontWeight: TYPOGRAPHY.tab.fontWeight,
    color: COLORS.neutral.grey400,
  },
  activeTabLabel: {
    color: COLORS.primary.main,
  },
});

export default BottomTabBar;
