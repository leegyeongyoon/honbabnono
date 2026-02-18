import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import BabAlIndex from '../components/BabAlIndex';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/SimpleIcon';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import ConfirmDialog from '../components/ConfirmDialog';

interface ProfileScreenProps {
  navigation?: any;
  user?: any;
  onLogout?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, user, onLogout }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const { dialog, confirm, confirmDanger, hideDialog } = useConfirmDialog();

  const userProfile = {
    name: user?.name || '사용자',
    email: user?.email || user?.kakao_account?.email || 'user@example.com',
    phone: '010-1234-5678',
    profileImage: user?.properties?.profile_image || user?.kakao_account?.profile?.profile_image_url || 'https://via.placeholder.com/120x120/F5CB76/ffffff?text=사',
    isVerified: true,
    rating: 4.8,
    meetupsJoined: 12,
    meetupsHosted: 5,
    joinDate: '2024년 1월',
    babAlScore: 78,
  };

  const menuItems = [
    { id: 1, title: '내 모임 관리', icon: 'calendar' as IconName, subtitle: '참여/주최한 모임 확인', onPress: () => navigation?.navigate('MyMeetups') },
    { id: 2, title: '리뷰 보기', icon: 'star' as IconName, subtitle: '내가 쓴 후기 및 받은 평가', onPress: () => navigation?.navigate('MyReviews') },
    { id: 3, title: '내 뱃지', icon: 'award' as IconName, subtitle: '획득한 뱃지 및 업적', onPress: () => navigation?.navigate('MyBadges') },
    { id: 4, title: '포인트 내역', icon: 'dollar-sign' as IconName, subtitle: '포인트 충전 및 사용 기록', onPress: () => navigation?.navigate('PointHistory') },
    { id: 5, title: '설정', icon: 'settings' as IconName, subtitle: '앱 설정 및 알림 관리', onPress: () => navigation?.navigate('Settings') },
    { id: 6, title: '차단 관리', icon: 'x-circle' as IconName, subtitle: '차단한 사용자 관리', onPress: () => navigation?.navigate('BlockedUsers') },
  ];

  const handleEditProfile = () => {
    setEditedName(userProfile.name);
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    // TODO: 실제 API 호출로 이름 업데이트
    showSuccess('프로필이 업데이트되었습니다.');
    setShowEditModal(false);
  };

  const handleVerification = async () => {
    const confirmed = await confirm('본인인증', '추가 본인인증을 진행하시겠습니까?\n- 신분증 인증\n- 전화번호 인증\n- 이메일 인증');
    if (confirmed) {
      showInfo('본인인증 기능은 준비중입니다.');
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmDanger('로그아웃', '정말로 로그아웃하시겠습니까?');
    if (confirmed) {
      if (onLogout) {
        onLogout();
      } else {
        showSuccess('로그아웃되었습니다.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* 고정 헤더 */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>마이페이지</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation?.navigate('Settings')}>
            <Icon name="settings" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {/* 프로필 헤더 */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image source={{ uri: userProfile.profileImage }} style={styles.profileImage} />
            {userProfile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="check-circle" size={16} color={COLORS.functional.success} />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userProfile.name}</Text>
            <Text style={styles.userEmail}>{userProfile.email}</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap:4}}><Icon name="star" size={12} color={COLORS.functional.warning} /><Text style={styles.userRating}>{userProfile.rating} · {userProfile.joinDate} 가입</Text></View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>편집</Text>
          </TouchableOpacity>
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
          <Text style={styles.statNumber}>{userProfile.babAlScore}</Text>
          <Text style={styles.statLabel}>밥알지수</Text>
        </View>
      </View>

      {/* 본인인증 섹션 */}
      <View style={styles.verificationSection}>
        <View style={{flexDirection:'row', alignItems:'center', gap:8}}><Icon name="award" size={18} color={COLORS.primary.main} /><Text style={styles.sectionTitle}>안전 인증</Text></View>
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
        <View style={{flexDirection:'row', alignItems:'center', gap:8}}><Icon name="settings" size={18} color={COLORS.primary.main} /><Text style={styles.sectionTitle}>설정</Text></View>
        
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
        <View style={{flexDirection:'row', alignItems:'center', gap:8}}><Icon name="list" size={18} color={COLORS.primary.main} /><Text style={styles.sectionTitle}>메뉴</Text></View>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuInfo}>
              <View style={{width:36, height:36, borderRadius:18, backgroundColor:COLORS.primary.light, alignItems:'center', justifyContent:'center', marginRight:16}}>
                <Icon name={item.icon as IconName} size={18} color={COLORS.primary.main} />
              </View>
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
        <Text style={styles.appInfoText}>잇테이블 v1.0.0</Text>
        <Text style={styles.appInfoText}>이용약관 · 개인정보처리방침</Text>
      </View>

      {/* 이름 수정 모달 */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>이름 수정</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <Icon name="x" size={18} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>새로운 이름</Text>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="이름을 입력하세요"
                maxLength={20}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmDialog {...dialog} onConfirm={hideDialog} onCancel={hideDialog} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingTop: LAYOUT.HEADER_HEIGHT + LAYOUT.CONTENT_TOP_MARGIN, // 고정 헤더 + 마진
  },
  profileHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.neutral.grey200,
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
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
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
    backgroundColor: COLORS.primary.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    backgroundColor: COLORS.primary.light,
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 0,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
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
    borderRadius: 8,
    borderWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    borderRadius: 8,
    borderWidth: 0,
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
    borderRadius: 8,
    borderWidth: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    minHeight: 56,
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
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '400',
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
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  logoutSection: {
    padding: 20,
  },
  logoutButton: {
    backgroundColor: COLORS.functional.error,
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  logoutText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,14,12,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
    borderWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: COLORS.primary.dark,
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary.accent,
    ...SHADOWS.small,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 20,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.secondary.light,
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  cancelButton: {
    backgroundColor: COLORS.neutral.grey200,
  },
  cancelButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary.main,
  },
  saveButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;