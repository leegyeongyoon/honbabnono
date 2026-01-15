import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import userApiService from '../../services/userApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

const UniversalWishlistScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [wishlistMeetups, setWishlistMeetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    try {
      setError(null);
      console.log('❤️ 찜 목록 조회 시작');
      const response = await userApiService.getWishlist();
      console.log('❤️ 찜 목록 응답:', response);
      setWishlistMeetups(response.data || response.meetups || []);
    } catch (error) {
      console.error('찜한 모임 조회 실패:', error);
      setError('찜한 모임을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const removeFromWishlist = async (meetupId: string) => {
    try {
      await userApiService.removeFromWishlist(meetupId);
      setWishlistMeetups(prev => prev.filter(m => m.id !== meetupId));
    } catch (error) {
      console.error('찜 해제 실패:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>찜한 모임</Text>
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
        <Text style={styles.headerTitle}>찜한 모임</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchWishlist();}} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchWishlist}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : wishlistMeetups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="heart" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>찜한 모임이 없습니다</Text>
            <Text style={styles.emptySubtext}>마음에 드는 모임을 찜해보세요!</Text>
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.findButtonText}>모임 찾기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {wishlistMeetups.map(meetup => (
              <View key={meetup.id} style={styles.wishlistItem}>
                <MeetupCard
                  meetup={meetup}
                  onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromWishlist(meetup.id)}
                >
                  <Icon name="x" size={16} color={COLORS.functional.error} />
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
  wishlistItem: { position: 'relative', marginBottom: 12 },
  removeButton: {
    position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.neutral.white,
    borderRadius: 12, padding: 4, ...SHADOWS.small,
  },
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

export default UniversalWishlistScreen;
