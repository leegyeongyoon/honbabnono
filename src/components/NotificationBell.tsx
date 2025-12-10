import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import useNotifications from '../hooks/useNotifications';

interface NotificationBellProps {
  onPress: () => void;
  color?: string;
  size?: number;
  userId?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  onPress, 
  color = '#333', 
  size = 24,
  userId 
}) => {
  const { unreadCount, fetchUnreadCount, requestNotificationPermission } = useNotifications(userId);

  useEffect(() => {
    fetchUnreadCount();
    
    // 30초마다 읽지 않은 알림 개수 업데이트
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // 브라우저 알림 권한 요청 (컴포넌트 마운트 시)
  useEffect(() => {
    if (userId) {
      requestNotificationPermission();
    }
  }, [userId, requestNotificationPermission]);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon 
        name="bell" 
        size={size} 
        color={color}
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 13,
  },
});

export { NotificationBell };