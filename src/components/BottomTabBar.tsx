import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useLocation, useNavigate } from 'react-router-dom';
import { COLORS } from '../styles/colors';
import NavIcon from './NavIcon';

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { key: 'home', title: '홈', navIcon: 'home' as const, path: '/home' },
    { key: 'search', title: '검색', navIcon: 'search' as const, path: '/search-restaurants' },
    { key: 'reservations', title: '내 예약', navIcon: 'reservation' as const, path: '/my-reservations' },
    { key: 'mypage', title: '마이', navIcon: 'mypage' as const, path: '/mypage' },
  ];

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.startsWith('/restaurant') && !p.startsWith('/restaurants')) return 'home';
    if (p.startsWith('/reservation/') || p.startsWith('/payment/')) return 'home';
    if (p.startsWith('/search-restaurants')) return 'search';
    if (p.startsWith('/my-reservations') || p.startsWith('/reservation-confirm') || p.startsWith('/write-restaurant-review')) return 'reservations';
    if (p.startsWith('/mypage') || p.startsWith('/my-page') || p.startsWith('/settings') || p.startsWith('/my-reviews') || p.startsWith('/my-badges') || p.startsWith('/point') || p.startsWith('/blocked-users') || p.startsWith('/notification-settings') || p.startsWith('/privacy-settings') || p.startsWith('/recent-views') || p.startsWith('/wishlist')) return 'mypage';
    return tabs.find(t => t.path === p)?.key || 'home';
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
            {/* Active indicator dot */}
            {isActive && Platform.OS === 'web' && (
              <div style={{
                position: 'absolute',
                top: 4,
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.primary.main,
              }} />
            )}
            <View style={styles.tabIconContainer}>
              <NavIcon
                name={tab.navIcon}
                size={22}
                color={isActive ? COLORS.text.primary : '#A0A5B0'}
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
    height: 60,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 0,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      boxShadow: '0 -1px 0 rgba(17,17,17,0.06), 0 -4px 12px rgba(17,17,17,0.03)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255,255,255,0.92)',
    } : {}),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 44,
    position: 'relative',
  },
  tabIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#A0A5B0',
    letterSpacing: 0.1,
  },
  activeTabLabel: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },
});

export default BottomTabBar;
