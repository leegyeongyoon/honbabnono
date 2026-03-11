import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS, TRANSITIONS } from '../styles/colors';

export interface TabItem {
  key: string;
  label: string;
  badge?: number;
}

interface UnderlineTabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onTabChange: (key: string) => void;
}

const UnderlineTabBar: React.FC<UnderlineTabBarProps> = ({ tabs, activeKey, onTabChange }) => {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: COLORS.neutral.white,
          borderBottom: `1px solid ${COLORS.neutral.grey100}`,
          paddingLeft: 20,
          paddingRight: 20,
          gap: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <WebTabItem
              key={tab.key}
              tab={tab}
              isActive={isActive}
              onPress={() => onTabChange(tab.key)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.label}
            </Text>
            {tab.badge != null && tab.badge > 0 && (
              <View style={[styles.badge, isActive && styles.activeBadge]}>
                <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const WebTabItem: React.FC<{
  tab: TabItem;
  isActive: boolean;
  onPress: () => void;
}> = ({ tab, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="tab"
      aria-selected={isActive}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        cursor: 'pointer',
        transition: `color ${TRANSITIONS.normal}`,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: isActive ? 700 : 500,
          color: isActive
            ? COLORS.text.primary
            : hovered
              ? COLORS.text.secondary
              : COLORS.text.tertiary,
          letterSpacing: -0.2,
          transition: `color ${TRANSITIONS.normal}`,
          whiteSpace: 'nowrap',
        }}
      >
        {tab.label}
      </span>
      {tab.badge != null && tab.badge > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isActive ? COLORS.neutral.white : COLORS.text.tertiary,
            backgroundColor: isActive ? COLORS.primary.main : COLORS.neutral.grey200,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 5,
            paddingRight: 5,
            transition: `all ${TRANSITIONS.normal}`,
          }}
        >
          {tab.badge > 99 ? '99+' : tab.badge}
        </span>
      )}
      {/* 언더라인 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          right: 16,
          height: 2,
          borderRadius: 1,
          backgroundColor: isActive ? COLORS.primary.main : 'transparent',
          transition: `background-color ${TRANSITIONS.normal}`,
        }}
      />
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary.main,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    letterSpacing: -0.2,
  },
  activeTabText: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  badge: {
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  activeBadge: {
    backgroundColor: COLORS.primary.main,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  activeBadgeText: {
    color: COLORS.neutral.white,
  },
});

export default UnderlineTabBar;
