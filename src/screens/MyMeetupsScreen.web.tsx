import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import userApiService, { JoinedMeetup, HostedMeetup } from '../services/userApiService';
import { formatKoreanDateTime } from '../utils/dateUtils';

interface User {
  id: string;
  name: string;
  email: string;
}

interface MyMeetupsScreenProps {
  user?: User | null;
}

const MyMeetupsScreen: React.FC<MyMeetupsScreenProps> = ({ user: propsUser }) => {
  const navigate = useNavigate();
  const { user: storeUser } = useUserStore();
  const [activeTab, setActiveTab] = useState<'applied' | 'created' | 'past'>('applied');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appliedMeetups, setAppliedMeetups] = useState<JoinedMeetup[]>([]);
  const [createdMeetups, setCreatedMeetups] = useState<HostedMeetup[]>([]);
  const [pastMeetups, setPastMeetups] = useState<(JoinedMeetup | HostedMeetup)[]>([]);

  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  useEffect(() => {
    loadMeetupData();
  }, []);

  const loadMeetupData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await Promise.all([
        loadAppliedMeetups(),
        loadCreatedMeetups(),
        loadPastMeetups()
      ]);
    } catch (error) {
      console.error('모임 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppliedMeetups = async () => {
    try {
      console.log('🔍 [MyMeetups] 신청한 모임 로드 시작...');
      const response = await userApiService.getJoinedMeetups(1, 50);
      console.log('🔍 [MyMeetups] API 전체 응답:', response);
      const { data } = response;
      console.log('🔍 [MyMeetups] 응답 데이터:', data, '타입:', typeof data, '배열여부:', Array.isArray(data));
      
      if (!Array.isArray(data)) {
        console.error('❌ [MyMeetups] 데이터가 배열이 아님:', data);
        setAppliedMeetups([]);
        return;
      }
      
      console.log('🔍 [MyMeetups] 각 모임 데이터 확인:');
      data.forEach((meetup, index) => {
        console.log(`  ${index + 1}. ${meetup.title} - 상태: "${meetup.status}"`);
      });
      
      // 현재 진행중인 모임만 필터링
      const activeMeetups = data.filter(meetup => {
        const isActive = meetup.status === '모집중' || meetup.status === '예정';
        console.log(`🔍 [MyMeetups] "${meetup.title}" 필터링: ${meetup.status} -> ${isActive}`);
        return isActive;
      });
      
      console.log('🔍 [MyMeetups] 필터링된 결과:', activeMeetups.length, '개');
      setAppliedMeetups(activeMeetups);
    } catch (error) {
      console.error('❌ 신청한 모임 로드 실패:', error);
    }
  };

  const loadCreatedMeetups = async () => {
    try {
      const { data } = await userApiService.getHostedMeetups(1, 50);
      // 현재 진행중인 모임만 필터링
      const activeMeetups = data.filter(meetup => 
        meetup.status === '모집중' || meetup.status === '예정'
      );
      setCreatedMeetups(activeMeetups);
    } catch (error) {
      console.error('만든 모임 로드 실패:', error);
    }
  };

  const loadPastMeetups = async () => {
    try {
      const [joinedResponse, hostedResponse] = await Promise.all([
        userApiService.getJoinedMeetups(1, 50),
        userApiService.getHostedMeetups(1, 50)
      ]);
      
      // 완료된 모임만 필터링
      const pastJoined = joinedResponse.data.filter(meetup => meetup.status === '완료');
      const pastHosted = hostedResponse.data.filter(meetup => meetup.status === '완료');
      
      // 두 배열을 합치고 날짜순으로 정렬
      const allPast = [...pastJoined, ...pastHosted].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setPastMeetups(allPast);
    } catch (error) {
      console.error('지난 모임 로드 실패:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetupData();
    setRefreshing(false);
  };

  const handleMeetupPress = (meetupId: string) => {
    navigate(`/meetup/${meetupId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return COLORS.neutral.grey400;
      case '예정': return COLORS.functional.warning;
      case '모집중': return COLORS.functional.success;
      default: return COLORS.neutral.grey400;
    }
  };

  const renderMeetupItem = (meetup: JoinedMeetup | HostedMeetup, showHostInfo: boolean = false) => (
    <TouchableOpacity
      key={meetup.id}
      style={styles.meetupItem}
      onPress={() => handleMeetupPress(meetup.id)}
    >
      <View style={styles.meetupInfo}>
        <Text style={styles.meetupTitle}>{meetup.title}</Text>
        <Text style={styles.meetupLocation}>{meetup.location}</Text>
        <Text style={styles.meetupDate}>{formatKoreanDateTime(meetup.date, 'datetime')}</Text>
        {showHostInfo && 'hostName' in meetup && (
          <Text style={styles.hostName}>호스트: {meetup.hostName}</Text>
        )}
      </View>
      <View style={styles.meetupRight}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(meetup.status) }]}>
          <Text style={styles.statusText}>{meetup.status}</Text>
        </View>
        <Text style={styles.participantInfo}>
          {meetup.currentParticipants}/{meetup.maxParticipants}명
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'applied':
        return (
          <View style={styles.tabContent}>
            {appliedMeetups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>신청한 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>홈에서 모임을 찾아보세요!</Text>
              </View>
            ) : (
              appliedMeetups.map(meetup => renderMeetupItem(meetup, true))
            )}
          </View>
        );
      
      case 'created':
        return (
          <View style={styles.tabContent}>
            {createdMeetups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>만든 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>새로운 모임을 만들어보세요!</Text>
              </View>
            ) : (
              createdMeetups.map(meetup => renderMeetupItem(meetup, false))
            )}
          </View>
        );
      
      case 'past':
        return (
          <View style={styles.tabContent}>
            {pastMeetups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>지난 모임이 없습니다</Text>
                <Text style={styles.emptySubtext}>모임에 참여해보세요!</Text>
              </View>
            ) : (
              pastMeetups.map(meetup => renderMeetupItem(meetup, !('hostName' in meetup)))
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 모임</Text>
      </View>

      {/* 탭 버튼 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'applied' && styles.activeTabButton]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'applied' && styles.activeTabButtonText]}>
            신청한 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'created' && styles.activeTabButton]}
          onPress={() => setActiveTab('created')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'created' && styles.activeTabButtonText]}>
            내가 만든 모임
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'past' && styles.activeTabButton]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'past' && styles.activeTabButtonText]}>
            지난 모임
          </Text>
        </TouchableOpacity>
      </View>

      {/* 컨텐츠 */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  meetupItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  meetupInfo: {
    flex: 1,
    marginRight: 12,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  meetupLocation: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  meetupDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  meetupRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'white',
  },
  participantInfo: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});

export default MyMeetupsScreen;