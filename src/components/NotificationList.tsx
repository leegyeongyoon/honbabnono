import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl, 
  ActivityIndicator 
} from 'react-native';
import { Icon } from './Icon';
import { ProfileImage } from './ProfileImage';
import { COLORS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Notification } from '../types/notification';
import notificationApiService from '../services/notificationApiService';

interface NotificationListProps {
  onNotificationPress?: (notification: Notification) => void;
  showUnreadOnly?: boolean;
  emptyComponent?: React.ReactNode;
}

const NotificationList: React.FC<NotificationListProps> = ({
  onNotificationPress,
  showUnreadOnly = false,
  emptyComponent,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (pageNum = 1, refresh = false) => {
    if (loading && !refresh) {return;}
    
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await notificationApiService.getNotifications(
        pageNum, 
        20, 
        showUnreadOnly
      );
      
      if (refresh || pageNum === 1) {
        setNotifications(response.notifications);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
      }
      
      setHasMore(pageNum < response.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      // silently handle notification fetch failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchNotifications(1, true);
  }, [showUnreadOnly]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchNotifications(page + 1);
    }
  }, [hasMore, loading, page]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await notificationApiService.markAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      }
      
      onNotificationPress?.(notification);
    } catch (error) {
      // silently handle mark-as-read failure
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'chat_message':
        return 'message-circle';
      case 'meetup_join_request':
      case 'meetup_join_approved':
      case 'meetup_join_rejected':
        return 'users';
      case 'meetup_reminder':
      case 'meetup_start':
        return 'clock';
      case 'attendance_check':
        return 'check-circle';
      case 'payment_success':
      case 'payment_failed':
        return 'credit-card';
      case 'system_announcement':
        return 'megaphone';
      case 'direct_chat_request':
        return 'user';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'chat_message':
      case 'direct_chat_request':
        return COLORS.functional.success;
      case 'meetup_join_request':
      case 'meetup_join_approved':
        return COLORS.functional.info;
      case 'meetup_join_rejected':
        return COLORS.primary.main;
      case 'meetup_reminder':
      case 'attendance_check':
        return COLORS.text.secondary;
      case 'payment_success':
        return COLORS.functional.success;
      case 'payment_failed':
        return COLORS.functional.error;
      case 'system_announcement':
        return COLORS.primary.main;
      default:
        return COLORS.text.tertiary;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? '방금 전' : `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadItem
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {item.relatedUser?.profileImage ? (
          <ProfileImage
            profileImage={item.relatedUser.profileImage}
            name={item.relatedUser?.name || ''}
            size={40}
          />
        ) : (
          <View style={[
            styles.iconWrapper,
            { backgroundColor: getNotificationColor(item.type) }
          ]}>
            <Icon 
              name={getNotificationIcon(item.type)} 
              size={20} 
              color="white" 
            />
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[
            styles.title,
            !item.isRead && styles.unreadTitle
          ]}>
            {item.title}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>
        
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        
        {item.meetup && (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
            <Icon name="map-pin" size={12} color={COLORS.text.tertiary} />
            <Text style={styles.meetupInfo} numberOfLines={1}>
              {item.meetup.title} • {item.meetup.location}
            </Text>
          </View>
        )}
      </View>
      
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) {return null;}
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary.main} />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color={COLORS.neutral.grey200} />
      <Text style={styles.emptyTitle}>
        {showUnreadOnly ? '새로운 알림이 없습니다' : '알림이 없습니다'}
      </Text>
      <Text style={styles.emptyDescription}>
        {showUnreadOnly 
          ? '읽지 않은 알림이 도착하면 여기에 표시됩니다'
          : '약속, 채팅 등의 알림이 도착하면 여기에 표시됩니다'
        }
      </Text>
    </View>
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [showUnreadOnly]);

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[COLORS.primary.main]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? (emptyComponent ?? renderEmptyState()) : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    minHeight: 72,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13,13,12,0.06)',
  },
  unreadItem: {
    backgroundColor: COLORS.primary.light,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  message: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  meetupInfo: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary.main,
    marginLeft: 8,
    marginTop: 6,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export { NotificationList };