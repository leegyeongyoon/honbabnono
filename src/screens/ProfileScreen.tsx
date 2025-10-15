import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import BabAlIndex from '../components/BabAlIndex';

const ProfileScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const userProfile = {
    name: '김혼밥',
    email: 'honbab@example.com',
    phone: '010-1234-5678',
    profileImage: 'https://via.placeholder.com/120x120/F5CB76/ffffff?text=김',
    isVerified: true,
    rating: 4.8,
    meetupsJoined: 12,
    meetupsHosted: 5,
    joinDate: '2024년 1월',
    babAlScore: 78, // 밥알지수 추가
  };

  const menuItems = [
    { id: 1, title: '내 모임 관리', icon: '📅', subtitle: '참여/주최한 모임 확인', onPress: () => Alert.alert('준비중', '내 모임 관리 기능은 준비중입니다.') },
    { id: 2, title: '찜한 모임', icon: '❤️', subtitle: '관심있게 본 모임들', onPress: () => Alert.alert('준비중', '찜한 모임 기능은 준비중입니다.') },
    { id: 3, title: '후기 관리', icon: '⭐', subtitle: '내가 쓴 후기 및 받은 평가', onPress: () => Alert.alert('준비중', '후기 관리 기능은 준비중입니다.') },
    { id: 4, title: '활동 내역', icon: '📊', subtitle: '포인트 및 활동 기록', onPress: () => Alert.alert('준비중', '활동 내역 기능은 준비중입니다.') },
    { id: 5, title: '식사 성향', icon: '🍽️', subtitle: '나의 식사 취향 설정', onPress: () => Alert.alert('준비중', '식사 성향 설정은 준비중입니다.') },
    { id: 6, title: '알림 설정', icon: '🔔', subtitle: '푸시 알림 및 이메일 설정', onPress: () => Alert.alert('준비중', '알림 설정 기능은 준비중입니다.') },
  ];

  const handleEditProfile = () => {
    Alert.alert('준비중', '프로필 편집 기능은 준비중입니다.');
  };

  const handleVerification = () => {
    Alert.alert(
      '본인인증',
      '추가 본인인증을 진행하시겠습니까?\n- 신분증 인증\n- 전화번호 인증\n- 이메일 인증',
      [
        { text: '취소', style: 'cancel' },
        { text: '인증하기', onPress: () => Alert.alert('준비중', '본인인증 기능은 준비중입니다.') }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말로 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => Alert.alert('완료', '로그아웃되었습니다.') }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
          {userProfile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✅</Text>
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
          <Text style={styles.userRating}>⭐ {userProfile.rating} · {userProfile.joinDate} 가입</Text>
        </View>

        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>편집</Text>
        </TouchableOpacity>
      </View>

      {/* 밥알지수 섹션 */}
      <View style={styles.babAlSection}>
        <BabAlIndex 
          score={userProfile.babAlScore} 
          showDetails={true}
          size="medium"
        />
      </View>

      {/* 활동 통계 */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userProfile.meetupsJoined}</Text>
          <Text style={styles.statLabel}>참여한 모임</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userProfile.meetupsHosted}</Text>
          <Text style={styles.statLabel}>주최한 모임</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userProfile.rating}</Text>
          <Text style={styles.statLabel}>평점</Text>
        </View>
      </View>

      {/* 본인인증 섹션 */}
      <View style={styles.verificationSection}>
        <Text style={styles.sectionTitle}>🛡️ 안전 인증</Text>
        <TouchableOpacity style={styles.verificationItem} onPress={handleVerification}>
          <View style={styles.verificationInfo}>
            <Text style={styles.verificationTitle}>추가 본인인증</Text>
            <Text style={styles.verificationDesc}>더 안전한 모임을 위해 추가 인증을 완료하세요</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 설정 섹션 */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>⚙️ 설정</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>알림 받기</Text>
            <Text style={styles.settingDesc}>모임 관련 알림을 받습니다</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: COLORS.neutral.grey200, true: COLORS.primary.light }}
            thumbColor={notificationsEnabled ? COLORS.primary.main : COLORS.neutral.grey400}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>위치 서비스</Text>
            <Text style={styles.settingDesc}>근처 모임을 추천받습니다</Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: COLORS.neutral.grey200, true: COLORS.primary.light }}
            thumbColor={locationEnabled ? COLORS.primary.main : COLORS.neutral.grey400}
          />
        </View>
      </View>

      {/* 메뉴 섹션 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>📋 메뉴</Text>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuInfo}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 로그아웃 버튼 */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 앱 정보 */}
      <View style={styles.appInfoSection}>
        <Text style={styles.appInfoText}>혼밥시러 v1.0.0</Text>
        <Text style={styles.appInfoText}>이용약관 · 개인정보처리방침</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  profileHeader: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 2,
  },
  verifiedText: {
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  userRating: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  editButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 10,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.neutral.grey200,
  },
  verificationSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 10,
    padding: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  verificationDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  settingsSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 10,
    padding: 20,
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  menuSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 10,
    padding: 20,
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  menuInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.text.secondary,
  },
  logoutSection: {
    padding: 20,
  },
  logoutButton: {
    backgroundColor: COLORS.functional.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  logoutText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  appInfoSection: {
    padding: 20,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  babAlSection: {
    marginTop: 10,
  },
});

export default ProfileScreen;