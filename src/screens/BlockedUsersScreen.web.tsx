import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { ArrowLeft, UserX, Shield, AlertTriangle } from 'lucide-react';
import apiClient from '../services/apiClient';
import { ProfileImage } from '../components/ProfileImage';

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

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      console.log('🚫 차단 회원 목록 조회 시작');
      const response = await apiClient.get('/user/blocked-users', {
        params: { page: 1, limit: 50 }
      });
      
      if (response.data && response.data.success) {
        setBlockedUsers(response.data.data || []);
        console.log('✅ 차단 회원 목록 조회 성공:', response.data.data?.length, '건');
      } else {
        console.error('❌ 차단 회원 목록 조회 실패:', response.data?.message || 'Unknown error');
        setBlockedUsers([]);
      }
    } catch (error) {
      console.error('❌ 차단 회원 목록 조회 실패:', error);
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId: string, userName: string) => {
    Alert.alert(
      '차단 해제',
      `${userName}님의 차단을 해제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔓 회원 차단 해제 시도:', userId);
              const response = await apiClient.delete(`/users/${userId}/block`);
              
              if (response.data && response.data.success) {
                setBlockedUsers(prev => prev.filter(user => user.id !== userId));
                console.log('✅ 회원 차단 해제 성공');
                Alert.alert('완료', response.data.message);
              } else {
                console.error('❌ 회원 차단 해제 실패:', response.data?.message);
                Alert.alert('오류', response.data?.message || '차단 해제에 실패했습니다.');
              }
            } catch (error) {
              console.error('❌ 회원 차단 해제 실패:', error);
              Alert.alert('오류', '차단 해제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
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
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>차단 회원 목록을 불러오는 중...</Text>
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
            <Shield size={24} color={COLORS.text.error} />
            <Text style={styles.statNumber}>{blockedUsers.length}</Text>
            <Text style={styles.statLabel}>차단한 회원</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚫</Text>
            <Text style={styles.emptyTitle}>차단한 회원이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              불편을 끼치는 회원이 있다면{'\n'}차단 기능을 이용하세요.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/home')}
            >
              <Text style={styles.exploreButtonText}>홈으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.blockedUsersGrid}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>차단한 회원 ({blockedUsers.length}명)</Text>
              <Text style={styles.sectionSubtitle}>
                차단한 회원의 모임, 채팅, 댓글이 보이지 않습니다.
              </Text>
            </View>
            {blockedUsers.map(renderBlockedUser)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.error,
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
  
  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.small,
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
    fontSize: 12,
    color: COLORS.text.disabled,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.text.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  unblockButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BlockedUsersScreen;