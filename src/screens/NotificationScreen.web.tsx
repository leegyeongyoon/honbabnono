import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';
import { NotificationList } from '../components/NotificationList';
import { Notification } from '../types/notification';
import notificationApiService from '../services/notificationApiService';

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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const handleNotificationPress = (notification: Notification) => {
    console.log('알림 클릭:', notification);
    
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

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (navigation?.goBack) {
              navigation.goBack();
            } else {
              window.history.back();
            }
          }}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>알림</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showUnreadOnly && styles.filterButtonActive
            ]}
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <Icon 
              name="filter-list" 
              size={20} 
              color={showUnreadOnly ? '#FF6B6B' : '#666'} 
            />
            <Text style={[
              styles.filterButtonText,
              showUnreadOnly && styles.filterButtonTextActive
            ]}>
              읽지 않음
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Icon name="done-all" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 알림 목록 */}
      <NotificationList
        onNotificationPress={handleNotificationPress}
        showUnreadOnly={showUnreadOnly}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FFE5E5',
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  markAllButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
});

export default NotificationScreen;