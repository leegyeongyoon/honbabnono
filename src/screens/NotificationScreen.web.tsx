import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FadeIn } from '../components/animated';
import { Notification } from '../types/notification';
import notificationApiService from '../services/notificationApiService';

interface NotificationScreenProps {
  navigation?: any;
  user?: any;
}

const BLUE = '#4A90D9';

const getNotificationCategory = (type: string): string => {
  switch (type) {
    case 'meetup_join_request':
      return '모임 참가 신청';
    case 'meetup_join_approved':
      return '참가 승인';
    case 'meetup_join_rejected':
      return '참가 거절';
    case 'chat_message':
    case 'new_chat_room':
      return '새로운 채팅';
    case 'direct_chat_request':
      return '채팅 요청';
    case 'review_request':
      return '리뷰 작성 요청';
    case 'meetup_reminder':
      return '모임 알림';
    case 'meetup_start':
      return '모임 시작';
    case 'meetup_cancelled':
      return '모임 취소';
    case 'meetup_updated':
      return '모임 변경';
    case 'attendance_check':
      return '출석 확인';
    case 'payment_success':
      return '결제 완료';
    case 'payment_failed':
      return '결제 실패';
    case 'point_penalty':
      return '포인트 차감';
    case 'point_refund':
      return '포인트 환불';
    case 'system_announcement':
      return '공지사항';
    case 'app_update':
      return '앱 업데이트';
    case 'safety_check':
      return '안전 확인';
    case 'weekly_summary':
      return '주간 요약';
    default:
      return '알림';
  }
};

const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffMs / (1000 * 60));
  const diffInHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return '방금 전';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays < 30) {
    return `${diffInDays}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  }
};

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation, user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (pageNum = 1, refresh = false) => {
    if (loading && !refresh) { return; }

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await notificationApiService.getNotifications(pageNum, 20, false);

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
  }, []);

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

      // 알림 타입별로 적절한 화면으로 이동하는 로직
      switch (notification.type) {
        case 'chat_message':
          // 채팅방으로 이동
          break;
        case 'meetup_join_request':
        case 'meetup_join_approved':
        case 'meetup_join_rejected':
          // 해당 모임 상세 화면으로 이동
          break;
        case 'direct_chat_request':
          // 1대1 채팅 요청 화면으로 이동
          break;
        default:
          // 기본 동작
          break;
      }
    } catch (error) {
      // silently handle mark-as-read failure
    }
  };

  const handleBackPress = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const category = getNotificationCategory(item.type);
    const timeText = formatTimestamp(item.createdAt);

    return (
      <TouchableOpacity
        style={styles.notificationItem}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryRow}>
          <View style={styles.categoryLeft}>
            <View style={styles.categoryDot} />
            <Text style={styles.categoryText}>{category}</Text>
          </View>
          <Text style={styles.timeText}>{timeText}</Text>
        </View>
        <Text style={styles.contentText} numberOfLines={2}>
          {item.message || item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) { return null; }

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={BLUE} />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>알림이 없습니다</Text>
      <Text style={styles.emptyDescription}>
        새로운 소식이 있으면 알려드릴게요
      </Text>
    </View>
  );

  return (
    <FadeIn style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[BLUE]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading ? renderEmptyState() : null}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f3',
    paddingHorizontal: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '400',
    color: '#121212',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  headerRight: {
    position: 'absolute',
    right: 16,
    width: 32,
  },

  // List
  list: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Notification Item
  notificationItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f3',
    // @ts-ignore
    cursor: 'pointer',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: BLUE,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: BLUE,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#878b94',
  },
  contentText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#121212',
    lineHeight: 22,
    paddingLeft: 14,
  },

  // Footer / Empty
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#878b94',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationScreen;
