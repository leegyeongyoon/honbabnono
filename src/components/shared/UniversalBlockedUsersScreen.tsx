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
    } catch (_error) {
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
            } catch (_error) {
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
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>차단한 사용자</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>차단한 사용자</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchBlockedUsers();}} tintColor={COLORS.primary.accent} colors={[COLORS.primary.accent]} />}
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
          <View style={styles.listContainer}>
            {blockedUsers.map(blockedUser => (
              <View key={blockedUser.id} style={styles.userItem}>
                <View style={styles.userAvatar}>
                  <Icon name="user" size={22} color={COLORS.text.tertiary} />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
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
    ...SHADOWS.sticky,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.1,
  },
  blockedDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 3,
  },
  blockedReason: {
    fontSize: 12,
    color: COLORS.functional.error,
    marginTop: 3,
  },
  unblockButton: {
    backgroundColor: COLORS.functional.error,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  unblockButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
});

export default UniversalBlockedUsersScreen;
