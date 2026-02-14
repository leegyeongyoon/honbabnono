import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';
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
  color = COLORS.text.primary,
  size = 24,
  userId
}) => {
  const { unreadCount, fetchUnreadCount, requestNotificationPermission } = useNotifications(userId);

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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
        <View style={styles.badge} />
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
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.functional.error,
  },
});

export { NotificationBell };