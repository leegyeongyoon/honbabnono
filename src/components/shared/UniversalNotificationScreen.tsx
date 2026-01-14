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
import { Icon } from '../Icon';
import { NotificationList } from '../NotificationList';
import { Notification } from '../../types/notification';
import notificationApiService from '../../services/notificationApiService';

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

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // In a real app, load notifications from API
      // const notifications = await notificationApiService.getNotifications();
      // setNotifications(notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
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
    console.log('알림 클릭:', notification);
    
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
            '모임 초대',
            notification.message + '\n참여하시겠습니까?',
            [
              { text: '거절', style: 'cancel' },
              { 
                text: '수락', 
                onPress: () => {
                  // Handle invitation acceptance
                  console.log('초대 수락');
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
        console.log('Navigate to:', notification.type);
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meetup_invite':
        return '🎉';
      case 'meetup_approved':
        return '✅';
      case 'meetup_cancelled':
        return '❌';
      case 'chat':
      case 'chat_message':
        return '💬';
      case 'system':
        return '🔔';
      case 'meetup_join_request':
        return '👋';
      case 'meetup_join_approved':
        return '🎊';
      case 'meetup_join_rejected':
        return '😔';
      case 'direct_chat_request':
        return '💬';
      default:
        return '📢';
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
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
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
            <Icon 
              name="filter" 
              size={18} 
              color={showUnreadOnly ? COLORS.primary.main : COLORS.text.secondary} 
            />
            {Platform.OS === 'web' && (
              <Text style={[
                styles.filterButtonText,
                showUnreadOnly && styles.filterButtonTextActive
              ]}>
                읽지 않음
              </Text>
            )}
          </TouchableOpacity>
          
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Icon name="check-circle" size={18} color={COLORS.text.secondary} />
              {Platform.OS === 'web' && (
                <Text style={styles.markAllText}>모두 읽음</Text>
              )}
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
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
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
            filteredNotifications.map((notification) => (
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.border || '#E0E0E0',
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary.light,
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.background,
  },
  markAllText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  notificationList: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.small,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: COLORS.primary.light,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  actionRequiredNotification: {
    borderWidth: 1,
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
    width: 40,
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    color: COLORS.text.tertiary || COLORS.text.secondary,
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
    fontWeight: '700',
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

export default UniversalNotificationScreen;