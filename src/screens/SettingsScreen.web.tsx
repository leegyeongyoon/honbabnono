import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import userApiService from '../services/userApiService';
import { Icon } from '../components/Icon';

type ModalType = 'logout' | 'deleteAccount' | 'customerService' | null;

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useUserStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user-storage');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await userApiService.deleteAccount();
      logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('user-storage');
      navigate('/login');
    } catch (error) {
      setIsDeleting(false);
      setActiveModal(null);
    }
  };

  const supportMenuItems = [
    { label: '공지사항', onPress: () => navigate('/notices') },
    { label: '자주 묻는 질문', onPress: () => navigate('/faq') },
    { label: '고객센터', onPress: () => setActiveModal('customerService') },
    { label: '약관 및 정책', onPress: () => navigate('/terms') },
    { label: '버전 정보', onPress: () => {} },
  ];

  const settingsMenuItems = [
    { label: '알림 설정', onPress: () => navigate('/notification-settings') },
  ];

  const renderModal = () => {
    if (!activeModal) return null;

    const modalConfig = {
      logout: {
        title: '로그아웃',
        message: '로그아웃 하시겠습니까?',
        cancelLabel: '취소',
        confirmLabel: '확인',
        onConfirm: handleLogout,
        showCancel: true,
      },
      deleteAccount: {
        title: '회원탈퇴',
        message: '이 작업은 되돌릴 수 없습니다.\n정말 계정을 삭제하시겠습니까?',
        cancelLabel: '취소',
        confirmLabel: '삭제',
        onConfirm: handleDeleteAccount,
        showCancel: true,
      },
      customerService: {
        title: '고객센터',
        message: '000000@gmai.com으로\n문의해주시기 바랍니다.',
        cancelLabel: '',
        confirmLabel: '확인',
        onConfirm: () => setActiveModal(null),
        showCancel: false,
      },
    };

    const config = modalConfig[activeModal];

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContainer}>
          <div style={styles.modalTextArea}>
            <div style={styles.modalTitle}>{config.title}</div>
            <div style={styles.modalMessage}>{config.message}</div>
          </div>
          <div style={styles.modalButtonRow}>
            {config.showCancel && (
              <button
                onClick={() => setActiveModal(null)}
                style={styles.modalCancelButton}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                {config.cancelLabel}
              </button>
            )}
            <button
              onClick={config.onConfirm}
              disabled={isDeleting}
              style={{
                ...styles.modalConfirmButton,
                ...(config.showCancel ? {} : { flex: 1 }),
                opacity: isDeleting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!isDeleting) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (!isDeleting) e.currentTarget.style.opacity = '1'; }}
            >
              {isDeleting ? '처리 중...' : config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate(-1)}
          style={styles.headerLeftButton}
        >
          <Icon name="chevron-left" size={24} color="#121212" />
        </button>
        <span style={styles.headerTitle}>설정</span>
        <button
          onClick={() => navigate('/search')}
          style={styles.headerRightButton}
        >
          <Icon name="search" size={22} color="#121212" />
        </button>
      </div>

      {/* Content */}
      <div style={styles.scrollContainer}>
        {/* 고객 지원 Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>고객 지원</div>
          <div style={styles.menuList}>
            {supportMenuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onPress}
                style={{
                  ...styles.menuItem,
                  ...(index === supportMenuItems.length - 1 ? { marginBottom: 0 } : {}),
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={styles.menuItemLabel}>{item.label}</span>
                <Icon name="chevron-right" size={18} color="#b7bbbf" />
              </button>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div style={styles.separator} />

        {/* 설정 Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>설정</div>
          <div style={styles.menuList}>
            {settingsMenuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onPress}
                style={styles.menuItem}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={styles.menuItemLabel}>{item.label}</span>
                <Icon name="chevron-right" size={18} color="#b7bbbf" />
              </button>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div style={styles.separator} />

        {/* 로그아웃 / 회원탈퇴 */}
        <div style={styles.section}>
          <div style={styles.menuList}>
            <button
              onClick={() => setActiveModal('logout')}
              style={styles.menuItem}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={styles.menuItemLabel}>로그아웃</span>
            </button>
            <button
              onClick={() => setActiveModal('deleteAccount')}
              style={styles.menuItem}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ ...styles.menuItemLabel, color: '#d32f2f' }}>회원탈퇴</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#ffffff',
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
  headerRightButton: {
    position: 'absolute',
    right: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 32,
    textAlign: 'left',
    borderRadius: 6,
    transition: 'background-color 150ms ease',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: '#090909',
  },
  separator: {
    height: 8,
    backgroundColor: '#efefef',
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
    padding: 24,
    width: 296,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
  },
  modalTextArea: {
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 600,
    color: '#1c1c1f',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 17,
    color: '#1c1c1f',
    lineHeight: 1.45,
    whiteSpace: 'pre-line',
  },
  modalButtonRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 99,
    backgroundColor: '#f4f5f8',
    color: '#1c1c1f',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
  modalConfirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 99,
    backgroundColor: '#ffa529',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
  },
};

export default SettingsScreen;
