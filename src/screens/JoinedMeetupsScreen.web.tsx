import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

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
        console.error('참여한 모임 조회 실패:', error);
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
    <TouchableOpacity
      key={meetup.id}
      style={styles.meetupItem}
      onPress={() => navigate(`/meetup/${meetup.id}`)}
    >
      <View style={styles.profileImage}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>🍚</Text>
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
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>참여한 모임을 불러오는 중...</Text>
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
        <Text style={styles.headerTitle}>참여한 모임</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 탭 선택 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            예정된 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            완료된 모임
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {filteredMeetups.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? '예정된 모임이 없습니다' : '완료된 모임이 없습니다'}
            </Text>
            <Text style={styles.emptyDescription}>
              새로운 모임을 찾아 참여해보세요!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/home')}
            >
              <Text style={styles.exploreButtonText}>모임 찾아보기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.meetupsList}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'upcoming' ? '예정된' : '완료된'} 모임 ({filteredMeetups.length}개)
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
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
    fontWeight: '600',
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
    backgroundColor: COLORS.primary.main,
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
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
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