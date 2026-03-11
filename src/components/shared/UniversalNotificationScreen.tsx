import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { TYPOGRAPHY } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../styles/spacing';
import { Icon } from '../Icon';
import { useNotificationStore } from '../../store/notificationStore';
import { Notification } from '../../types/notification';

interface UniversalNotificationScreenProps {
  navigation?: any;
  user?: any;
  onNavigate?: (screen: string, params?: any) => void;
  onGoBack?: () => void;
}

// Map API snake_case response to camelCase Notification type
const mapApiNotification = (raw: any): Notification => ({
  id: raw.id,
  userId: raw.user_id || raw.userId,
  type: raw.type,
  title: raw.title,
  message: raw.message,
  meetupId: raw.meetup_id || raw.meetupId,
  relatedUserId: raw.related_user_id || raw.relatedUserId,
  data: typeof raw.data === 'string' ? JSON.parse(raw.data) : raw.data,
  isRead: raw.is_read ?? raw.isRead ?? false,
  isSent: raw.is_sent ?? raw.isSent ?? false,
  scheduledAt: raw.scheduled_at || raw.scheduledAt,
  sentAt: raw.sent_at || raw.sentAt,
  createdAt: raw.created_at || raw.createdAt,
  updatedAt: raw.updated_at || raw.updatedAt,
  meetup: raw.meetup,
  relatedUser: raw.related_user || raw.relatedUser,
});

