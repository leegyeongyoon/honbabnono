import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouterNavigation } from '../components/RouterNavigation';
import MeetupCard from '../components/MeetupCard';
import { COLORS, SHADOWS } from '../styles/colors';
import { useMeetups } from '../hooks/useMeetups';
import { formatKoreanDateTime } from '../utils/dateUtils';
import { Icon } from '../components/Icon';
import { FOOD_CATEGORIES } from '../constants/categories';
import { NotificationBell } from '../components/NotificationBell';
import ErrorState from '../components/ErrorState';
import { MeetupCardSkeleton } from '../components/skeleton';


const MeetupListScreen = () => {
  const navigation = useRouterNavigation();
  const { meetups, loading, error, refreshMeetups } = useMeetups();
  const [filter, setFilter] = useState<'all' | 'recruiting' | 'full'>('all');

  useEffect(() => {
    refreshMeetups();
  }, []);

  const filteredMeetups = meetups.filter(meetup => {
    const currentP = meetup.currentParticipants ?? 0;
    const maxP = meetup.maxParticipants ?? 4;
    switch (filter) {
      case 'recruiting':
        return meetup.status === '모집중';
      case 'full':
        return currentP >= maxP;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              try {
                window.history.go(-1);
              } catch (e) {
                navigation.navigate('Home');
              }
            }}
          >
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>모든 모임</Text>
          <View style={{ width: 20 }} />
        </View>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3, 4].map((i) => (
            <MeetupCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              try {
                window.history.go(-1);
              } catch (e) {
                navigation.navigate('Home');
              }
            }}
          >
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>모든 모임</Text>
          <View style={{ width: 20 }} />
        </View>
        <ErrorState
          title="모임을 불러올 수 없습니다"
          description="네트워크 상태를 확인하고 다시 시도해주세요"
          onRetry={refreshMeetups}
        />
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
            try {
              // React Router의 navigate(-1) 시도
              window.history.go(-1);
            } catch (error) {
              // silently handle error
              navigation.navigate('Home');
            }
          }}
        >
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모든 모임</Text>
        <NotificationBell
          onPress={() => {}}
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
            모집완료 ({meetups.filter(m => (m.currentParticipants ?? 0) >= (m.maxParticipants ?? 4)).length})
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
              variant="compact"
            />
          ))
        )}
      </ScrollView>

      {/* 새 모임 만들기 버튼 */}
      <div
        onClick={() => navigation.navigate('CreateMeetup')}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(196,154,112,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(196,154,112,0.25)';
        }}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #C49A70 0%, #E4C8A4 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 200ms ease',
          boxShadow: '0 4px 12px rgba(196,154,112,0.25)',
          zIndex: 10,
        }}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  skeletonWrap: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
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
    cursor: 'pointer',
  },
  activeFilter: {
    backgroundColor: COLORS.primary.dark,
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
    paddingTop: 0,
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.background,
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
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
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
    color: COLORS.text.primary,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  meetupDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
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
    color: COLORS.functional.info,
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
});

export default MeetupListScreen;