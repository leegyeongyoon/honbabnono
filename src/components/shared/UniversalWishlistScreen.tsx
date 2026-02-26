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

const normalizeMeetup = (item: any) => ({
  id: item.id || item.meetup_id,
  title: item.title || '제목 없음',
  description: item.description || '',
  date: item.date || item.meetup_date || '',
  time: item.time || item.meetup_time || '',
  location: item.location || item.meetup_location || '위치 미정',
  category: item.category || '',
  hostName: item.hostName || item.host_name || '익명',
  currentParticipants: item.currentParticipants ?? item.current_participants ?? 0,
  maxParticipants: item.maxParticipants ?? item.max_participants ?? 4,
  image: item.image || item.meetup_image || null,
  status: item.status || '모집중',
  ...item,
});

const UniversalWishlistScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [wishlistMeetups, setWishlistMeetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    try {
      setError(null);
      const response = await userApiService.getWishlist();
      const rawData = response.data || response.meetups || response.wishlists || [];
      const items = Array.isArray(rawData) ? rawData.map(normalizeMeetup) : [];
      setWishlistMeetups(items);
    } catch (_error) {
      setError('찜한 약속을 불러오는데 실패했습니다');
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
    } catch (_error) {
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>찜한 약속</Text>
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
        <Text style={styles.headerTitle}>찜한 약속</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchWishlist();}} tintColor={COLORS.primary.accent} colors={[COLORS.primary.accent]} />}
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
            <Text style={styles.emptyText}>찜한 약속이 없습니다</Text>
            <Text style={styles.emptySubtext}>마음에 드는 약속을 찜해보세요!</Text>
            <TouchableOpacity
              style={styles.findButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.findButtonText}>약속 찾기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
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
  wishlistItem: {
    position: 'relative',
    marginBottom: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
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
  findButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    ...SHADOWS.cta,
  },
  findButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
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

export default UniversalWishlistScreen;