const formatNotificationTime = (timestamp?: string): string => {
  if (!timestamp) return '';
  // Already formatted (e.g. "5분 전", "1시간 전") - pass through
  if (timestamp.includes('전') || timestamp.includes('후') || timestamp.includes('방금')) {
    return timestamp;
  }
  // ISO timestamp - convert to relative time
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const UniversalNotificationScreen: React.FC<UniversalNotificationScreenProps> = ({
  navigation,
  user,
  onNavigate,
  onGoBack
}) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    notifications: storeNotifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  } = useNotificationStore();

  // Map store notifications (may have snake_case fields from API) to consistent format
  const notifications: Notification[] = storeNotifications.map(mapApiNotification);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [showUnreadOnly]);

  const loadNotifications = useCallback(async () => {
    await fetchNotifications(1, 50, showUnreadOnly);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, showUnreadOnly]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleGoBackPress = () => {
    if (onGoBack) {
      onGoBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const handleNavigate = (screen: string, params?: any) => {
    if (onNavigate) {
      onNavigate(screen, params);
    } else if (navigation?.navigate) {
      navigation.navigate(screen, params);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read via API
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (_err) {
        // Continue with navigation even if mark-as-read fails
      }
    }

    const notifData = notification.data || {};

    // Navigation logic based on notification type
    switch (notification.type) {
      case 'chat_message':
        handleNavigate('ChatRoom', {
          meetupId: notifData.meetupId || notifData.meetup_id || notification.meetupId,
          meetupTitle: notifData.meetupTitle || notifData.meetup_title
        });
        break;
      case 'meetup_join_request':
      case 'meetup_join_approved':
      case 'meetup_join_rejected':
      case 'meetup_cancelled':
      case 'meetup_updated':
      case 'meetup_start':
      case 'meetup_reminder':
      case 'attendance_check':
      case 'review_request':
        handleNavigate('MeetupDetail', {
          meetupId: notifData.meetupId || notifData.meetup_id || notification.meetupId
        });
        break;
      case 'direct_chat_request':
        handleNavigate('ChatRoom', {
          userId: notifData.userId || notifData.user_id || notification.relatedUserId,
          userName: notifData.userName || notifData.user_name
        });
        break;
      case 'payment_success':
      case 'payment_failed':
      case 'point_penalty':
      case 'point_refund':
        handleNavigate('PointHistory');
        break;
      default:
        // For system_announcement, app_update, etc. - no specific navigation
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      Alert.alert('알림', '모든 알림을 읽음으로 표시했습니다.');
    } catch (_err) {
      Alert.alert('오류', '알림 읽음 처리에 실패했습니다.');
    }
  };

  const getNotificationIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'meetup_join_request':
        return { name: 'user-plus', color: COLORS.primary.accent };
      case 'meetup_join_approved':
        return { name: 'check-circle', color: COLORS.functional.success };
      case 'meetup_join_rejected':
        return { name: 'x-circle', color: COLORS.functional.error };
      case 'meetup_cancelled':
        return { name: 'x-circle', color: COLORS.functional.error };
      case 'meetup_updated':
        return { name: 'edit', color: COLORS.primary.accent };
      case 'meetup_start':
      case 'meetup_reminder':
        return { name: 'clock', color: COLORS.primary.accent };
      case 'attendance_check':
        return { name: 'check-circle', color: COLORS.functional.success };
      case 'chat_message':
      case 'new_chat_room':
      case 'direct_chat_request':
        return { name: 'message-circle', color: COLORS.functional.info };
      case 'review_request':
        return { name: 'star', color: COLORS.primary.accent };
      case 'payment_success':
        return { name: 'check-circle', color: COLORS.functional.success };
      case 'payment_failed':
        return { name: 'x-circle', color: COLORS.functional.error };
      case 'point_penalty':
        return { name: 'alert-circle', color: COLORS.functional.error };
      case 'point_refund':
        return { name: 'check-circle', color: COLORS.functional.success };
      case 'system_announcement':
      case 'app_update':
        return { name: 'bell', color: COLORS.text.tertiary };
      case 'safety_check':
        return { name: 'shield', color: COLORS.functional.info };
      case 'weekly_summary':
        return { name: 'bar-chart', color: COLORS.primary.accent };
      default:
        return { name: 'bell', color: COLORS.text.tertiary };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const isActionRequired = (notification: Notification): boolean => {
    return notification.type === 'meetup_join_request' ||
           notification.type === 'attendance_check' ||
           notification.type === 'review_request';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBackPress}
        >
          <Icon name="chevron-left" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showUnreadOnly && styles.filterButtonActive
            ]}
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <Text style={[
              styles.filterButtonText,
              showUnreadOnly && styles.filterButtonTextActive
            ]}>
              읽지 않음
            </Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllText}>모두 읽음</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 알림 목록 */}
      <ScrollView
        style={styles.notificationList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 로딩 상태 */}
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary.accent} />
            <Text style={styles.loadingText}>알림을 불러오는 중...</Text>
          </View>
        ) : error && notifications.length === 0 ? (
          /* 에러 상태 */
          <View style={styles.emptyState}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.emptyTitle}>알림을 불러올 수 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              네트워크 연결을 확인하고 다시 시도해 주세요
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadNotifications}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotifications.length === 0 ? (
          /* 빈 상태 */
          <View style={styles.emptyState}>
            <Icon name="bell-off" size={48} color={COLORS.neutral.grey300} />
            <Text style={styles.emptyTitle}>
              {showUnreadOnly ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {showUnreadOnly
                ? '모든 알림을 확인했습니다'
                : '새로운 알림이 오면 여기에 표시됩니다'
              }
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification, index) => {
            const iconInfo = getNotificationIcon(notification.type);
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  index < filteredNotifications.length - 1 && styles.notificationItemBorder,
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.6}
              >
                {/* 아이콘 */}
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: `${iconInfo.color}10` },
                ]}>
                  <Icon name={iconInfo.name as any} size={18} color={iconInfo.color} />
                </View>

                {/* 콘텐츠 */}
                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadTitle
                    ]} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    {isActionRequired(notification) && !notification.isRead && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>답변필요</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationTime(notification.createdAt)}
                  </Text>
                </View>

                {/* 읽지 않음 도트 (테라코타) */}
                {!notification.isRead && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    backgroundColor: COLORS.surface.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.text.white,
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.surface.primary,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  filterButtonText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  markAllText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  notificationList: {
    flex: 1,
  },

  // 알림 아이템 (클린 레이아웃, 서틀 디바이더)
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
  },
  notificationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actionBadge: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  // 테라코타 언리드 도트
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary.accent,
    marginLeft: 8,
    marginTop: 6,
  },

  // 로딩 상태
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 12,
  },

  // 빈 상태
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default UniversalNotificationScreen;
