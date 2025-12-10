import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouterNavigation } from '../components/RouterNavigation';
import MeetupCard from '../components/MeetupCard';
import { COLORS, SHADOWS } from '../styles/colors';
import { useMeetups } from '../hooks/useMeetups';
import { formatKoreanDateTime } from '../utils/dateUtils';
import { Icon } from '../components/Icon';
import { FOOD_CATEGORIES } from '../constants/categories';
import { NotificationBell } from '../components/NotificationBell';


const MeetupListScreen = () => {
  const navigation = useRouterNavigation();
  const { meetups, loading, error, refreshMeetups } = useMeetups();
  const [filter, setFilter] = useState<'all' | 'recruiting' | 'full'>('all');

  useEffect(() => {
    refreshMeetups();
  }, []);

  const filteredMeetups = meetups.filter(meetup => {
    switch (filter) {
      case 'recruiting':
        return meetup.status === '모집중';
      case 'full':
        return (meetup.currentParticipants || meetup.current_participants) >= (meetup.maxParticipants || meetup.max_participants);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>모임을 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>모임을 불러올 수 없습니다.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshMeetups}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('MeetupList: 뒤로가기 버튼 클릭됨');
            try {
              // React Router의 navigate(-1) 시도
              window.history.go(-1);
              console.log('MeetupList: history.go(-1) 실행됨');
            } catch (error) {
              console.log('MeetupList: 뒤로가기 실패, 홈으로 이동:', error);
              navigation.navigate('Home');
            }
          }}
        >
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모든 모임</Text>
        <NotificationBell
          onPress={() => {
            console.log('🔔 알림 버튼 클릭됨');
          }}
          color={COLORS.text.primary}
          size={20}
        />
      </View>

      {/* 필터 버튼들 */}
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
            모집중 ({meetups.filter(m => m.status === '모집중').length})
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

      {/* 모임 리스트 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredMeetups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? '등록된 모임이 없습니다.' 
                : `${filter === 'recruiting' ? '모집중인' : '모집완료된'} 모임이 없습니다.`
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

      {/* 새 모임 만들기 버튼 */}
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
    borderRadius: 20,
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
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  meetupItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  foodImageContainer: {
    marginRight: 12,
  },
  foodImageSample: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  foodEmoji: {
    fontSize: 32,
  },
  meetupImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: 'cover',
  },
  meetupContent: {
    flex: 1,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  meetupDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 10,
    lineHeight: 20,
  },
  meetupTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.functional.success + '20',
    gap: 4,
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  ageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.text.secondary + '20',
    gap: 4,
  },
  ageTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  genderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main + '20',
    gap: 4,
  },
  genderTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  meetupDetails: {
    marginBottom: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  meetupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.neutral.grey100,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaTimeBlue: {
    fontSize: 13,
    color: '#4263EB',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
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

export default MeetupListScreen;