import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { HEADER_STYLE } from '../styles/spacing';
import { Icon } from '../components/Icon';
import { ArrowLeft, UserX, Shield, AlertTriangle } from 'lucide-react';
import apiClient from '../services/apiClient';
import { ProfileImage } from '../components/ProfileImage';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

interface BlockedUser {
  block_id: string;
  reason: string;
  blocked_at: string;
  id: string;
  name: string;
  email: string;
  profile_image?: string;
}

const BlockedUsersScreen: React.FC = () => {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { dialog, showDialog } = useConfirmDialog();

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user/blocked-users', {
        params: { page: 1, limit: 50 }
      });

      if (response.data && response.data.success) {
        setBlockedUsers(response.data.data || []);
      } else {
        setBlockedUsers([]);
      }
    } catch (error) {
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId: string, userName: string) => {
    const confirmed = await showDialog({
      title: '차단 해제',
      message: `${userName}님의 차단을 해제하시겠습니까?`,
      confirmLabel: '해제',
      cancelLabel: '취소',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await apiClient.delete(`/users/${userId}/block`);

      if (response.data && response.data.success) {
        setBlockedUsers(prev => prev.filter(user => user.id !== userId));
        showSuccess(response.data.message || '차단이 해제되었습니다.');
      } else {
        showError(response.data?.message || '차단 해제에 실패했습니다.');
      }
    } catch (error) {
      showError('차단 해제 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  };

  const renderBlockedUser = (user: BlockedUser) => (
    <View key={user.block_id} style={styles.userCard}>
      <View style={styles.userInfo}>
        <ProfileImage
          uri={user.profile_image}
          size={60}
          name={user.name}
          style={styles.profileImage}
        />

        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          {user.reason && (
            <View style={styles.reasonContainer}>
              <AlertTriangle size={14} color={COLORS.text.secondary} />
              <Text style={styles.reasonText}>{user.reason}</Text>
            </View>
          )}

          <Text style={styles.blockedDate}>
            {formatDate(user.blocked_at)} 차단
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => unblockUser(user.id, user.name)}
      >
        <UserX size={20} color={COLORS.neutral.white} />
        <Text style={styles.unblockButtonText}>차단 해제</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
            <ArrowLeft size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>차단 회원 관리</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="animate-shimmer" style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.neutral.grey50, borderRadius: 8, gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.neutral.grey100 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ width: '50%', height: 14, borderRadius: 7, backgroundColor: COLORS.neutral.grey100 }} />
                <View style={{ width: '30%', height: 10, borderRadius: 5, backgroundColor: COLORS.neutral.grey100 }} />
              </View>
              <View style={{ width: 72, height: 32, borderRadius: 6, backgroundColor: COLORS.neutral.grey100 }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate(-1)}
        >
          <ArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단 회원 관리</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 통계 정보 */}
      {blockedUsers.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Shield size={24} color={COLORS.functional.error} />
            <Text style={styles.statNumber}>{blockedUsers.length}</Text>
            <Text style={styles.statLabel}>차단한 회원</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {blockedUsers.length === 0 ? (
          <EmptyState
            icon="shield"
            title="차단한 회원이 없습니다"
            description="불편을 끼치는 회원이 있다면 차단 기능을 이용하세요."
            actionLabel="홈으로 돌아가기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <View style={styles.blockedUsersGrid}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>차단한 회원 ({blockedUsers.length}명)</Text>
              <Text style={styles.sectionSubtitle}>
                차단한 회원의 약속, 채팅, 댓글이 보이지 않습니다.
              </Text>
            </View>
            {blockedUsers.map(renderBlockedUser)}
          </View>
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      <ConfirmDialog {...dialog} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...HEADER_STYLE.sub,
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
    ...HEADER_STYLE.subTitle,
  },
  placeholder: {
    width: 40,
  },

  // 통계
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
  },
  statCard: {
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.functional.error,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // 컨텐츠
  content: {
    flex: 1,
  },

  // 차단 회원 목록
  blockedUsersGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // 사용자 카드
  userCard: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  blockedDate: {
    fontSize: 13,
    color: COLORS.text.accent,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.functional.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  unblockButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BlockedUsersScreen;
