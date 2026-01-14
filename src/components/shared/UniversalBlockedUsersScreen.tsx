import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface BlockedUser {
  id: string;
  username: string;
  profile_image?: string;
  blocked_at: string;
  blocked_reason?: string;
}

const UniversalBlockedUsersScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/user/blocked-users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setBlockedUsers(data.users || []);
    } catch (error) {
      console.error('차단 목록 조회 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBlockedUsers(); }, [fetchBlockedUsers]);

  const unblockUser = async (userId: string) => {
    Alert.alert(
      '차단 해제',
      '이 사용자의 차단을 해제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              await fetch(`${getApiUrl()}/user/blocked-users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              setBlockedUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
              console.error('차단 해제 실패:', error);
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>차단한 사용자</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchBlockedUsers();}} />}
      >
        {blockedUsers.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <Icon name="x-circle" size={48} color={COLORS.text.tertiary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16 }}>
              차단한 사용자가 없습니다
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {blockedUsers.map(user => (
              <View key={user.id} style={styles.userItem}>
                <View style={styles.userAvatar}>
                  <Icon name="user" size={24} color={COLORS.text.secondary} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{user.username}</Text>
                  <Text style={styles.blockedDate}>
                    {new Date(user.blocked_at).toLocaleDateString('ko-KR')} 차단
                  </Text>
                  {user.blocked_reason && (
                    <Text style={styles.blockedReason}>{user.blocked_reason}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.unblockButton}
                  onPress={() => unblockUser(user.id)}
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
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.neutral.background,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
  blockedDate: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  blockedReason: { fontSize: 12, color: COLORS.functional.error, marginTop: 4 },
  unblockButton: {
    backgroundColor: COLORS.functional.error, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
  },
  unblockButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.neutral.white },
});

export default UniversalBlockedUsersScreen;