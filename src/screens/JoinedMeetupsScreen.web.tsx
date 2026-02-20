import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { NotificationBell } from '../components/NotificationBell';
import apiClient from '../services/apiClient';
import EmptyState from '../components/EmptyState';
import { MeetupCardSkeleton } from '../components/skeleton';

interface JoinedMeetup {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  max_participants: number;
  current_participants: number;
  image?: string;
  participation_status: string;
  joined_at: string;
  host_name: string;
  meetup_status: string;
  has_reviewed: boolean;
}

const JoinedMeetupsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [joinedMeetups, setJoinedMeetups] = useState<JoinedMeetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    const fetchJoinedMeetups = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/joined-meetups');
        setJoinedMeetups(response.data.meetups || []);
      } catch (error) {
        setJoinedMeetups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedMeetups();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case '참가승인': return '참여 완료';
      case '참가신청': return '신청 중';
      case '참가거절': return '신청 거절';
      case '참가취소': return '참여 취소';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '참가승인': return COLORS.secondary.main;
      case '참가신청': return COLORS.primary.main;
      case '참가거절': return COLORS.text.error;
      case '참가취소': return COLORS.text.secondary;
      default: return COLORS.text.secondary;
    }
  };

  const getMeetupStatusText = (status: string) => {
    switch (status) {
      case 'active': return '모집 중';
      case 'full': return '모집 완료';
      case 'closed': return '마감';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const isUpcoming = (meetupStatus: string, date: string) => {
    const meetupDate = new Date(date);
    const now = new Date();
    return meetupDate > now && meetupStatus !== 'completed';
  };

  const filteredMeetups = (joinedMeetups || []).filter(meetup => {
    if (activeTab === 'upcoming') {
      return isUpcoming(meetup.meetup_status, meetup.date);
    } else {
      return !isUpcoming(meetup.meetup_status, meetup.date) || meetup.meetup_status === 'completed';
    }
  });

  const handleReviewWrite = (meetupId: string) => {
    navigate(`/write-review/${meetupId}`);
  };

  const renderMeetupItem = (meetup: JoinedMeetup) => (
    <div
      key={meetup.id}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(17,17,17,0.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      style={{ cursor: 'pointer', transition: 'background-color 200ms ease' }}
    >
      <TouchableOpacity
        style={styles.meetupItem}
        onPress={() => navigate(`/meetup/${meetup.id}`)}
      >
        <View style={styles.profileImage}>
          <View style={styles.avatarCircle}>
            <Icon name="utensils" size={20} color={COLORS.primary.main} />
          </View>
        </View>

        <View style={styles.meetupInfo}>
          <Text style={styles.meetupTitle}>{meetup.title}</Text>
          <Text style={styles.meetupCategory}>{meetup.category}</Text>
          <View style={styles.meetupMeta}>
            <Text style={styles.metaText}>
              {meetup.location} • {new Date(meetup.date).toLocaleDateString()} •
              <Text style={[styles.statusText, { color: getStatusColor(meetup.participation_status) }]}>
                {' '}{getStatusText(meetup.participation_status)}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          {activeTab === 'completed' && !meetup.has_reviewed && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={(e) => {
                e.stopPropagation();
                handleReviewWrite(meetup.id);
              }}
            >
              <Icon name="edit" size={16} color={COLORS.primary.main} />
              <Text style={styles.reviewButtonText}>리뷰</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'completed' && meetup.has_reviewed && (
            <View style={styles.reviewedBadge}>
              <Icon name="check" size={16} color={COLORS.secondary.main} />
              <Text style={styles.reviewedText}>완료</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate('/mypage')}
          >
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>참여한 약속</Text>
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

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>참여한 약속</Text>
        <NotificationBell
          onPress={() => {
            navigate('/notifications');
          }}
          color={COLORS.text.primary}
          size={20}
        />
      </View>

      {/* 탭 선택 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            예정된 약속
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            완료된 약속
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {filteredMeetups.length === 0 ? (
          <EmptyState
            variant="no-data"
            icon="calendar"
            title={activeTab === 'upcoming' ? '예정된 약속이 없어요' : '완료된 약속이 없어요'}
            description="새로운 약속을 찾아 참여해보세요!"
            actionLabel="약속 찾아보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <View style={styles.meetupsList}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'upcoming' ? '예정된' : '완료된'} 약속 ({filteredMeetups.length}개)
            </Text>
            {filteredMeetups.map(renderMeetupItem)}
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
  skeletonWrap: {
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: COLORS.neutral.white,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  },
  activeTab: {
    borderBottomColor: COLORS.primary.main,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.primary.dark,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  meetupsList: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    padding: 20,
    paddingBottom: 0,
  },
  meetupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meetupInfo: {
    flex: 1,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  meetupCategory: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  meetupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    marginLeft: 12,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  reviewButtonText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewedText: {
    fontSize: 12,
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
});

export default JoinedMeetupsScreen;