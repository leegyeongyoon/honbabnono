import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { FadeIn } from '../components/animated';
import EmptyState from '../components/EmptyState';
import { ListItemSkeleton } from '../components/skeleton';
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

type TabKey = 'all' | 'approved' | 'pending' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'approved', label: '참여 완료' },
  { key: 'pending', label: '신청 중' },
  { key: 'cancelled', label: '취소/거절' },
];

const MyActivitiesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/activities');
        setActivities(response.data.activities || []);
      } catch (error) {
        // silently fail
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
      case '참가승인': return '#2E7D4F';
      case '참가신청': return '#C49A70';
      case '참가거절': return '#D32F2F';
      case '참가취소': return '#8B7E72';
      default: return '#5C4F42';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case '참가승인': return 'rgba(61, 122, 79, 0.08)';
      case '참가신청': return 'rgba(224,146,110,0.08)';
      case '참가거절': return 'rgba(196, 60, 60, 0.08)';
      case '참가취소': return 'rgba(139, 126, 114, 0.08)';
      default: return '#F7F5F3';
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'approved') return activity.participation_status === '참가승인';
    if (activeTab === 'pending') return activity.participation_status === '참가신청';
    if (activeTab === 'cancelled')
      return activity.participation_status === '참가거절' || activity.participation_status === '참가취소';
    return true;
  });

  const renderActivity = (activity: Activity, index: number) => (
    <div
      key={activity.id}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(17,17,17,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
      style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
    >
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => navigate(`/meetup/${activity.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardIconWrap}>
          <View style={styles.avatarCircle}>
            <Icon name="utensils" size={20} color="#C49A70" />
          </View>
        </View>

        <View style={styles.activityInfo}>
          <Text style={styles.activityTitle} numberOfLines={1}>{activity.title}</Text>
          <Text style={styles.activityCategory}>{activity.category}</Text>
          <View style={styles.activityMeta}>
            <View style={styles.metaItem}>
              <Icon name="map-pin" size={12} color="#8B7E72" />
              <Text style={styles.metaText}>{activity.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="users" size={12} color="#8B7E72" />
              <Text style={styles.metaText}>
                {activity.current_participants ?? 0}/{activity.max_participants ?? 4}명
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(activity.participation_status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(activity.participation_status) }]}>
            {getStatusText(activity.participation_status)}
          </Text>
        </View>
      </TouchableOpacity>
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate('/mypage')}>
            <Icon name="arrow-left" size={24} color="#1A1714" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 활동</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ListItemSkeleton key={i} size={50} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FadeIn style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color="#1A1714" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 활동</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 탭 내비게이션 */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'all'
            ? activities.length
            : activities.filter((a) => {
                if (tab.key === 'approved') return a.participation_status === '참가승인';
                if (tab.key === 'pending') return a.participation_status === '참가신청';
                return a.participation_status === '참가거절' || a.participation_status === '참가취소';
              }).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {filteredActivities.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="참여한 약속이 없습니다"
            description="새로운 약속을 찾아 참여해보세요!"
            actionLabel="약속 찾아보기"
            onAction={() => navigate('/home')}
          />
        ) : (
          <View style={styles.activitiesList}>
            {filteredActivities.map(renderActivity)}
          </View>
        )}
      </ScrollView>
    </FadeIn>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFECEA',
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
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#1A1714',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  tab: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  },
  tabActive: {
    borderBottomColor: '#9A7450',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B7E72',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#9A7450',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  skeletonWrap: {
    paddingTop: 8,
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIconWrap: {
    marginRight: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(224,146,110,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1714',
    marginBottom: 3,
  },
  activityCategory: {
    fontSize: 13,
    color: '#8B7E72',
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8B7E72',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MyActivitiesScreen;
