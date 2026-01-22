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
import { Notification } from '../types/notification';
import notificationApiService from '../services/notificationApiService';

interface NotificationListProps {
  onNotificationPress?: (notification: Notification) => void;
  showUnreadOnly?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = ({ 
  onNotificationPress,
  showUnreadOnly = false 
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
      console.error('알림 목록 조회 실패:', error);
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
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'chat_message':
        return 'chat';
      case 'meetup_join_request':
      case 'meetup_join_approved':
      case 'meetup_join_rejected':
        return 'people';
      case 'meetup_reminder':
      case 'meetup_start':
        return 'schedule';
      case 'attendance_check':
        return 'check-circle';
      case 'payment_success':
      case 'payment_failed':
        return 'credit-card';
      case 'system_announcement':
        return 'campaign';
      case 'direct_chat_request':
        return 'person-add';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'chat_message':
      case 'direct_chat_request':
        return '#4CAF50';
      case 'meetup_join_request':
      case 'meetup_join_approved':
        return '#2196F3';
      case 'meetup_join_rejected':
        return '#FF9800';
      case 'meetup_reminder':
      case 'attendance_check':
        return '#9C27B0';
      case 'payment_success':
        return '#4CAF50';
      case 'payment_failed':
        return '#F44336';
      case 'system_announcement':
        return '#FF6B6B';
      default:
        return '#757575';
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
            uri={item.relatedUser.profileImage}
            size={40}
            defaultImage="profile"
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
          <Text style={styles.meetupInfo} numberOfLines={1}>
            📍 {item.meetup.title} • {item.meetup.location}
          </Text>
        )}
      </View>
      
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) {return null;}
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>
        {showUnreadOnly ? '새로운 알림이 없습니다' : '알림이 없습니다'}
      </Text>
      <Text style={styles.emptyDescription}>
        {showUnreadOnly 
          ? '읽지 않은 알림이 도착하면 여기에 표시됩니다'
          : '모임, 채팅 등의 알림이 도착하면 여기에 표시됩니다'
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
            colors={['#FF6B6B']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  unreadItem: {
    backgroundColor: '#F8F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  meetupInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export { NotificationList };