import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { useUserStore } from '../store/userStore';
import apiClient from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const PrivacySettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const { dialog, confirm, confirmDanger, hideDialog } = useConfirmDialog();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.put('/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        showSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordChange(false);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '비밀번호 변경에 실패했습니다.';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirmDanger('계정 삭제', '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (confirmed) {
      try {
        const response = await apiClient.delete('/user/account');
        if (response.data.success) {
          showSuccess('계정이 삭제되었습니다.');
          logout();
          navigate('/');
        }
      } catch (error) {
        showError('계정 삭제에 실패했습니다.');
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm('로그아웃', '정말로 로그아웃하시겠습니까?');
    if (confirmed) {
      logout();
      navigate('/');
    }
  };

  const renderMenuItem = (
    title: string,
    description: string,
    iconName: string,
    onPress: () => void,
    danger: boolean = false
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
    >
      <View style={styles.menuIconContainer}>
        <Icon name={iconName} size={18} color={danger ? '#D32F2F' : '#C49A70'} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={16} color="#5C4F42" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color="#1A1714" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보 설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.name || '사용자'}</Text>
              <Text style={styles.accountEmail}>{user?.email || 'user@example.com'}</Text>
              <Text style={styles.accountProvider}>
                {user?.provider === 'kakao' ? '카카오 계정' : '이메일 계정'}으로 가입
              </Text>
            </View>
          </View>
        </View>

        {/* 보안 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>보안 설정</Text>
          <View style={styles.menuContainer}>
            {user?.provider !== 'kakao' && renderMenuItem(
              '비밀번호 변경',
              '계정 보안을 위해 주기적으로 변경하세요',
              'settings',
              () => setShowPasswordChange(true)
            )}
            {renderMenuItem(
              '로그인 기록',
              '최근 로그인 활동을 확인합니다',
              'smartphone',
              () => showInfo('로그인 기록 기능은 곧 추가될 예정입니다.')
            )}
          </View>
        </View>

        {/* 개인정보 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>개인정보 관리</Text>
          <View style={styles.menuContainer}>
            {renderMenuItem(
              '데이터 다운로드',
              '내 활동 데이터를 다운로드합니다',
              'arrow-left',
              () => showInfo('데이터 다운로드 기능은 곧 추가될 예정입니다.')
            )}
            {renderMenuItem(
              '데이터 삭제 요청',
              '개인 데이터 삭제를 요청합니다',
              'trash-2',
              () => showInfo('데이터 삭제 요청 기능은 곧 추가될 예정입니다.')
            )}
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <View style={styles.menuContainer}>
            {renderMenuItem(
              '로그아웃',
              '현재 계정에서 로그아웃합니다',
              'external-link',
              handleLogout
            )}
            {renderMenuItem(
              '계정 삭제',
              '계정을 영구적으로 삭제합니다',
              'alert-triangle',
              handleDeleteAccount,
              true
            )}
          </View>
        </View>
      </ScrollView>

      {/* 비밀번호 변경 모달 */}
      {showPasswordChange && (
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordChange(false)}>
                <Icon name="x" size={24} color="#1A1714" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>비밀번호 변경</Text>
              <TouchableOpacity
                onPress={handlePasswordChange}
                disabled={loading}
              >
                <Text style={[styles.saveText, loading && styles.disabledText]}>
                  {loading ? '변경 중...' : '변경'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>현재 비밀번호</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="현재 비밀번호를 입력하세요"
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>새 비밀번호</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>비밀번호 확인</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        </View>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmDialog {...dialog} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFECEA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1714',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1714',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#EFECEA',
  },
  accountCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accountInfo: {
    alignItems: 'center',
  },
  accountName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1714',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 16,
    color: '#5C4F42',
    marginBottom: 8,
  },
  accountProvider: {
    fontSize: 14,
    color: '#C49A70',
    fontWeight: '500',
  },
  menuContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F5F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1714',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    color: '#5C4F42',
  },
  dangerText: {
    color: '#D32F2F',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  passwordModal: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1714',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C49A70',
  },
  disabledText: {
    color: '#8B7E72',
  },
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1714',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.10)',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1714',
    backgroundColor: '#FAFAF8',
    transition: 'all 200ms ease',
  },
});

export default PrivacySettingsScreen;
