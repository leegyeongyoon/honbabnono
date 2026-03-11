import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal as RNModal, Platform, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../styles';
import { useUserStore } from '../../store/userStore';
import { useMeetupStore } from '../../store/meetupStore';
import apiClient from '../../services/apiClient';
import { getChatTimeDifference } from '../../utils/timeUtils';
import { formatMeetupDateTime } from '../../utils/dateUtils';
import { processImageUrl } from '../../utils/imageUtils';
import { Icon } from '../Icon';
import { ProfileImage } from '../ProfileImage';
import { FOOD_CATEGORIES } from '../../constants/categories';
import { Heart } from 'lucide-react';
import CheckInButton from '../CheckInButton';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface UniversalMeetupDetailScreenProps {
  navigation: NavigationAdapter;
  meetupId: string;
  ModalComponent?: React.ComponentType<any>;
  DepositSelectorComponent?: React.ComponentType<any>;
  KakaoMapComponent?: React.ComponentType<any>;
}

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  '한식': '🍚', '중식': '🥢', '일식': '🍣', '양식': '🍕',
  '고기/구이': '🥩', '해산물': '🦐', '찌개/전골': '🍲',
  '카페': '☕', '술집': '🍺', '기타': '🍴',
};
const getCategoryEmoji = (categoryName: string) => {
  return CATEGORY_EMOJI_MAP[categoryName] || '🍴';
};

const getCategoryColor = (categoryName: string) => {
  const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.color : COLORS.primary.main;
};

