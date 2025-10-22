import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';

interface MyPageScreenProps {
  navigation?: any;
  user?: any;
  onLogout?: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ navigation, user, onLogout }) => {
  const [selectedTab, setSelectedTab] = useState('내활동');

  const tabs = ['내활동', '설정'];

  // 내 활동 데이터
  const myActivities = {
    joinedMeetups: [
      { id: 1, title: '강남 맛집 탐방', date: '2024-10-20', status: '완료' },
      { id: 2, title: '홍대 술집 모임', date: '2024-10-22', status: '예정' },
    ],
    createdMeetups: [
      { id: 3, title: '이태원 브런치', date: '2024-10-25', status: '모집중' },
    ],
    favorites: [
      { id: 4, name: '맛있는 한식당', category: '한식' },
      { id: 5, name: '이탈리안 레스토랑', category: '양식' },
    ],
  };

  // 설정 메뉴
  const settingsMenu = [
    { id: 'profile', title: '프로필 관리', icon: 'user', action: () => console.log('프로필 관리') },
    { id: 'notification', title: '알림 설정', icon: 'bell', action: () => console.log('알림 설정') },
    { id: 'privacy', title: '개인정보 관리', icon: 'shield', action: () => console.log('개인정보 관리') },
    { id: 'help', title: '도움말', icon: 'help-circle', action: () => console.log('도움말') },
    { id: 'terms', title: '이용약관', icon: 'file-text', action: () => console.log('이용약관') },
    { id: 'logout', title: '로그아웃', icon: 'log-out', action: () => handleLogout() },
  ];

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => onLogout?.() },
      ]
    );
  };

  const renderActivitySection = (title: string, items: any[], type: 'meetup' | 'favorite') => (
    <View style={styles.activitySection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.activityItem}>
          {type === 'meetup' ? (
            <>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDate}>{item.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.name}</Text>
                <Text style={styles.activityDate}>{item.category}</Text>
              </View>
              <Icon name="heart" size={16} color={COLORS.functional.error} />
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return COLORS.neutral.grey400;
      case '예정': return COLORS.functional.warning;
      case '모집중': return COLORS.functional.success;
      default: return COLORS.neutral.grey400;
    }
  };

  const renderMyActivity = () => (
    <ScrollView style={styles.tabContent}>
      {renderActivitySection('참여한 모임', myActivities.joinedMeetups, 'meetup')}
      {renderActivitySection('만든 모임', myActivities.createdMeetups, 'meetup')}
      {renderActivitySection('즐겨찾기', myActivities.favorites, 'favorite')}
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.settingsSection}>
        {settingsMenu.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.settingsItem, item.id === 'logout' && styles.logoutItem]}
            onPress={item.action}
          >
            <View style={styles.settingsLeft}>
              <Icon name={item.icon as any} size={20} color={item.id === 'logout' ? COLORS.functional.error : COLORS.text.secondary} />
              <Text style={[styles.settingsTitle, item.id === 'logout' && styles.logoutText]}>
                {item.title}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case '내활동':
        return renderMyActivity();
      case '설정':
        return renderSettings();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name?.charAt(0) || '혼'}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.name || '혼밥러'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'honbab@example.com'}</Text>
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>참여 모임</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>만든 모임</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>즐겨찾기</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabNavigation}>
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
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  profileHeader: {
    backgroundColor: '#ede0c8',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
    ...SHADOWS.small,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...SHADOWS.medium,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  selectedTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  activitySection: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.white,
  },
  settingsSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsTitle: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  logoutText: {
    color: COLORS.functional.error,
  },
});

export default MyPageScreen;