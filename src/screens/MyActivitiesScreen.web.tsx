import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface Activity {
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
}

const MyActivitiesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/activities');
        setActivities(response.data.activities);
      } catch (error) {
        console.error('내 활동 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
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

  const renderActivity = (activity: Activity) => (
    <TouchableOpacity
      key={activity.id}
      style={styles.activityItem}
      onPress={() => navigate(`/meetup/${activity.id}`)}
    >
      <View style={styles.profileImage}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>🍚</Text>
        </View>
      </View>

      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityCategory}>{activity.category}</Text>
        <View style={styles.activityMeta}>
          <Text style={styles.metaText}>
            {activity.location} • {activity.current_participants}/{activity.max_participants}명 • 
            <Text style={[styles.statusText, { color: getStatusColor(activity.participation_status) }]}>
              {' '}{getStatusText(activity.participation_status)}
            </Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>내 활동을 불러오는 중...</Text>
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
        <Text style={styles.headerTitle}>내 활동</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>참여한 모임이 없습니다</Text>
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
          <View style={styles.activitiesList}>
            <Text style={styles.sectionTitle}>참여한 모임 ({activities.length}개)</Text>
            {activities.map(renderActivity)}
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
  activitiesList: {
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
  activityItem: {
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
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  activityCategory: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  activityMeta: {
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
});

export default MyActivitiesScreen;