import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT, CSS_SHADOWS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { FadeIn } from '../components/animated';
import { NotificationList } from '../components/NotificationList';
import { Notification } from '../types/notification';
import notificationApiService from '../services/notificationApiService';

interface NotificationScreenProps {
  navigation?: any;
  user?: any;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation, user }) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const handleNotificationPress = (notification: Notification) => {
    // 알림 타입별로 적절한 화면으로 이동하는 로직 추가
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
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApiService.markAllAsRead();
      Alert.alert('알림', '모든 알림을 읽음으로 표시했습니다.');
    } catch (error) {
      Alert.alert('오류', '알림 읽음 처리에 실패했습니다.');
    }
  };

  const handleBackPress = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      window.history.back();
    }
  };

  return (
    <FadeIn style={styles.container}>
      <Header
        mode="sub"
        title="알림"
        onBackPress={handleBackPress}
        showNotification={false}
        rightContent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                showUnreadOnly && styles.filterButtonActive,
              ]}
              onPress={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              <Text style={[
                styles.filterButtonText,
                showUnreadOnly && styles.filterButtonTextActive,
              ]}>
                읽지 않음
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllText}>모두 읽음</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 알림 목록 */}
      <NotificationList
        onNotificationPress={handleNotificationPress}
        showUnreadOnly={showUnreadOnly}
        emptyComponent={
          <EmptyState
            icon="bell"
            title="알림이 없습니다"
            description="새로운 소식이 있으면 알려드릴게요"
          />
        }
      />
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.surface.primary,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  filterButtonTextActive: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    // @ts-ignore
    cursor: 'pointer',
  },
  markAllText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
});

export default NotificationScreen;
