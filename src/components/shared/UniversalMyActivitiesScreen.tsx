import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

// Platform-specific navigation adapter
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface UniversalMyActivitiesScreenProps {
  navigation: NavigationAdapter;
  user?: any;
}

interface Activity {
  id: string;
  type: 'meetup_joined' | 'meetup_created' | 'review_posted' | 'chat_message';
  title: string;
  description: string;
  date: string;
  meetup_id?: string;
  points_earned?: number;
}

const UniversalMyActivitiesScreen: React.FC<UniversalMyActivitiesScreenProps> = ({
  navigation,
  user,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user activities
  const fetchActivities = useCallback(async () => {
    try {
      setError(null);
      const response = await userApiService.getActivities();
      setActivities(response.data || response.activities || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : '활동 내역을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  // Get activity icon and color
  const getActivityStyle = (type: Activity['type']) => {
    switch (type) {
      case 'meetup_joined':
        return { icon: 'user-plus', color: COLORS.functional.success, bgColor: COLORS.functional.success + '12' };
      case 'meetup_created':
        return { icon: 'plus-circle', color: COLORS.primary.accent, bgColor: COLORS.primary.accent + '12' };
      case 'review_posted':
        return { icon: 'star', color: COLORS.functional.warning, bgColor: COLORS.functional.warning + '12' };
      case 'chat_message':
        return { icon: 'message-circle', color: COLORS.text.tertiary, bgColor: COLORS.neutral.grey100 };
      default:
        return { icon: 'activity', color: COLORS.text.secondary, bgColor: COLORS.text.secondary + '12' };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '오늘';
    } else if (diffDays === 2) {
      return '어제';
    } else if (diffDays <= 7) {
      return `${diffDays - 1}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  // Render activity item
  const renderActivityItem = (activity: Activity) => {
    const style = getActivityStyle(activity.type);

    return (
      <TouchableOpacity
        key={activity.id}
        style={styles.activityItem}
        onPress={() => {
          if (activity.meetup_id) {
            navigation.navigate('MeetupDetail', { meetupId: activity.meetup_id });
          }
        }}
        disabled={!activity.meetup_id}
      >
        <View style={[styles.activityIcon, { backgroundColor: style.bgColor }]}>
          <Icon name={style.icon} size={18} color={style.color} />
        </View>

        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
          </View>

          <Text style={styles.activityDescription} numberOfLines={2}>
            {activity.description}
          </Text>

          {activity.points_earned && (
            <View style={styles.pointsBadge}>
              <Icon name="coins" size={12} color={COLORS.functional.success} />
              <Text style={styles.pointsText}>+{activity.points_earned}P</Text>
            </View>
          )}
        </View>

        {activity.meetup_id && (
          <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
        )}
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>내 활동</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.centerContent, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
          <Text style={styles.loadingText}>활동 내역을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>내 활동</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary.accent]}
            tintColor={COLORS.primary.accent}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.errorTitle}>오류가 발생했습니다</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="activity" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>아직 활동 내역이 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              약속에 참여하거나 새로운 활동을 시작해보세요!
            </Text>
            <TouchableOpacity
              style={styles.findMeetupButton}
              onPress={() => navigation.navigate('MeetupList')}
            >
              <Text style={styles.findMeetupButtonText}>약속 찾기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {activities.map(renderActivityItem)}
            <View style={styles.bottomSpacer} />
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
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

  // Loading state
  loadingContainer: {
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 12,
  },

  // Content
  content: {
    flex: 1,
  },
  activitiesList: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.1,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  activityDescription: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    lineHeight: 18,
    marginBottom: 6,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.functional.success,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  findMeetupButton: {
    backgroundColor: COLORS.primary.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    ...SHADOWS.cta,
  },
  findMeetupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  bottomSpacer: {
    height: 20,
  },
});

export default UniversalMyActivitiesScreen;
