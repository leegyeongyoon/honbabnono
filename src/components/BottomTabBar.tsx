import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../styles/colors';
import NavIcon from './NavIcon';

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // v2: 매장 중심 탭 구조
  const tabs = [
    { key: 'home', title: '홈', navIcon: 'home' as const, path: '/home' },
    { key: 'search', title: '검색', navIcon: 'search' as const, path: '/search-restaurants' },
    { key: 'reservations', title: '내 예약', navIcon: 'reservation' as const, path: '/my-reservations' },
    { key: 'mypage', title: '마이페이지', navIcon: 'mypage' as const, path: '/mypage' },
  ];

  const getActiveTab = () => {
    const currentPath = location.pathname;

    // 매장 상세, 예약폼, 결제 → 홈 탭
    if (currentPath.startsWith('/restaurant') && !currentPath.startsWith('/restaurants')) {
      return 'home';
    }
    if (currentPath.startsWith('/reservation/') || currentPath.startsWith('/payment/')) {
      return 'home';
    }

    // 검색 관련
    if (currentPath.startsWith('/search-restaurants')) {
      return 'search';
    }

    // 내 예약 관련
    if (currentPath.startsWith('/my-reservations') || currentPath.startsWith('/reservation-confirm') || currentPath.startsWith('/write-restaurant-review')) {
      return 'reservations';
    }

    // 마이페이지 관련
    if (currentPath.startsWith('/mypage') || currentPath.startsWith('/my-page') || currentPath.startsWith('/settings') || currentPath.startsWith('/my-reviews') || currentPath.startsWith('/my-badges') || currentPath.startsWith('/point') || currentPath.startsWith('/blocked-users') || currentPath.startsWith('/notification-settings') || currentPath.startsWith('/privacy-settings') || currentPath.startsWith('/recent-views') || currentPath.startsWith('/wishlist')) {
      return 'mypage';
    }

    const activeTab = tabs.find(tab => tab.path === currentPath);
    return activeTab?.key || 'home';
  };

  const activeTab = getActiveTab();

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => navigate(tab.path)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.title} 탭`}
          >
            <View style={styles.tabIconContainer}>
              <NavIcon
                name={tab.navIcon}
                size={24}
                color={isActive ? '#151515' : '#8F99A9'}
              />
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
    height: 64,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore: web-only properties
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      boxShadow: '0 -1px 0 rgba(17,17,17,0.04)',
    } : {}),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 44,
    position: 'relative',
  },
  tabIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8F99A9',
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#151515',
    fontWeight: '500',
  },
});

export default BottomTabBar;
