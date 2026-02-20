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
import { COLORS, SHADOWS, CARD_STYLE } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific navigation adapter
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  replace?: (screen: string, params?: any) => void;
}

interface UniversalJoinedMeetupsScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  onMeetupPress?: (meetup: JoinedMeetup) => void;
}

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

const UniversalJoinedMeetupsScreen: React.FC<UniversalJoinedMeetupsScreenProps> = ({
  navigation,
  user,
  onMeetupPress,
}) => {
  const [joinedMeetups, setJoinedMeetups] = useState<JoinedMeetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [error, setError] = useState<string | null>(null);

  // API base URL
  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Fetch joined meetups
  const fetchJoinedMeetups = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        throw new Error('로그인이 필요합니다');
      }

      const response = await fetch(`${getApiUrl()}/user/joined-meetups`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJoinedMeetups(data.meetups || data.data || []);
      } else {
        throw new Error(data.message || '참여한 약속을 불러오는데 실패했습니다');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '참여한 약속을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJoinedMeetups();
  }, [fetchJoinedMeetups]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchJoinedMeetups();
  };

  // Handle meetup press
  const handleMeetupPress = (meetup: JoinedMeetup) => {
    if (onMeetupPress) {
      onMeetupPress(meetup);
    } else {
      navigation.navigate('MeetupDetail', { meetupId: meetup.id });
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { text: '참여 확정', color: COLORS.functional.success };
      case 'pending':
        return { text: '대기 중', color: COLORS.functional.warning };
      case 'cancelled':
        return { text: '참여 취소', color: COLORS.functional.error };
      case 'completed':
        return { text: '완료', color: COLORS.text.secondary };
      default:
        return { text: status, color: COLORS.text.secondary };
    }
  };

  // Filter meetups based on tab
  const filteredMeetups = joinedMeetups.filter(meetup => {
    const now = new Date();
    const meetupDate = new Date(`${meetup.date}T${meetup.time}`);

    if (activeTab === 'upcoming') {
      return meetupDate >= now && meetup.meetup_status !== 'completed';
    } else {
      return meetupDate < now || meetup.meetup_status === 'completed';
    }
  });

  // Render tab buttons
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
        onPress={() => setActiveTab('upcoming')}
      >
        <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
          다가오는 약속
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
        onPress={() => setActiveTab('completed')}
      >
        <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
          지난 약속
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render meetup item
  const renderMeetupItem = (meetup: JoinedMeetup) => {
    const status = getStatusText(meetup.participation_status);

    return (
      <TouchableOpacity
        key={meetup.id}
        style={styles.meetupItem}
        onPress={() => handleMeetupPress(meetup)}
      >
        <View style={styles.meetupHeader}>
          <View style={styles.meetupMeta}>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
            <Text style={styles.joinedDate}>
              {new Date(meetup.joined_at).toLocaleDateString('ko-KR')} 참여
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={COLORS.text.tertiary} />
        </View>

        <Text style={styles.meetupTitle}>{meetup.title}</Text>
        <Text style={styles.meetupDate}>
          {new Date(`${meetup.date}T${meetup.time}`).toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <Text style={styles.meetupLocation}>{meetup.location}</Text>

        <View style={styles.meetupFooter}>
          <Text style={styles.hostName}>호스트: {meetup.host_name}</Text>
          <Text style={styles.participants}>
            {meetup.current_participants}/{meetup.max_participants}명
          </Text>
        </View>

        {activeTab === 'completed' && !meetup.has_reviewed && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => navigation.navigate('WriteReview', { meetupId: meetup.id })}
          >
            <Text style={styles.reviewButtonText}>후기 작성하기</Text>
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>내가 참여한 약속</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.centerContent, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
          <Text style={styles.loadingText}>참여한 약속을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>내가 참여한 약속</Text>
        <View style={styles.placeholder} />
      </View>

      {renderTabs()}

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
            <TouchableOpacity style={styles.retryButton} onPress={fetchJoinedMeetups}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : filteredMeetups.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-x" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? '다가오는 약속이 없습니다' : '지난 약속이 없습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'upcoming'
                ? '새로운 약속에 참여해보세요!'
                : '아직 참여 완료된 약속이 없습니다'
              }
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                style={styles.findMeetupButton}
                onPress={() => navigation.navigate('MeetupList')}
              >
                <Text style={styles.findMeetupButtonText}>약속 찾기</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.meetupsList}>
            {filteredMeetups.map(renderMeetupItem)}
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

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary.main,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.neutral.white,
  },

  // Content
  content: {
    flex: 1,
  },
  meetupsList: {
    padding: 16,
  },
  meetupItem: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  meetupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  meetupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral.white,
    letterSpacing: 0.2,
  },
  joinedDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  meetupDate: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  meetupLocation: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginBottom: 12,
  },
  meetupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  participants: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  reviewButton: {
    backgroundColor: COLORS.primary.accent,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
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

export default UniversalJoinedMeetupsScreen;