const FilterAccordion: React.FC<{
  diningPreferences?: any;
  promiseDepositRequired?: boolean;
  promiseDepositAmount?: number;
}> = ({ diningPreferences, promiseDepositRequired, promiseDepositAmount }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFilterInfo = diningPreferences && (
    diningPreferences.eatingSpeed ||
    diningPreferences.conversationDuringMeal ||
    diningPreferences.talkativeness ||
    diningPreferences.mealPurpose ||
    diningPreferences.specificRestaurant ||
    (diningPreferences.interests && diningPreferences.interests.length > 0)
  );

  const hasDepositInfo = promiseDepositRequired && promiseDepositAmount;

  if (!hasFilterInfo && !hasDepositInfo) {
    return null;
  }

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.accordionTitle}>선택 성향 필터</Text>
        <Icon
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.text.tertiary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.accordionContent}>
          {hasDepositInfo && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>💰 약속금</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>
                  {promiseDepositAmount?.toLocaleString()}원
                </Text>
                <Text style={styles.filterDescription}>노쇼 방지를 위한 약속금입니다</Text>
              </View>
            </View>
          )}

          {diningPreferences?.eatingSpeed && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>🍽️ 식사 속도</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.eatingSpeed}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.conversationDuringMeal && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>💬 식사 중 대화</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.conversationDuringMeal}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.talkativeness && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>🗣️ 수다 정도</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.talkativeness}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.mealPurpose && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>🎯 식사 목적</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.mealPurpose}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.specificRestaurant && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>🏪 선호 음식점</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.specificRestaurant}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.interests && diningPreferences.interests.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>🎨 관심사</Text>
              <View style={styles.filterItem}>
                <View style={styles.interestTags}>
                  {diningPreferences.interests.map((interest: string, index: number) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestTagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const UniversalMeetupDetailScreen: React.FC<UniversalMeetupDetailScreenProps> = ({
  navigation,
  meetupId,
  ModalComponent = RNModal,
  DepositSelectorComponent,
  KakaoMapComponent
}) => {
  const { user } = useUserStore();
  const currentMeetup = useMeetupStore(state => state.currentMeetup);
  const loading = useMeetupStore(state => state.loading);
  const joinMeetup = useMeetupStore(state => state.joinMeetup);
  const leaveMeetup = useMeetupStore(state => state.leaveMeetup);
  const fetchMeetupById = useMeetupStore(state => state.fetchMeetupById);
  const setCurrentMeetup = useMeetupStore(state => state.setCurrentMeetup);

  const [showPromiseModal, setShowPromiseModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDepositSelector, setShowDepositSelector] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [userRiceIndex, setUserRiceIndex] = useState<number>(0);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [wishlistLoading, setWishlistLoading] = useState<boolean>(false);

  useEffect(() => {
    if (meetupId) {
      setCurrentMeetup(null);
      fetchMeetupById(meetupId);

      const recordRecentView = async () => {
        try {
          await apiClient.post('/meetups/' + meetupId + '/view');
        } catch (_error) {
          // silent: non-critical view tracking
        }
      };

      if (user) {
        recordRecentView();
      }
    }
  }, [meetupId, fetchMeetupById, setCurrentMeetup, user]);

  useEffect(() => {
    const loadUserRiceIndex = async () => {
      try {
        const response = await apiClient.get('/user/rice-index');
        if (response.data && response.data.success) {
          setUserRiceIndex(response.data.riceIndex);
        }
      } catch (_error) {
        // silent: non-critical rice index
      }
    };

    if (user) {
      loadUserRiceIndex();
    }
  }, [user]);

  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (currentMeetup && user) {
        try {
          const response = await apiClient.get('/meetups/' + currentMeetup.id + '/wishlist');
          if (response.data && response.data.success) {
            setIsWishlisted(response.data.data.isWishlisted);
          }
        } catch (_error) {
          // silent: non-critical wishlist check
        }
      }
    };

    checkWishlistStatus();
  }, [currentMeetup, user]);

  const toggleWishlist = async () => {
    if (!currentMeetup || !user || wishlistLoading) {return;}

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        const response = await apiClient.delete('/meetups/' + currentMeetup.id + '/wishlist');
        if (response.data && response.data.success) {
          setIsWishlisted(false);
        }
      } else {
        const response = await apiClient.post('/meetups/' + currentMeetup.id + '/wishlist');
        if (response.data && response.data.success) {
          setIsWishlisted(true);
        }
      }
    } catch (_error) {
      // silent: wishlist toggle failed
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading || !currentMeetup) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonCircle} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skeletonLine, { width: '40%' }]} />
            <View style={[styles.skeletonLine, { width: '60%', height: 10 }]} />
          </View>
        </View>
        <View style={styles.skeletonCard}>
          <View style={[styles.skeletonLine, { width: '80%', height: 20, marginBottom: 16 }]} />
          <View style={[styles.skeletonLine, { width: '100%' }]} />
          <View style={[styles.skeletonLine, { width: '70%' }]} />
          <View style={[styles.skeletonLine, { width: '90%' }]} />
        </View>
      </View>
    );
  }

  const meetup = currentMeetup;
  const participants = meetup.participants || [];
  const isHost = meetup.hostId === user?.id;

  const isPastMeetup = meetup.status === '완료' || meetup.status === '종료' ||
                      meetup.status === '취소' || meetup.status === '파토';

  const now = new Date();
  const meetupDateTime = new Date(meetup.date + ' ' + meetup.time);
  const isTimeExpired = now > meetupDateTime;

  // 참가 불가 사유 계산
  const getJoinDisabledReason = (): string | null => {
    if (!user) {return '로그인이 필요합니다';}
    if (!meetup) {return null;}

    if (meetup.currentParticipants >= meetup.maxParticipants) {
      return '인원이 마감되었습니다';
    }

    const openGenderValues = ['무관', '상관없음', '혼성'];
    if (meetup.genderPreference && !openGenderValues.includes(meetup.genderPreference)) {
      const genderMap: Record<string, string> = { male: '남성', female: '여성' };
      const userGenderLabel = genderMap[user.gender || ''] || user.gender;
      const requiredGender = meetup.genderPreference.replace('만', '');
      if (userGenderLabel !== requiredGender && user.gender !== requiredGender) {
        return `${meetup.genderPreference} 전용 약속입니다`;
      }
    }

    return null;
  };

  const joinDisabledReason = getJoinDisabledReason();
  const canJoin = !joinDisabledReason;

  const handleJoinMeetup = async () => {
    if (!user || !meetupId || !canJoin) {return;}

    try {
      if (participants.some(p => p.id === user.id)) {
        setShowLeaveModal(true);
        return;
      }

      if (meetup.promiseDepositRequired && meetup.promiseDepositAmount > 0) {
        if (DepositSelectorComponent) {
          setShowDepositSelector(true);
        } else {
          setShowPromiseModal(true);
        }
      } else {
        await joinMeetup(meetupId, user.id);
        Alert.alert('성공', '약속에 참여되었습니다.');
      }
    } catch (_error) {
      Alert.alert('오류', '약속 참여에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleConfirmLeave = async () => {
    if (!user || !meetupId) {return;}

    try {
      const result = await leaveMeetup(meetupId, user.id);
      setShowLeaveModal(false);

      if (result?.isHostCancellation) {
        Alert.alert('알림', '약속이 취소되었습니다. 모든 참가자가 자동으로 나가게 됩니다.', [
          { text: '확인', onPress: () => navigation.navigate('Home') }
        ]);
      }
    } catch (_error) {
      Alert.alert('오류', '약속 탈퇴에 실패했습니다.');
      setShowLeaveModal(false);
    }
  };

  const checkUserPoints = async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/users/points');
      if (response.data && response.data.success) {
        const userPoints = response.data.data.points || 0;
        const requiredPoints = meetup.deposit || 3000;
        return userPoints >= requiredPoints;
      }
      return false;
    } catch (_error) {
      return false;
    }
  };

  const handleDepositPaid = async (depositId: string, amount: number) => {
    if (!user || !meetupId) {
      return;
    }

    try {
      const result = await joinMeetup(meetupId, user.id);

      if (amount > 0) {
        Alert.alert('성공', '약속금 ' + amount.toLocaleString() + '원이 결제되었습니다! 약속에 참여되었습니다.');
      } else {
        Alert.alert('성공', '약속에 참여되었습니다!');
      }
    } catch (_error) {
      Alert.alert('오류', '약속 참여에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGoToChat = async () => {
    if (!user || !meetupId) {return;}

    try {
      const apiUrl = Platform.OS === 'web'
        ? process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
        : 'http://localhost:3001/api';

      const response = await fetch(apiUrl + '/chat/rooms/by-meetup/' + meetupId, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + (Platform.OS === 'web'
            ? localStorage.getItem('token')
            : ''), // Native에서는 다른 방식으로 토큰 관리 필요
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data.chatRoomId) {
        const chatRoomId = data.data.chatRoomId;
        navigation.navigate('Chat', { chatRoomId });
      } else {
        Alert.alert('오류', '채팅방을 찾을 수 없습니다. 약속에 참여해주세요.');
      }
    } catch (_error) {
      Alert.alert('오류', '채팅방 이동 중 오류가 발생했습니다.');
    }
  };

  const handleMeetupAction = async () => {
    if (!user || !meetupId) {return;}

    try {
      const action = meetup.status === 'confirmed' ? 'cancel' : 'confirm';
      const response = await apiClient.put('/meetups/' + meetupId + '/confirm', {
        action: action
      });

      if (response.data.success) {
        await fetchMeetupById(meetupId);
        setShowHostModal(false);

        const message = action === 'confirm' ? '약속이 확정되었습니다!' : '약속이 취소되었습니다.';
        Alert.alert('성공', message);
      } else {
        Alert.alert('오류', response.data.error || '처리 중 오류가 발생했습니다.');
      }
    } catch (_error) {
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    }
  };

  // 모임 상태 변경 (모집중/모집완료 → 진행중, 진행중 → 종료)
  const handleStatusChange = async (newStatus: '진행중' | '종료') => {
    if (!user || !meetupId || statusChangeLoading) {return;}

    setStatusChangeLoading(true);
    try {
      const response = await apiClient.patch(`/meetups/${meetupId}/status`, {
        status: newStatus
      });

      if (response.data) {
        await fetchMeetupById(meetupId);
        setShowStatusModal(false);

        const message = newStatus === '진행중'
          ? '약속이 시작되었습니다! 참가자들이 GPS 체크인할 수 있어요.'
          : '약속이 종료되었습니다! 참가자들이 리뷰를 작성할 수 있어요.';
        Alert.alert('성공', message);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '상태 변경 중 오류가 발생했습니다.';
      Alert.alert('오류', errorMessage);
    } finally {
      setStatusChangeLoading(false);
    }
  };

  const participantRatio = (meetup.maxParticipants ?? 4) > 0
    ? (meetup.currentParticipants ?? 0) / (meetup.maxParticipants ?? 4)
    : 0;

  const getProgressBarColor = () => {
    if (participantRatio >= 0.8) return COLORS.functional.error;
    if (participantRatio >= 0.5) return COLORS.functional.warning;
    return COLORS.functional.success;
  };

  const handleConfirmJoin = async () => {
    if (!user || !meetupId) {return;}

    try {
      const hasEnoughPoints = await checkUserPoints();

      if (!hasEnoughPoints) {
        const requiredPoints = meetup.deposit || 3000;
        Alert.alert(
          '포인트 부족',
          '포인트가 부족합니다.\n필요한 포인트: ' + requiredPoints.toLocaleString() + '원\n충전 페이지로 이동하시겠습니까?',
          [
            { text: '취소', onPress: () => setShowPromiseModal(false) },
            {
              text: '충전하기',
              onPress: () => {
                setShowPromiseModal(false);
                navigation.navigate('DepositPayment', {
                  meetupId,
                  depositAmount: meetup.promiseDepositAmount || meetup.deposit || 3000,
                });
              }
            }
          ]
        );
        return;
      }

      const usePointsResponse = await apiClient.post('/users/use-points', {
        amount: meetup.deposit || 3000,
        description: '약속 참여비: ' + meetup.title
      });

      if (!usePointsResponse.data.success) {
        Alert.alert('오류', '포인트 사용 중 오류가 발생했습니다.');
        setShowPromiseModal(false);
        return;
      }

      await joinMeetup(meetupId, user.id);
      setShowPromiseModal(false);

      Alert.alert('성공', '약속 참여가 완료되었습니다!\n사용된 포인트: ' + (meetup.deposit || 3000).toLocaleString() + '원');
    } catch (_error) {
      Alert.alert('오류', '약속 참여 중 오류가 발생했습니다.');
      setShowPromiseModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 히어로 커버 이미지 (280px) */}
        {Platform.OS === 'web' ? (
          <div style={{
            position: 'relative',
            width: '100%',
            height: 280,
            overflow: 'hidden',
            backgroundColor: COLORS.neutral.grey200,
          }}>
            <img
              src={processImageUrl(meetup.image, meetup.category)}
              alt={meetup.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* 상단 그라데이션 오버레이 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              background: 'linear-gradient(180deg, rgba(17,17,17,0.4) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />
            {/* 하단 그라데이션 오버레이 */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              background: 'linear-gradient(0deg, rgba(17,17,17,0.5) 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />
            {/* 오버레이 헤더 버튼들 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 16px',
              paddingTop: 20,
            }}>
              <div style={{ width: 40, height: 40 }} />
              <div
                onClick={toggleWishlist}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: CSS_SHADOWS.small,
                  backdropFilter: 'blur(8px)',
                }}
                role="button"
                aria-label={isWishlisted ? '찜 해제' : '찜하기'}
              >
                <Heart
                  size={20}
                  color={isWishlisted ? COLORS.functional.error : COLORS.text.secondary}
                  fill={isWishlisted ? COLORS.functional.error : 'transparent'}
                />
              </div>
            </div>
            {/* 상태 뱃지 */}
            {meetup.status && (
              <div style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                display: 'flex',
                flexDirection: 'row',
                gap: 8,
                alignItems: 'center',
              }}>
                <div style={{
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 5,
                  paddingBottom: 5,
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: meetup.status === 'recruiting' || meetup.status === '모집중' ? COLORS.functional.success
                    : meetup.status === 'confirmed' || meetup.status === '모집완료' ? COLORS.primary.main
                    : meetup.status === '진행중' ? COLORS.functional.info
                    : COLORS.neutral.grey500,
                }}>
                  <span style={{ fontSize: 12, fontWeight: '700', color: COLORS.neutral.white }}>
                    {meetup.status === 'recruiting' ? '모집중' : meetup.status === 'confirmed' ? '모집완료' : meetup.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: processImageUrl(meetup.image, meetup.category) }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* 상단 그라데이션 오버레이 */}
            <LinearGradient
              colors={['rgba(17,17,17,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroGradientTop}
            />
            {/* 하단 그라데이션 오버레이 */}
            <LinearGradient
              colors={['transparent', 'rgba(17,17,17,0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroGradientBottom}
            />
            {/* 오버레이 헤더 버튼들 */}
            <View style={styles.heroHeaderOverlay}>
              <View style={{ width: 40, height: 40 }} />
              <TouchableOpacity
                style={styles.heroIconButton}
                onPress={toggleWishlist}
                disabled={wishlistLoading}
              >
                <Text style={{ fontSize: 20 }}>{isWishlisted ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
            </View>
            {/* 상태 뱃지 */}
            {meetup.status && (
              <View style={styles.heroStatusBadgeContainer}>
                <View style={[
                  styles.heroStatusBadge,
                  {
                    backgroundColor: meetup.status === 'recruiting' || meetup.status === '모집중' ? COLORS.functional.success
                      : meetup.status === 'confirmed' || meetup.status === '모집완료' ? COLORS.primary.main
                      : meetup.status === '진행중' ? COLORS.functional.info
                      : COLORS.neutral.grey500,
                  }
                ]}>
                  <Text style={styles.heroStatusBadgeText}>
                    {meetup.status === 'recruiting' ? '모집중' : meetup.status === 'confirmed' ? '모집완료' : meetup.status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 호스트 정보 카드 (히어로 이미지 겹침) */}
        {Platform.OS === 'web' ? (
          <div style={{
            marginLeft: SPACING.xl,
            marginRight: SPACING.xl,
            marginTop: -32,
            position: 'relative',
            zIndex: 2,
            backgroundColor: COLORS.neutral.white,
            borderRadius: BORDER_RADIUS.md,
            padding: 16,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: CSS_SHADOWS.card,
            border: `1px solid ${CARD_STYLE.borderColor}`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ProfileImage
                profileImage={meetup.host?.profileImage}
                name={meetup.host?.name || meetup.hostName}
                size={52}
              />
              <View>
                <Text style={styles.hostName}>{meetup.hostName || '익명'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name="map-pin" size={12} color={COLORS.text.tertiary} />
                  <Text style={styles.hostLocation}>{meetup.location || '위치 미정'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.riceIndicator}>
              <Text style={styles.riceText}>{meetup.hostBabAlScore || userRiceIndex} 밥알</Text>
            </View>
          </div>
        ) : (
          <View style={styles.hostSection}>
            <View style={styles.hostInfo}>
              <ProfileImage
                profileImage={meetup.host?.profileImage}
                name={meetup.host?.name || meetup.hostName}
                size={52}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.hostName}>{meetup.hostName || '익명'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name="map-pin" size={12} color={COLORS.text.tertiary} />
                  <Text style={styles.hostLocation}>{meetup.location || '위치 미정'}</Text>
                </View>
              </View>
            </View>
            <View style={styles.riceIndicator}>
              <Text style={styles.riceText}>{meetup.hostBabAlScore || userRiceIndex} 밥알</Text>
            </View>
          </View>
        )}

        <View style={styles.mainCard}>
          <Text style={styles.meetupTitle}>{meetup.title || '급한 때실 시밥'}</Text>

          <View style={styles.filterBadgeContainer}>
            <Text style={styles.filterBadgeTitle}>필수 성향</Text>
            <View style={styles.filterBadges}>
              {meetup.category && (
                <View style={[styles.filterBadge, { backgroundColor: getCategoryColor(meetup.category) + '15' }]}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(meetup.category)}</Text>
                  <Text style={[styles.filterBadgeText, { color: getCategoryColor(meetup.category) }]}>
                    {meetup.category}
                  </Text>
                </View>
              )}

              {meetup.priceRange && (
                <View style={styles.priceBadge}>
                  <Icon name="dollar-sign" size={13} color={COLORS.functional.success} />
                  <Text style={styles.priceBadgeText}>{meetup.priceRange}</Text>
                </View>
              )}

              {meetup.ageRange && (
                <View style={styles.ageBadge}>
                  <Icon name="user" size={13} color={COLORS.text.secondary} />
                  <Text style={styles.ageBadgeText}>{meetup.ageRange}</Text>
                </View>
              )}

              {meetup.genderPreference && (
                <View style={styles.genderBadge}>
                  <Icon name="users" size={13} color={COLORS.primary.main} />
                  <Text style={styles.genderBadgeText}>{meetup.genderPreference}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.filterBadgeContainer}>
            <Text style={styles.filterBadgeTitle}>선택 성향</Text>
            <View style={styles.filterBadges}>
              <View style={styles.optionalBadge}>
                <Icon name="smile" size={13} color={COLORS.text.secondary} />
                <Text style={styles.optionalBadgeText}>분위기 좋은 곳</Text>
              </View>

              <View style={styles.optionalBadge}>
                <Icon name="map" size={13} color={COLORS.text.secondary} />
                <Text style={styles.optionalBadgeText}>역 근처</Text>
              </View>

              <View style={styles.optionalBadge}>
                <Icon name="clock" size={13} color={COLORS.text.secondary} />
                <Text style={styles.optionalBadgeText}>1-2시간</Text>
              </View>

              <View style={styles.optionalBadge}>
                <Icon name="coffee" size={13} color={COLORS.text.secondary} />
                <Text style={styles.optionalBadgeText}>무알코올</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Icon name="map-pin" size={15} color={COLORS.text.tertiary} />
              <Text style={styles.infoLabel}>{meetup.location}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="clock" size={15} color={COLORS.text.tertiary} />
              <Text style={styles.infoLabel}>{formatMeetupDateTime(meetup.date, meetup.time)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="users" size={15} color={COLORS.primary.accent} />
              <Text style={[styles.infoLabel, { color: COLORS.primary.accent, fontWeight: '700' }]}>
                {meetup.currentParticipants ?? 0}/{meetup.maxParticipants ?? 4}명
              </Text>
            </View>

            {/* 참가자 프로그레스바 */}
            {Platform.OS === 'web' ? (
              <div style={{
                height: 6,
                backgroundColor: COLORS.neutral.grey100,
                borderRadius: BORDER_RADIUS.sm,
                overflow: 'hidden',
                marginTop: -4,
                marginBottom: 8,
              }}>
                <div style={{
                  width: `${Math.min(participantRatio * 100, 100)}%`,
                  height: '100%',
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: getProgressBarColor(),
                  transition: 'width 600ms ease',
                }} />
              </div>
            ) : (
              <View style={styles.progressBarContainer}>
                <View style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(participantRatio * 100, 100)}%`,
                    backgroundColor: getProgressBarColor(),
                  }
                ]} />
              </View>
            )}
          </View>

          <Text style={styles.description}>
            {meetup.description || '설명이 없습니다.'}
          </Text>

          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>
              {meetup.createdAt ? getChatTimeDifference(meetup.createdAt) : '방금 전'} · 조회 {meetup.viewCount || 0}
            </Text>
          </View>
        </View>

        <FilterAccordion
          diningPreferences={meetup.diningPreferences}
          promiseDepositRequired={meetup.promiseDepositRequired}
          promiseDepositAmount={meetup.promiseDepositAmount}
        />

        {/* GPS 체크인 섹션 */}
        {(meetup.status === '진행중') && (participants.some(p => p.id === user?.id) || isHost) && (
          <CheckInButton
            meetupId={meetupId}
            meetupStatus={meetup.status}
            meetupLocation={meetup.location}
            meetupLatitude={meetup.latitude}
            meetupLongitude={meetup.longitude}
            checkInRadius={meetup.checkInRadius || 300}
            onCheckInSuccess={() => fetchMeetupById(meetupId)}
          />
        )}

        {KakaoMapComponent && (
          <KakaoMapComponent
            location={meetup.location}
            address={meetup.address || meetup.location}
            latitude={meetup.latitude}
            longitude={meetup.longitude}
          />
        )}

        <View style={styles.participantSection}>
          <Text style={styles.participantTitle}>참여자 ({participants.filter(p => p.id !== meetup.hostId).length + 1}명)</Text>

          <View style={styles.participantItem}>
            <View style={styles.hostAvatar}>
              <ProfileImage
                profileImage={meetup.host?.profileImage}
                name={meetup.host?.name || meetup.hostName}
                size={44}
              />
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{meetup.host?.name || meetup.hostName} (호스트)</Text>
              <Text style={styles.participantRole}>호스트입니다</Text>
            </View>
          </View>

          {participants.filter(participant => participant.id !== meetup.hostId).map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <ProfileImage
                  profileImage={participant.profileImage}
                  name={participant.name}
                  size={44}
                />
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantRole}>
                  {participant.status === 'approved' ? '참가승인' :
                   participant.status === 'pending' ? '참가신청' :
                   participant.status === 'rejected' ? '참가거절' : '참가취소'}
                </Text>
              </View>
            </View>
          ))}

          {participants.filter(p => p.id !== meetup.hostId).length === 0 && (
            <Text style={styles.noParticipants}>아직 참여자가 없습니다.</Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.fixedBottom}>
        {meetup.status === '종료' && (participants.some(p => p.id === user?.id) || isHost) ? (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('WriteReview', { meetupId, meetupTitle: meetup.title })}
              style={styles.reviewButton}
            >
              <Icon name="star" size={18} color={COLORS.neutral.white} />
              <Text style={styles.reviewButtonText}>리뷰 작성하기</Text>
            </TouchableOpacity>
          </View>
        ) : isPastMeetup ? (
          <View style={styles.pastMeetupContainer}>
            <Text style={styles.pastMeetupText}>
              {meetup.status === '완료' ?
                '완료된 약속이에요' :
                meetup.status === '취소' ?
                '취소된 약속이에요' :
                '파토된 약속이에요'
              }
            </Text>
          </View>
        ) : (
          <>
            {(participants.some(p => p.id === user?.id) || isHost) ? (
              <View style={styles.bottomButtonContainer}>
                <TouchableOpacity
                  onPress={() => handleGoToChat()}
                  style={styles.chatButton}
                >
                  <Text style={styles.chatButtonText}>채팅방</Text>
                </TouchableOpacity>

                {isHost && (
                  <TouchableOpacity
                    onPress={() => {
                      if (meetup.status === '모집중' || meetup.status === '모집완료') {
                        handleStatusChange('진행중');
                      } else if (meetup.status === '진행중') {
                        handleStatusChange('종료');
                      } else {
                        setShowHostModal(true);
                      }
                    }}
                    style={[
                      styles.hostButton,
                      meetup.status === '진행중' && styles.endButton
                    ]}
                    disabled={statusChangeLoading}
                  >
                    <Text style={styles.hostButtonText}>
                      {statusChangeLoading ? '처리 중...' :
                       meetup.status === '모집중' || meetup.status === '모집완료' ? '약속시작' :
                       meetup.status === '진행중' ? '약속종료' : '약속확정'}
                    </Text>
                  </TouchableOpacity>
                )}

                {!isHost && (
                  <TouchableOpacity
                    onPress={() => setShowLeaveModal(true)}
                    style={styles.leaveButton}
                  >
                    <Text style={styles.leaveButtonText}>참여취소</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                {joinDisabledReason && (
                  <Text style={{
                    fontSize: 13,
                    color: COLORS.functional.error,
                    textAlign: 'center',
                    fontWeight: '600',
                    marginBottom: 6,
                  }}>{joinDisabledReason}</Text>
                )}
                <TouchableOpacity
                  onPress={() => handleJoinMeetup()}
                  style={[
                    styles.joinButton,
                    !canJoin && { backgroundColor: COLORS.neutral.grey300, opacity: 0.7 },
                  ]}
                  disabled={!canJoin}
                >
                  <Text style={styles.joinButtonText}>{canJoin ? '같이먹기' : joinDisabledReason}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      <ModalComponent
        visible={showPromiseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPromiseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>서로의 신뢰를 위해{'\n'}약속금을 미리 걸어두요</Text>
            <Text style={styles.modalDescription}>
              노쇼 방지 약속금이며, 1일 이내에 다시 입금됩니다.
            </Text>
            <View style={styles.modalAmountContainer}>
              <Text style={styles.modalAmount}>약속금 3000원</Text>
            </View>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => setShowPromiseModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPayButton}
                onPress={handleConfirmJoin}
              >
                <Text style={styles.modalPayText}>다음</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent
        visible={showLeaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {isHost ? '약속을 취소하시겠어요?' : '약속에서 나가시겠어요?'}
            </Text>
            <Text style={styles.modalDescription}>
              {isHost ?
                '약속을 취소하면 모든 참가자가 나가게 되고,\n채팅방도 삭제됩니다. 취소하시겠어요?' :
                '약속을 나가면 채팅방에서도 나가게 되며,\n다시 참여하려면 새로 신청해야 해요.'
              }
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => setShowLeaveModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLeaveButton, isHost && styles.modalHostCancelButton]}
                onPress={handleConfirmLeave}
              >
                <Text style={styles.modalLeaveText}>
                  {isHost ? '약속취소' : '나가기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ModalComponent>

      <ModalComponent
        visible={showHostModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {meetup.status === 'confirmed' ? '약속을 취소하시겠어요?' : '약속을 확정하시겠어요?'}
            </Text>
            <Text style={styles.modalDescription}>
              {meetup.status === 'confirmed' ?
                '확정된 약속을 취소하면 취소 시점에 따라\n참가자들에게 부분 환불됩니다.' :
                '현재 ' + participants.length + '명이 참여중입니다.\n약속을 확정하면 취소 시 패널티가 적용됩니다.'
              }
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => setShowHostModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton]}
                onPress={handleMeetupAction}
              >
                <Text style={styles.modalConfirmText}>
                  {meetup.status === 'confirmed' ? '약속취소' : '약속확정'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ModalComponent>

      {DepositSelectorComponent && (
        <DepositSelectorComponent
          visible={showDepositSelector}
          onClose={() => setShowDepositSelector(false)}
          onDepositPaid={handleDepositPaid}
          meetupId={meetupId || currentMeetup?.id || ''}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  scrollView: {
    flex: 1,
  },
  // 히어로 이미지 스타일 (Native)
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  heroStatusBadgeContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  heroStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
  },
  heroStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  // 참가자 프로그레스바 (Native)
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginTop: -4,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
    padding: SPACING.xl,
    paddingTop: 60,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    marginBottom: SPACING.lg,
    gap: 12,
  },
  skeletonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.neutral.light,
  },
  skeletonCard: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    gap: 10,
  },
  skeletonLine: {
    height: 14,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    paddingTop: 50,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.sticky,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: -32,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.medium,
    zIndex: 2,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.grey200,
  },
  hostName: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  hostLocation: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
  },
  riceIndicator: {
    backgroundColor: COLORS.neutral.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  riceText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  mainCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.medium,
  },
  meetupTitle: {
    ...TYPOGRAPHY.heading.h1,
    color: COLORS.text.primary,
    marginBottom: SPACING.xl,
  },
  filterBadgeContainer: {
    marginBottom: SPACING.xl,
  },
  filterBadgeTitle: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  filterBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    gap: 5,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryEmoji: {
    fontSize: 13,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.functional.successLight,
    gap: 5,
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.light,
    gap: 5,
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.light,
    gap: 5,
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  optionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.background,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    gap: 5,
  },
  optionalBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  infoGrid: {
    marginBottom: SPACING.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
  description: {
    ...TYPOGRAPHY.body.large,
    color: COLORS.text.primary,
    lineHeight: 26,
    marginBottom: SPACING.lg,
  },
  timeInfo: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  accordionContainer: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface.secondary,
  },
  accordionTitle: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.primary,
  },
  accordionContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.neutral.white,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY.body.medium,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  filterItem: {
    marginBottom: 4,
  },
  filterValue: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  filterDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    backgroundColor: COLORS.neutral.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  interestTagText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  participantSection: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.small,
  },
  participantTitle: {
    ...TYPOGRAPHY.sectionHeader.title,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: COLORS.primary.accent,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  participantRole: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
  },
  noParticipants: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  bottomPadding: {
    height: 100,
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: CARD_STYLE.borderColor,
    ...SHADOWS.sticky,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  chatButton: {
    flex: 2,
    backgroundColor: COLORS.primary.main,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  chatButtonText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.neutral.white,
  },
  hostButton: {
    flex: 1,
    backgroundColor: COLORS.functional.success,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: COLORS.functional.error,
  },
  hostButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.neutral.white,
  },
  leaveButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.functional.error,
  },
  leaveButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.functional.error,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.accent,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
    ...SHADOWS.cta,
  },
  reviewButtonText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.neutral.white,
  },
  joinButton: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.neutral.white,
    letterSpacing: -0.2,
  },
  pastMeetupContainer: {
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  pastMeetupText: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  modalAmountContainer: {
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  modalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  modalCancelText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.secondary,
  },
  modalPayButton: {
    flex: 1,
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  modalPayText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.neutral.white,
  },
  modalLeaveButton: {
    flex: 1,
    backgroundColor: COLORS.functional.error,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
  },
  modalLeaveText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.neutral.white,
  },
  modalHostCancelButton: {
    backgroundColor: COLORS.functional.error,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.functional.success,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.neutral.white,
  },
});

export default UniversalMeetupDetailScreen;