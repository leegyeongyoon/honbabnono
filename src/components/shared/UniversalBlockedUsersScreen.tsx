import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface BlockedUser {
  id: string;
  username: string;
  name?: string;
  profile_image?: string;
  blocked_at: string;
  blocked_reason?: string;
}

const UniversalBlockedUsersScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      setError(null);
      const response = await userApiService.getBlockedUsers();
      setBlockedUsers(response.data || response.users || []);
    } catch (error) {
      console.error('차단 목록 조회 실패:', error);
      setError('차단 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBlockedUsers(); }, [fetchBlockedUsers]);

  const unblockUser = async (userId: string, username: string) => {
    Alert.alert(
      '차단 해제',
      `${username}님의 차단을 해제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            try {
              await userApiService.unblockUser(userId);
              setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
              console.error('차단 해제 실패:', error);
              Alert.alert('오류', '차단 해제에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>차단한 사용자</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>차단한 사용자</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchBlockedUsers();}} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchBlockedUsers}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : blockedUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="x-circle" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>차단한 사용자가 없습니다</Text>
            <Text style={styles.emptySubtext}>불편한 사용자가 있다면 차단할 수 있어요</Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {blockedUsers.map(blockedUser => (
              <View key={blockedUser.id} style={styles.userItem}>
                <View style={styles.userAvatar}>
                  <Icon name="user" size={24} color={COLORS.text.secondary} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{blockedUser.username || blockedUser.name}</Text>
                  <Text style={styles.blockedDate}>
                    {new Date(blockedUser.blocked_at).toLocaleDateString('ko-KR')} 차단
                  </Text>
                  {blockedUser.blocked_reason && (
                    <Text style={styles.blockedReason}>{blockedUser.blocked_reason}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => unblockUser(blockedUser.id, blockedUser.username || blockedUser.name || '사용자')}
                >
                  <Text style={styles.unblockButtonText}>차단 해제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.neutral.white, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  userItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.neutral.white,
    borderRadius: 12, padding: 16, marginBottom: 8, ...SHADOWS.small,
  },
  userAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.neutral.background,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  blockedDate: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  blockedReason: { fontSize: 12, color: COLORS.functional.error, marginTop: 4 },
  unblockButton: {
    backgroundColor: COLORS.functional.error, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  unblockButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.neutral.white },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14, color: COLORS.text.secondary, marginTop: 8, textAlign: 'center',
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80,
  },
  errorText: {
    fontSize: 16, color: COLORS.text.secondary, marginTop: 16, textAlign: 'center',
  },
  retryButton: {
    marginTop: 16, backgroundColor: COLORS.primary.main, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14, fontWeight: '600', color: COLORS.neutral.white,
  },
});

export default UniversalBlockedUsersScreen;
