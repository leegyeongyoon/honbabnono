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
import { COLORS, SHADOWS } from '../styles/colors';
import { useMeetups } from '../hooks/useMeetups';
import { formatKoreanDateTime } from '../utils/dateUtils';
import { Icon } from '../components/Icon';
import { FOOD_CATEGORIES } from '../constants/categories';

interface MeetupCardProps {
  meetup: any;
  onPress: () => void;
}

// 카테고리 관련 유틸 함수들
const getCategoryIcon = (categoryName: string) => {
  const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.icon : 'utensils';
};

const getCategoryColor = (categoryName: string) => {
  const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.color : COLORS.primary.main;
};

const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onPress }) => {
  return (
    <TouchableOpacity style={styles.meetupCard} onPress={onPress}>
      <View style={styles.meetupItem}>
        {/* 왼쪽 음식 이미지/이모지 */}
        <View style={styles.foodImageContainer}>
          {meetup.image ? (
            <img 
              src={meetup.image} 
              alt={meetup.title}
              style={styles.meetupImage}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <View style={[styles.foodImageSample, meetup.image ? { display: 'none' } : {}]}>
            <Icon 
              name={getCategoryIcon(meetup.category) as any} 
              size={32} 
              color={getCategoryColor(meetup.category)} 
            />
          </View>
        </View>

        {/* 오른쪽 콘텐츠 */}
        <View style={styles.meetupContent}>
          <Text style={styles.meetupTitle}>{meetup.title}</Text>
          <Text style={styles.meetupDescription}>{meetup.description || '맛있는 식사 함께 해요!'}</Text>
          
          {/* 카테고리 + 가격대 태그 */}
          <View style={styles.meetupTags}>
            <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(meetup.category) + '20' }]}>
              <Icon 
                name={getCategoryIcon(meetup.category) as any} 
                size={12} 
                color={getCategoryColor(meetup.category)} 
              />
              <Text style={[styles.categoryTagText, { color: getCategoryColor(meetup.category) }]}>
                {meetup.category}
              </Text>
            </View>
            {meetup.priceRange && (
              <View style={styles.priceTag}>
                <Icon name="utensils" size={12} color={COLORS.functional.success} />
                <Text style={styles.priceTagText}>{meetup.priceRange}</Text>
              </View>
            )}
          </View>

          {/* 시간 + 장소 정보 */}
          <View style={styles.meetupDetails}>
            <View style={styles.detailRow}>
              <Icon name="clock" size={14} color={COLORS.primary.main} />
              <Text style={styles.detailText}>
                {formatKoreanDateTime(meetup.date, meetup.time)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
              <Text style={styles.detailText} numberOfLines={1}>
                {meetup.address || meetup.location}
              </Text>
            </View>
          </View>

          {/* 참가자 정보 */}
          <View style={styles.meetupMeta}>
            <View style={styles.participantInfo}>
              <Icon name="users" size={12} color={COLORS.text.secondary} />
              <Text style={styles.metaText}>
                {meetup.currentParticipants || meetup.current_participants}/{meetup.maxParticipants || meetup.max_participants}명
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[
                styles.statusText,
                { color: meetup.status === '모집중' ? COLORS.functional.success : COLORS.text.secondary }
              ]}>
                {meetup.status || '모집중'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

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
        <View style={styles.headerRight} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerRight: {
    width: 40,
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