import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

  const renderBlockedUser = (user: BlockedUser) => (
    <View key={user.block_id} style={styles.userRow}>
      <ProfileImage
        uri={user.profile_image}
        size={40}
        name={user.name}
        style={styles.avatar}
      />

      <View style={styles.userTextContainer}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userLocation}>차단된 사용자</Text>
      </View>

      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => unblockUser(user.id, user.name)}
      >
        <Text style={styles.unblockButtonText}>차단 해제</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate(-1)}>
            <ArrowLeft size={22} color="#121212" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>차단 사용자 관리</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="animate-shimmer" style={styles.skeletonRow}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonTextGroup}>
                <View style={styles.skeletonName} />
                <View style={styles.skeletonLocation} />
              </View>
              <View style={styles.skeletonButton} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate(-1)}
        >
          <ArrowLeft size={22} color="#121212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단 사용자 관리</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {blockedUsers.length === 0 ? (
          <EmptyState
            icon="user"
            title="차단한 회원이 없습니다"
            description="불편을 끼치는 회원이 있다면 차단 기능을 이용하세요."
            actionLabel="홈으로 돌아가기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <View style={styles.listContainer}>
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
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  headerRight: {
    width: 44,
  },

  // Content
  content: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 4,
  },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    marginRight: 12,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 14,
    color: '#878b94',
  },

  // Unblock button
  unblockButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    cursor: 'pointer',
  },
  unblockButtonText: {
    fontSize: 13,
    color: '#121212',
    fontWeight: '500',
  },

  // Skeleton loading
  skeletonContainer: {
    paddingVertical: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: 6,
  },
  skeletonName: {
    width: '40%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f0f0f0',
  },
  skeletonLocation: {
    width: '25%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  skeletonButton: {
    width: 72,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
});

export default BlockedUsersScreen;
