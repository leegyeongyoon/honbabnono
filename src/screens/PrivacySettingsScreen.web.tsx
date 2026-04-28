import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/mypage')}
          style={styles.headerLeftButton}
        >
          <Icon name="chevron-left" size={24} color="#121212" />
        </button>
        <span style={styles.headerTitle}>개인정보 설정</span>
        <div style={styles.headerRight} />
      </div>

      {/* Content */}
      <div style={styles.scrollContainer}>
        {/* 계정 정보 Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>계정 정보</div>
          <div style={styles.menuList}>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>이름</span>
              <span style={styles.accountValue}>{user?.name || '사용자'}</span>
            </div>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>이메일</span>
              <span style={styles.accountValue}>{user?.email || 'user@example.com'}</span>
            </div>
            <div style={{ ...styles.accountRow, borderBottom: 'none', marginBottom: 0 }}>
              <span style={styles.accountLabel}>가입 방법</span>
              <span style={styles.accountValue}>
                {user?.provider === 'kakao' ? '카카오 계정' : '이메일 계정'}
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={styles.separator} />

        {/* 보안 설정 Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>보안 설정</div>
          <div style={styles.menuList}>
            {user?.provider !== 'kakao' && (
              <button
                onClick={() => setShowPasswordChange(true)}
                style={styles.menuItem}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={styles.menuItemLabel}>비밀번호 변경</span>
                <Icon name="chevron-right" size={18} color="#b7bbbf" />
              </button>
            )}
            <button
              onClick={() => showInfo('로그인 기록 기능은 곧 추가될 예정입니다.')}
              style={{ ...styles.menuItem, marginBottom: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={styles.menuItemLabel}>로그인 기록</span>
              <Icon name="chevron-right" size={18} color="#b7bbbf" />
            </button>
          </div>
        </div>

        {/* Separator */}
        <div style={styles.separator} />

        {/* 개인정보 관리 Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>개인정보 관리</div>
          <div style={styles.menuList}>
            <button
              onClick={() => showInfo('데이터 다운로드 기능은 곧 추가될 예정입니다.')}
              style={styles.menuItem}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={styles.menuItemLabel}>데이터 다운로드</span>
              <Icon name="chevron-right" size={18} color="#b7bbbf" />
            </button>
            <button
              onClick={() => showInfo('데이터 삭제 요청 기능은 곧 추가될 예정입니다.')}
              style={{ ...styles.menuItem, marginBottom: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={styles.menuItemLabel}>데이터 삭제 요청</span>
              <Icon name="chevron-right" size={18} color="#b7bbbf" />
            </button>
          </div>
        </div>

        {/* Separator */}
        <div style={styles.separator} />

        {/* 계정 관리 Section */}
        <div style={styles.section}>
          <div style={styles.menuList}>
            <button
              onClick={handleLogout}
              style={styles.menuItem}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={styles.menuItemLabel}>로그아웃</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              style={{ ...styles.menuItem, marginBottom: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ ...styles.menuItemLabel, color: '#FF3B30' }}>계정 삭제</span>
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <div style={styles.modalHeader}>
              <button
                onClick={() => setShowPasswordChange(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={24} color="#121212" />
              </button>
              <span style={styles.modalTitle}>비밀번호 변경</span>
              <button
                onClick={handlePasswordChange}
                disabled={loading}
                style={{
                  ...styles.modalSaveButton,
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '변경 중...' : '변경'}
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>현재 비밀번호</label>
                <input
                  type="password"
                  style={styles.passwordInput}
                  placeholder="현재 비밀번호를 입력하세요"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>새 비밀번호</label>
                <input
                  type="password"
                  style={styles.passwordInput}
                  placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>비밀번호 확인</label>
                <input
                  type="password"
                  style={styles.passwordInput}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmDialog {...dialog} />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#fff',
    position: 'relative',
    borderBottom: '1px solid #f1f2f3',
    flexShrink: 0,
  },
  headerLeftButton: {
    position: 'absolute',
    left: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#121212',
    letterSpacing: -0.3,
  },
  headerRight: {
    position: 'absolute',
    right: 20,
    width: 24,
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  section: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: '#b7bbbf',
    marginBottom: 16,
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 4px',
    height: 56,
    textAlign: 'left',
    borderRadius: 6,
    marginBottom: 0,
    transition: 'background-color 150ms ease',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: '#090909',
  },
  accountRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottom: '1px solid #f1f2f3',
    padding: '0 4px',
  },
  accountLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: '#878b94',
  },
  accountValue: {
    fontSize: 16,
    fontWeight: 500,
    color: '#121212',
  },
  separator: {
    height: 8,
    backgroundColor: '#F5F5F5',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottom: '1px solid #f1f2f3',
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#121212',
  },
  modalSaveButton: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    fontWeight: 600,
    color: '#FFA529',
    cursor: 'pointer',
    padding: 0,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#121212',
    marginBottom: 8,
  },
  passwordInput: {
    border: '1px solid #f1f2f3',
    borderRadius: 6,
    padding: '12px 16px',
    fontSize: 16,
    color: '#121212',
    backgroundColor: '#FAFAFA',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 200ms ease',
  },
};

export default PrivacySettingsScreen;
