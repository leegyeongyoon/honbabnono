import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
    { key: 'my-meetups', title: '내약속', icon: 'calendar' as IconName, path: '/my-meetups' },
    { key: 'explore', title: '탐색', icon: 'compass' as IconName, path: '/explore' },
    { key: 'chat', title: '채팅', icon: 'message-circle' as IconName, path: '/chat' },
    { key: 'mypage', title: '마이페이지', icon: 'user' as IconName, path: '/mypage' },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;

    if (currentPath.startsWith('/chat')) {
      return 'chat';
    }
    if (currentPath.startsWith('/my-meetups') || currentPath.startsWith('/joined-meetups')) {
      return 'my-meetups';
    }
    if (currentPath.startsWith('/explore') || currentPath.startsWith('/meetup-list') || currentPath.startsWith('/search') || currentPath.startsWith('/ai-search')) {
      return 'explore';
    }
    if (currentPath.startsWith('/mypage') || currentPath.startsWith('/my-page') || currentPath.startsWith('/my-reviews') || currentPath.startsWith('/my-activities')) {
      return 'mypage';
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
    }
    navigate(path);
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

    const interval = setInterval(() => {
      fetchUnreadChatCount();
    }, 30 * 1000);

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
        const showChatBadge = tab.key === 'chat' && unreadChatCount > 0;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.path)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.title} 탭`}
          >
            <View style={styles.tabIconContainer}>
              <Icon
                name={tab.icon}
                size={21}
                color={isActive ? COLORS.primary.accent : COLORS.neutral.grey400}
              />
              {showChatBadge && (
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
            {isActive && <View style={styles.activeIndicator} />}
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
    borderTopColor: COLORS.neutral.grey100,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore: web-only boxShadow
      boxShadow: '0 -1px 0 rgba(13,13,12,0.04)',
    } : {}),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.tab.paddingVertical,
    paddingBottom: 6,
    minHeight: 44,
    position: 'relative',
  },
  tabIconContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary.accent,
    borderRadius: 1,
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: COLORS.functional.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.white,
  },
  chatBadgeText: {
    color: COLORS.text.white,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.neutral.grey400,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: COLORS.primary.accent,
    fontWeight: '600',
  },
});

export default BottomTabBar;
