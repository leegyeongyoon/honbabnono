import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import userApiService from '../../services/userApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

const UniversalRecentViewsScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [recentMeetups, setRecentMeetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentViews = useCallback(async () => {
    try {
      setError(null);
      console.log('👁️ 최근 본 모임 조회 시작');
      const response = await userApiService.getRecentViews();
      console.log('👁️ 최근 본 모임 응답:', response);
      setRecentMeetups(response.data || response.meetups || []);
    } catch (error) {
      console.error('최근 본 모임 조회 실패:', error);
      setError('최근 본 모임을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRecentViews(); }, [fetchRecentViews]);

  const clearAll = () => {
    Alert.alert(
      '전체 삭제',
      '최근 본 모임 기록을 모두 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await userApiService.clearRecentViews();
              setRecentMeetups([]);
            } catch (error) {
              console.error('전체 삭제 실패:', error);
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
          <Text style={styles.headerTitle}>최근 본 모임</Text>
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
        <Text style={styles.headerTitle}>최근 본 모임</Text>
        {recentMeetups.length > 0 ? (
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearButton}>전체 삭제</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchRecentViews();}} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRecentViews}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : recentMeetups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="eye" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>최근 본 모임이 없습니다</Text>
            <Text style={styles.emptySubtext}>관심있는 모임을 둘러보세요!</Text>
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.findButtonText}>모임 찾기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {recentMeetups.map(meetup => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
              />
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
  clearButton: { fontSize: 14, color: COLORS.functional.error, fontWeight: '500' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14, color: COLORS.text.secondary, marginTop: 8, textAlign: 'center',
  },
  findButton: {
    marginTop: 20, backgroundColor: COLORS.primary.main, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 8,
  },
  findButtonText: {
    fontSize: 14, fontWeight: '600', color: COLORS.neutral.white,
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

export default UniversalRecentViewsScreen;
