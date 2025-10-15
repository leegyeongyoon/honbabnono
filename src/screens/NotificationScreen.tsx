import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';

interface Notification {
  id: number;
  type: 'meetup_invite' | 'meetup_approved' | 'meetup_cancelled' | 'system' | 'chat';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionRequired?: boolean;
}

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'meetup_approved',
      title: '모임 승인 완료',
      message: '강남역 파스타 맛집 탐방 모임이 승인되었습니다.',
      time: '5분 전',
      isRead: false,
      actionRequired: false,
    },
    {
      id: 2,
      type: 'meetup_invite',
      title: '새로운 모임 초대',
      message: '홍대 술집 호핑 모임에 초대되었습니다.',
      time: '1시간 전',
      isRead: false,
      actionRequired: true,
    },
    {
      id: 3,
      type: 'chat',
      title: '새로운 메시지',
      message: '김혼밥: 7시에 만나요!',
      time: '2시간 전',
      isRead: true,
      actionRequired: false,
    },
    {
      id: 4,
      type: 'meetup_cancelled',
      title: '모임 취소 알림',
      message: '신촌 브런치 모임이 취소되었습니다.',
      time: '1일 전',
      isRead: true,
      actionRequired: false,
    },
    {
      id: 5,
      type: 'system',
      title: '새로운 기능 업데이트',
      message: '안전 가이드라인이 업데이트되었습니다.',
      time: '2일 전',
      isRead: true,
      actionRequired: false,
    },
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meetup_invite':
        return '🎉';
      case 'meetup_approved':
        return '✅';
      case 'meetup_cancelled':
        return '❌';
      case 'chat':
        return '💬';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'meetup_invite':
        return COLORS.primary.main;
      case 'meetup_approved':
        return COLORS.functional.success;
      case 'meetup_cancelled':
        return COLORS.functional.error;
      case 'chat':
        return COLORS.functional.info;
      case 'system':
        return COLORS.primary.dark;
      default:
        return COLORS.neutral.grey500;
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // 읽음 처리
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    if (notification.actionRequired) {
      Alert.alert(
        '모임 초대',
        notification.message + '\n참여하시겠습니까?',
        [
          { text: '거절', style: 'cancel' },
          { text: '수락', onPress: () => console.log('초대 수락') },
        ]
      );
    } else {
      console.log('Navigate to:', notification.type);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
    Alert.alert('완료', '모든 알림을 읽음 처리했습니다.');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
          >
            <Text style={styles.markAllText}>모두 읽음</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.notificationList}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>알림이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              새로운 알림이 오면 여기에 표시됩니다
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.isRead && styles.unreadNotification,
                notification.actionRequired && styles.actionRequiredNotification,
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.notificationIcon}>
                      {getNotificationIcon(notification.type)}
                    </Text>
                  </View>
                  <View style={styles.notificationMain}>
                    <View style={styles.notificationTitleRow}>
                      <Text style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.unreadTitle
                      ]}>
                        {notification.title}
                      </Text>
                      {notification.actionRequired && (
                        <View style={styles.actionBadge}>
                          <Text style={styles.actionText}>답변필요</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {notification.time}
                    </Text>
                  </View>
                </View>
                {!notification.isRead && (
                  <View style={styles.unreadDot} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.functional.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: COLORS.text.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    backgroundColor: COLORS.primary.light,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    color: COLORS.primary.dark,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  unreadNotification: {
    backgroundColor: COLORS.secondary.light,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  actionRequiredNotification: {
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  notificationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationHeader: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationMain: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  actionBadge: {
    backgroundColor: COLORS.functional.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary.main,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;