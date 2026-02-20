import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MeetupCard from '../MeetupCard';
import { COLORS, SHADOWS } from '../../styles/colors';
import { useMeetups } from '../../hooks/useMeetups';
import { Icon } from '../Icon';
import { NotificationBell } from '../NotificationBell';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface UniversalMeetupListScreenProps {
  navigation: NavigationAdapter;
}

const DISTANCE_OPTIONS = [
  { label: '전체', value: 0 },
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
];

const UniversalMeetupListScreen: React.FC<UniversalMeetupListScreenProps> = ({
  navigation
}) => {
  const { meetups, loading, error, refreshMeetups } = useMeetups();
  const [filter, setFilter] = useState<'all' | 'recruiting' | 'full'>('all');
  const [distanceFilter, setDistanceFilter] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // 사용자 위치 가져오기
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setUserLocation(loc);
          refreshMeetups({ latitude: loc.latitude, longitude: loc.longitude });
        },
        () => {
          refreshMeetups();
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      refreshMeetups();
    }
  }, []);

  const filteredMeetups = meetups.filter(meetup => {
    // 상태 필터
    let statusMatch = true;
    switch (filter) {
      case 'recruiting':
        statusMatch = meetup.status === 'recruiting';
        break;
      case 'full':
        statusMatch = (meetup.currentParticipants || meetup.current_participants) >= (meetup.maxParticipants || meetup.max_participants);
        break;
    }
    // 거리 필터
    let distanceMatch = true;
    if (distanceFilter > 0 && meetup.distance != null) {
      distanceMatch = meetup.distance <= distanceFilter;
    } else if (distanceFilter > 0 && meetup.distance == null) {
      distanceMatch = false;
    }
    return statusMatch && distanceMatch;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>약속을 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>약속을 불러올 수 없습니다.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshMeetups}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>모든 약속</Text>
        <NotificationBell
          onPress={() => {
            navigation.navigate('Notification');
          }}
          color={COLORS.text.primary}
          size={20}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            전체 ({meetups.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'recruiting' && styles.activeFilter]}
          onPress={() => setFilter('recruiting')}
        >
          <Text style={[styles.filterText, filter === 'recruiting' && styles.activeFilterText]}>
            모집중 ({meetups.filter(m => m.status === 'recruiting').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'full' && styles.activeFilter]}
          onPress={() => setFilter('full')}
        >
          <Text style={[styles.filterText, filter === 'full' && styles.activeFilterText]}>
            모집완료 ({meetups.filter(m => (m.currentParticipants || m.current_participants) >= (m.maxParticipants || m.max_participants)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {userLocation && (
        <View style={styles.distanceFilterContainer}>
          <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distanceScroll}>
            {DISTANCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.distanceChip, distanceFilter === option.value && styles.distanceChipActive]}
                onPress={() => setDistanceFilter(option.value)}
              >
                <Text style={[styles.distanceChipText, distanceFilter === option.value && styles.distanceChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredMeetups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? '등록된 약속이 없습니다.'
                : filter === 'recruiting' ? '모집중인 약속이 없습니다.' : '모집완료된 약속이 없습니다.'
              }
            </Text>
          </View>
        ) : (
          filteredMeetups.map((meetup) => (
            <MeetupCard
              key={meetup.id}
              meetup={meetup}
              onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMeetup')}
      >
        <Icon name="plus" size={24} color={COLORS.text.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.text.white,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 52,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: COLORS.primary.main,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.text.white,
  },
  distanceFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  distanceScroll: {
    flexGrow: 0,
  },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey100,
    marginRight: 6,
  },
  distanceChipActive: {
    backgroundColor: COLORS.primary.main,
  },
  distanceChipText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  distanceChipTextActive: {
    color: COLORS.text.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
});

export default UniversalMeetupListScreen;