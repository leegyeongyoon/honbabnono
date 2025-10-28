import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';
import userApiService, { ActivityStats, HostedMeetup, JoinedMeetup } from '../services/userApiService';
import reviewApiService, { UserReview } from '../services/reviewApiService';
import apiClient from '../services/apiClient';
import { formatKoreanDateTime } from '../utils/dateUtils';

interface MyPageScreenProps {
  navigation?: any;
  user?: any;
  onLogout?: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ navigation, user, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [hostedMeetups, setHostedMeetups] = useState<HostedMeetup[]>([]);
  const [joinedMeetups, setJoinedMeetups] = useState<JoinedMeetup[]>([]);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [riceIndex, setRiceIndex] = useState<number>(0);
  const [riceLevel, setRiceLevel] = useState<any>(null);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadUserData();
  }, []);

  // 사용자 데이터 로드
  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActivityStats(),
        loadHostedMeetups(),
        loadJoinedMeetups(),
        loadUserReviews(),
        loadRiceIndex()
      ]);
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      Alert.alert('오류', '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 활동 통계 로드
  const loadActivityStats = async () => {
    try {
      const stats = await userApiService.getActivityStats();
      setActivityStats(stats);
    } catch (error) {
      console.error('활동 통계 로드 실패:', error);
    }
  };

  // 호스팅한 모임 로드
  const loadHostedMeetups = async () => {
    try {
      const { data } = await userApiService.getHostedMeetups(1, 5); // 최근 5개만
      setHostedMeetups(data);
    } catch (error) {
      console.error('호스팅 모임 로드 실패:', error);
    }
  };

  // 참가한 모임 로드
  const loadJoinedMeetups = async () => {
    try {
      const { data } = await userApiService.getJoinedMeetups(1, 5); // 최근 5개만
      setJoinedMeetups(data);
    } catch (error) {
      console.error('참가 모임 로드 실패:', error);
    }
  };

  // 사용자 리뷰 로드
  const loadUserReviews = async () => {
    try {
      const { data } = await reviewApiService.getUserReviews(1, 5); // 최근 5개
      setUserReviews(data);
    } catch (error) {
      console.error('사용자 리뷰 로드 실패:', error);
    }
  };

  // 밥알지수 로드
  const loadRiceIndex = async () => {
    try {
      const response = await apiClient.get('/user/rice-index');
      if (response.data) {
        setRiceIndex(response.data.riceIndex);
        setRiceLevel(response.data.level);
      }
    } catch (error) {
      console.error('밥알지수 로드 실패:', error);
    }
  };

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  // 프로필 수정 모달 관련 state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // 프로필 수정 핸들러
  const handleProfileEdit = () => {
    setShowProfileModal(true);
  };

  // 알림 설정 핸들러
  const handleNotificationSettings = () => {
    setShowNotificationModal(true);
  };

  // 개인정보 관리 핸들러
  const handlePrivacyManagement = () => {
    setShowPrivacyModal(true);
  };

  // 도움말 핸들러
  const handleHelp = () => {
    setShowHelpModal(true);
  };

  // 이용약관 핸들러
  const handleTerms = () => {
    setShowTermsModal(true);
  };

  // 설정 메뉴
  const settingsMenu = [
    { id: 'profile', title: '프로필 관리', icon: 'user', action: handleProfileEdit },
    { id: 'notification', title: '알림 설정', icon: 'bell', action: handleNotificationSettings },
    { id: 'privacy', title: '개인정보 관리', icon: 'shield', action: handlePrivacyManagement },
    { id: 'help', title: '도움말', icon: 'help-circle', action: handleHelp },
    { id: 'terms', title: '이용약관', icon: 'file-text', action: handleTerms },
    { id: 'logout', title: '로그아웃', icon: 'log-out', action: () => handleLogout() },
  ];

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            
            // 로그아웃 API 호출
            await apiClient.post('/auth/logout');
            
            // 로그아웃 콜백 실행
            onLogout?.();
            
            Alert.alert('알림', '로그아웃되었습니다.');
          } catch (error) {
            console.error('로그아웃 실패:', error);
            // 에러가 발생해도 로그아웃 처리
            onLogout?.();
            Alert.alert('알림', '로그아웃되었습니다.');
          } finally {
            setLoading(false);
          }
        } },
      ]
    );
  };

  const renderMeetupList = (title: string, meetups: (HostedMeetup | JoinedMeetup)[], showViewAll: boolean = false) => (
    <View style={styles.activitySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {showViewAll && meetups.length > 0 && (
          <TouchableOpacity>
            <Text style={styles.viewAllText}>전체보기</Text>
          </TouchableOpacity>
        )}
      </View>
      {meetups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>활동 내역이 없습니다</Text>
        </View>
      ) : (
        meetups.map((meetup) => (
          <TouchableOpacity key={meetup.id} style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{meetup.title}</Text>
              <Text style={styles.activityLocation}>{meetup.location}</Text>
              <Text style={styles.activityDate}>{formatKoreanDateTime(meetup.date, 'datetime')}</Text>
              {'hostName' in meetup && (
                <Text style={styles.hostName}>호스트: {meetup.hostName}</Text>
              )}
            </View>
            <View style={styles.activityRight}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(meetup.status) }]}>
                <Text style={styles.statusText}>{meetup.status}</Text>
              </View>
              <Text style={styles.participantInfo}>
                {meetup.currentParticipants}/{meetup.maxParticipants}명
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case '완료': return COLORS.neutral.grey400;
      case '예정': return COLORS.functional.warning;
      case '모집중': return COLORS.functional.success;
      default: return COLORS.neutral.grey400;
    }
  };


  const renderMyReviews = () => (
    <View style={styles.reviewsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>내가 작성한 리뷰</Text>
        <Text style={styles.reviewCount}>{userReviews.length}개</Text>
      </View>
      {userReviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>작성한 리뷰가 없습니다</Text>
          <Text style={styles.emptySubtext}>모임 참여 후 리뷰를 작성해보세요!</Text>
        </View>
      ) : (
        userReviews.map((review) => (
          <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Text style={styles.meetupTitle}>{review.meetup_title}</Text>
              <View style={styles.ratingContainer}>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="star"
                      size={14}
                      color={star <= review.rating ? COLORS.functional.warning : COLORS.neutral.grey300}
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>{review.rating}.0</Text>
              </View>
            </View>
            <Text style={styles.meetupInfo}>
              {review.meetup_location} • {review.meetup_date} • {review.meetup_category}
            </Text>
            {review.comment && (
              <Text style={styles.reviewComment}>{review.comment}</Text>
            )}
            {review.tags && review.tags.length > 0 && (
              <View style={styles.reviewTags}>
                {review.tags.map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>설정</Text>
      </View>
      {settingsMenu.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.settingsItem, item.id === 'logout' && styles.logoutItem]}
          onPress={item.action}
        >
          <View style={styles.settingsLeft}>
            <Icon name={item.icon as any} size={20} color={item.id === 'logout' ? COLORS.functional.error : COLORS.text.secondary} />
            <Text style={[styles.settingsTitle, item.id === 'logout' && styles.logoutText]}>
              {item.title}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 당근마켓 스타일 프로필 헤더 */}
      <View style={styles.profileHeader}>
        <View style={styles.profileTopRow}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name?.charAt(0) || '혼'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || '혼밥러'}</Text>
            <Text style={styles.profileId}>#{user?.id ? String(user.id).slice(0, 8) : '1181301'}</Text>
          </View>
          <TouchableOpacity style={styles.profileEditButton} onPress={handleProfileEdit}>
            <Text style={styles.profileEditText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 밥알지수 섹션 (당근마켓 매너온도 스타일) */}
        <View style={styles.riceIndexSection}>
          <View style={styles.riceIndexHeader}>
            <Text style={styles.riceIndexLabel}>밥알지수</Text>
            <TouchableOpacity>
              <Text style={styles.infoIcon}>ⓘ</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.temperatureContainer}>
            <Text style={styles.firstTemperature}>첫 온도 36.5°C</Text>
            <View style={styles.currentTemperatureContainer}>
              <Text style={styles.currentTemperature}>{riceIndex}밥알</Text>
              <Text style={styles.temperatureEmoji}>
                {riceLevel?.emoji || '🍚'}
              </Text>
            </View>
          </View>

          {/* 온도 바 */}
          <View style={styles.temperatureBar}>
            <View style={[styles.temperatureProgress, { 
              width: `${Math.min((riceIndex / 100) * 100, 100)}%`,
              backgroundColor: riceLevel?.color || COLORS.neutral.grey400
            }]} />
          </View>

          {/* 온도 설명 */}
          <View style={styles.temperatureDescription}>
            <View style={styles.temperatureStats}>
              <View style={styles.tempStat}>
                <Text style={styles.tempStatIcon}>👤</Text>
                <Text style={styles.tempStatText}>재거래희망률 100%</Text>
              </View>
              <View style={styles.tempStat}>
                <Text style={styles.tempStatIcon}>💬</Text>
                <Text style={styles.tempStatText}>응답률 100%</Text>
              </View>
            </View>
            <Text style={styles.tempStatDetail}>13일 후 3번째 거래</Text>
            <Text style={styles.tempStatDetail}>최근 3일 이내 활동 (20204년 6월 가입)</Text>
          </View>

          {/* 레벨 정보 */}
          {riceLevel && (
            <View style={styles.levelContainer}>
              <Text style={[styles.levelName, { color: riceLevel.color }]}>
                {riceLevel.level}
              </Text>
              <Text style={styles.levelDescription}>
                {riceLevel.description}
              </Text>
            </View>
          )}
        </View>

        {/* 활동 통계 */}
        <View style={styles.statsSection}>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statNumber}>{activityStats?.joinedMeetups || 0}</Text>
            <Text style={styles.statLabel}>참여</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statNumber}>{activityStats?.hostedMeetups || 0}</Text>
            <Text style={styles.statLabel}>호스팅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard}>
            <Text style={styles.statNumber}>{activityStats?.completedMeetups || 0}</Text>
            <Text style={styles.statLabel}>완료</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메인 콘텐츠 */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        ) : (
          <>
            {/* 내 활동 */}
            {renderMeetupList('참여한 모임', joinedMeetups, true)}
            {renderMeetupList('만든 모임', hostedMeetups, true)}
            
            {/* 내 리뷰 */}
            {renderMyReviews()}
            
            {/* 설정 */}
            {renderSettings()}
          </>
        )}
      </ScrollView>

      {/* 프로필 수정 모달 */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalCloseText}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>프로필 수정</Text>
            <TouchableOpacity>
              <Text style={styles.modalSaveText}>저장</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>기본 정보</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.input}
                value={user?.name || ''}
                placeholder="이름을 입력하세요"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                value={user?.email || ''}
                placeholder="이메일을 입력하세요"
                keyboardType="email-address"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 알림 설정 모달 */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>알림 설정</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>알림 종류</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>푸시 알림</Text>
              <Text style={styles.settingDescription}>새로운 모임, 메시지 등</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>이메일 알림</Text>
              <Text style={styles.settingDescription}>중요한 업데이트</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>모임 리마인더</Text>
              <Text style={styles.settingDescription}>모임 시간 알림</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 개인정보 관리 모달 */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>개인정보 관리</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView style={styles.modalContent}>
            <TouchableOpacity style={styles.privacyMenuItem}>
              <Text style={styles.privacyMenuText}>개인정보 내보내기</Text>
              <Icon name="download" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.privacyMenuItem}>
              <Text style={styles.privacyMenuText}>비밀번호 변경</Text>
              <Icon name="lock" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.privacyMenuItem, styles.dangerMenuItem]}>
              <Text style={[styles.privacyMenuText, styles.dangerText]}>계정 탈퇴</Text>
              <Icon name="trash" size={20} color={COLORS.functional.error} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* 도움말 모달 */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>도움말</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>자주 묻는 질문</Text>
            <TouchableOpacity style={styles.helpMenuItem}>
              <Text style={styles.helpQuestion}>혼밥노노 앱은 어떻게 사용하나요?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpMenuItem}>
              <Text style={styles.helpQuestion}>모임에 참여하려면 어떻게 해야 하나요?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpMenuItem}>
              <Text style={styles.helpQuestion}>밥알지수는 무엇인가요?</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalSectionTitle}>문의하기</Text>
            <TouchableOpacity style={styles.contactButton}>
              <Icon name="mail" size={20} color={COLORS.primary.main} />
              <Text style={styles.contactButtonText}>이메일로 문의하기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* 이용약관 모달 */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTermsModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>이용약관</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.termsText}>
              제1조 (목적){'\n'}
              이 약관은 혼밥노노가 제공하는 모바일 애플리케이션 서비스의 이용조건 및 절차를 규정함을 목적으로 합니다.{'\n\n'}
              
              제2조 (용어의 정의){'\n'}
              1. "서비스"라 함은 회사가 제공하는 혼밥노노 모바일 애플리케이션을 통한 모든 서비스를 의미합니다.{'\n'}
              2. "이용자"라 함은 회사의 서비스를 받는 회원 및 비회원을 말합니다.{'\n\n'}
              
              제3조 (서비스의 제공){'\n'}
              회사는 식사 모임 생성 및 참여 서비스, 회원 간 커뮤니케이션 서비스 등을 제공합니다.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  profileHeader: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.neutral.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  profileId: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  profileEditButton: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  profileEditText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  riceIndexSection: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  riceIndexHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  riceIndexLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  infoIcon: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  firstTemperature: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  currentTemperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTemperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary.main,
    marginRight: 8,
  },
  temperatureEmoji: {
    fontSize: 20,
  },
  temperatureBar: {
    height: 8,
    backgroundColor: COLORS.neutral.grey300,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  temperatureProgress: {
    height: '100%',
    borderRadius: 4,
  },
  temperatureDescription: {
    marginBottom: 12,
  },
  temperatureStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tempStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  tempStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  tempStatText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  tempStatDetail: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  levelContainer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey300,
  },
  levelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 8,
    minWidth: 60,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
  },
  activitySection: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.white,
  },
  settingsSection: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsTitle: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  logoutText: {
    color: COLORS.functional.error,
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
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  activityLocation: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  participantInfo: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  reviewsSection: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 1,
    padding: 16,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  meetupInfo: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    textAlign: 'right',
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalSaveText: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  settingItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  privacyMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  privacyMenuText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  dangerMenuItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: COLORS.functional.error,
  },
  helpMenuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  helpQuestion: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  contactButtonText: {
    fontSize: 16,
    color: COLORS.primary.main,
    marginLeft: 8,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
});

export default MyPageScreen;