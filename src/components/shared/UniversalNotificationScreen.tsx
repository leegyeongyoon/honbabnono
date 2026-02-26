import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { TYPOGRAPHY } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../styles/spacing';
import { Icon } from '../Icon';
import { NotificationList } from '../NotificationList';
import { Notification } from '../../types/notification';
import notificationApiService from '../../services/notificationApiService';
import { getTimeDifference } from '../../utils/timeUtils';

interface UniversalNotificationScreenProps {
  navigation?: any;
  user?: any;
  onNavigate?: (screen: string, params?: any) => void;
  onGoBack?: () => void;
}

interface NotificationItem {
  id: number;
  type: 'meetup_invite' | 'meetup_approved' | 'meetup_cancelled' | 'system' | 'chat' | 'meetup_join_request' | 'meetup_join_approved' | 'meetup_join_rejected' | 'direct_chat_request' | 'chat_message';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionRequired?: boolean;
  imageUrl?: string;
  data?: any; // For additional notification data
}

const formatNotificationTime = (time?: string): string => {
  if (!time) return '';
  // Already formatted (e.g. "5분 전", "1시간 전") - pass through
  if (time.includes('전') || time.includes('후') || time.includes('방금')) {
    return time;
  }
  // ISO timestamp - convert using getTimeDifference
  const result = getTimeDifference(time);
  return result || time;
};

const UniversalNotificationScreen: React.FC<UniversalNotificationScreenProps> = ({
  navigation,
  user,
  onNavigate,
  onGoBack
}) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock data - in real app this would come from API/store
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      type: 'meetup_approved',
      title: '약속 승인 완료',
      message: '강남역 파스타 맛집 탐방 약속이 승인되었습니다.',
      time: '5분 전',
      isRead: false,
      actionRequired: false,
    },
    {
      id: 2,
      type: 'meetup_invite',
      title: '새로운 약속 초대',
      message: '홍대 술집 호핑 약속에 초대되었습니다.',
      time: '1시간 전',
      isRead: false,
      actionRequired: true,
    },
    {
      id: 3,
      type: 'chat_message',
      title: '새로운 메시지',
      message: '김혼밥: 7시에 만나요!',
      time: '2시간 전',
      isRead: true,
      actionRequired: false,
    },
    {
      id: 4,
      type: 'meetup_cancelled',
      title: '약속 취소 알림',
      message: '신촌 브런치 약속이 취소되었습니다.',
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

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // In a real app, load notifications from API
      // const notifications = await notificationApiService.getNotifications();
      // setNotifications(notifications);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  };

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

  const handleNotificationPress = (notification: NotificationItem) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Navigation logic based on notification type
    switch (notification.type) {
      case 'chat_message':
        handleNavigate('ChatRoom', {
          meetupId: notification.data?.meetupId,
          meetupTitle: notification.data?.meetupTitle
        });
        break;
      case 'meetup_join_request':
      case 'meetup_join_approved':
      case 'meetup_join_rejected':
      case 'meetup_approved':
        handleNavigate('MeetupDetail', {
          meetupId: notification.data?.meetupId
        });
        break;
      case 'direct_chat_request':
        handleNavigate('ChatRoom', {
          userId: notification.data?.userId,
          userName: notification.data?.userName
        });
        break;
      case 'meetup_invite':
        if (notification.actionRequired) {
          Alert.alert(
            '약속 초대',
            notification.message + '\n참여하시겠습니까?',
            [
              { text: '거절', style: 'cancel' },
              {
                text: '수락',
                onPress: () => {
                  handleNavigate('MeetupDetail', {
                    meetupId: notification.data?.meetupId
                  });
                }
              },
            ]
          );
        }
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (Platform.OS === 'web') {
        await notificationApiService.markAllAsRead();
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );

      Alert.alert('알림', '모든 알림을 읽음으로 표시했습니다.');
    } catch (error) {
      Alert.alert('오류', '알림 읽음 처리에 실패했습니다.');
    }
  };

  const getNotificationIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'meetup_invite':
        return { name: 'mail', color: COLORS.primary.accent };
      case 'meetup_approved':
        return { name: 'check-circle', color: COLORS.functional.success };
      case 'meetup_cancelled':
        return { name: 'x-circle', color: COLORS.functional.error };
      case 'chat':
      case 'chat_message':
        return { name: 'message-circle', color: COLORS.functional.info };
      case 'system':
        return { name: 'bell', color: COLORS.text.tertiary };
      case 'meetup_join_request':
        return { name: 'user-plus', color: COLORS.primary.accent };
      case 'meetup_join_approved':
        return { name: 'check-circle', color: COLORS.functional.success };
      case 'meetup_join_rejected':
        return { name: 'x-circle', color: COLORS.functional.error };
      case 'direct_chat_request':
        return { name: 'message-circle', color: COLORS.functional.info };
      default:
        return { name: 'bell', color: COLORS.text.tertiary };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = showUnreadOnly
    ? notifications.filter(n => !n.isRead)
    : notifications;

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
      {Platform.OS === 'web' && typeof NotificationList !== 'undefined' ? (
        // Use web component if available
        <NotificationList
          onNotificationPress={handleNotificationPress}
          showUnreadOnly={showUnreadOnly}
        />
      ) : (
        // Fallback to custom implementation
        <ScrollView
          style={styles.notificationList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredNotifications.length === 0 ? (
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
                      {notification.actionRequired && (
                        <View style={styles.actionBadge}>
                          <Text style={styles.actionBadgeText}>답변필요</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatNotificationTime(notification.time)}
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
      )}
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
});

export default UniversalNotificationScreen;
