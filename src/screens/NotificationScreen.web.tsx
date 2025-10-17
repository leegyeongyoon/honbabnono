import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';

interface NotificationScreenProps {
  navigation?: any;
  user?: any;
}

interface NotificationItem {
  id: number;
  type: 'meetup' | 'system' | 'message';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  imageUrl?: string;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation, user }) => {
  const [selectedTab, setSelectedTab] = useState('전체');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      type: 'meetup',
      title: '강남역 맛집 탐방',
      message: '모임에 새로운 참가자가 있습니다.',
      time: '5분 전',
      isRead: false,
    },
    {
      id: 2,
      type: 'message',
      title: '김혼밥님이 메시지를 보냈습니다',
      message: '안녕하세요! 내일 모임 시간 확인차 연락드립니다.',
      time: '1시간 전',
      isRead: false,
    },
    {
      id: 3,
      type: 'system',
      title: '새로운 이벤트',
      message: '혼밥시러 첫 모임 참여 시 5,000원 쿠폰을 드립니다!',
      time: '3시간 전',
      isRead: true,
    },
    {
      id: 4,
      type: 'meetup',
      title: '홍대 치킨 모임',
      message: '모임이 내일 오후 7시로 확정되었습니다.',
      time: '1일 전',
      isRead: true,
    },
    {
      id: 5,
      type: 'system',
      title: '안전 수칙 안내',
      message: '안전한 모임을 위한 가이드라인을 확인해주세요.',
      time: '2일 전',
      isRead: true,
    },
  ]);

  const tabs = ['전체', '모임', '메시지', '시스템'];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meetup': return '🍽️';
      case 'message': return '💬';
      case 'system': return '📢';
      default: return '🔔';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (selectedTab === '전체') return true;
    if (selectedTab === '모임') return notification.type === 'meetup';
    if (selectedTab === '메시지') return notification.type === 'message';
    if (selectedTab === '시스템') return notification.type === 'system';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const renderNotificationItem = (notification: NotificationItem) => (
    <TouchableOpacity 
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadNotificationCard
      ]}
      onPress={() => markAsRead(notification.id)}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.notificationEmoji}>
          {getNotificationIcon(notification.type)}
        </Text>
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !notification.isRead && styles.unreadTitle
        ]}>
          {notification.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>{notification.time}</Text>
      </View>
      
      {!notification.isRead && (
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 탭 버튼들 */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                selectedTab === tab && styles.selectedTabButton
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[
                styles.tabButtonText,
                selectedTab === tab && styles.selectedTabButtonText
              ]}>
                {tab}
                {tab === '전체' && unreadCount > 0 && (
                  <Text style={styles.tabBadge}> {unreadCount}</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 알림 목록 */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderNotificationItem(item)}
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.notificationsContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭</Text>
            <Text style={styles.emptyMessage}>알림이 없습니다</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    backgroundColor: '#ede0c8',
    paddingVertical: 8,
    paddingTop: 8, // 상단 패딩 추가
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginLeft: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedTabButton: {
    backgroundColor: '#ede0c8',
    borderColor: '#ede0c8',
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  selectedTabButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  tabBadge: {
    fontSize: 12,
    color: COLORS.functional.error,
    fontWeight: 'bold',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContainer: {
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 0,
    marginTop: 0,
    padding: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadNotificationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ede0c8',
    backgroundColor: '#ffffff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationEmoji: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary.main,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});

export default NotificationScreen;