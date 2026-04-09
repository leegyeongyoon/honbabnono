import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal as RNModal, Platform, Image, Clipboard } from 'react-native';
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
let Heart: any = null;
let Share2LucideIcon: any = null;
if (Platform.OS === 'web') {
  try {
    const lucide = require('lucide-react');
    Heart = lucide.Heart;
    Share2LucideIcon = lucide.Share2;
  } catch (_e) {
    // lucide-react not available
  }
}
import CheckInButton from '../CheckInButton';
import { shareToKakao } from '../../utils/kakaoShare';

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

// 바발스코어 등급 계산 (서버 babalScore.js와 동기화)
const getBabalLevelLabel = (score: number): { label: string; color: string } => {
  if (score >= 60) return { label: '전설', color: '#D4482C' };
  if (score >= 50) return { label: '고수', color: '#FF6B35' };
  if (score >= 42) return { label: '단골', color: '#4CAF50' };
  if (score >= 36.5) return { label: '밥친구', color: '#2196F3' };
  if (score >= 30) return { label: '새싹', color: '#9E9E9E' };
  return { label: '주의', color: '#F44336' };
};

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
              <Text style={styles.filterSectionTitle}>약속금</Text>
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
              <Text style={styles.filterSectionTitle}>식사 속도</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.eatingSpeed}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.conversationDuringMeal && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>식사 중 대화</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.conversationDuringMeal}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.talkativeness && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>수다 정도</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.talkativeness}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.mealPurpose && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>식사 목적</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.mealPurpose}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.specificRestaurant && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>선호 음식점</Text>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.specificRestaurant}</Text>
              </View>
            </View>
          )}

          {diningPreferences?.interests && diningPreferences.interests.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>관심사</Text>
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
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);

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

  // 약속금 결제 상태 확인
  useEffect(() => {
    const checkDepositStatus = async () => {
      if (!currentMeetup || !user) {return;}
      // 약속금이 필요한 모임인지 확인
      const required = currentMeetup.promiseDepositRequired;
      const amount = currentMeetup.promiseDepositAmount || 0;
      setDepositAmount(amount);

      if (!required || amount <= 0) {
        setDepositStatus(null);
        return;
      }

      try {
        const response = await apiClient.get('/deposits/meetup/' + currentMeetup.id);
        if (response.data && response.data.success && response.data.deposit) {
          setDepositStatus(response.data.deposit.status);
        } else {
          setDepositStatus(null);
        }
      } catch (_error) {
        setDepositStatus(null);
      }
    };

    checkDepositStatus();
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

  const handleShare = () => {
    if (!currentMeetup) {return;}

    shareToKakao({
      id: currentMeetup.id,
      title: currentMeetup.title,
      description: currentMeetup.description,
      location: currentMeetup.location,
      date: currentMeetup.date,
      time: currentMeetup.time,
      imageUrl: processImageUrl(currentMeetup.image, currentMeetup.category),
      currentParticipants: currentMeetup.currentParticipants,
      maxParticipants: currentMeetup.maxParticipants,
    });
  };

  if (loading || !currentMeetup) {
    return (
      <View style={styles.loadingContainer}>
        {/* Skeleton Header */}
        <View style={styles.skeletonHeaderBar}>
          <View style={[styles.skeletonLine, { width: 24, height: 24 }]} />
          <View style={[styles.skeletonLine, { width: 120, height: 18 }]} />
          <View style={{ width: 24 }} />
        </View>
        {/* Skeleton Hero */}
        <View style={styles.skeletonHero} />
        {/* Skeleton Host */}
        <View style={styles.skeletonHostRow}>
          <View style={styles.skeletonCircle} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skeletonLine, { width: '40%' }]} />
            <View style={[styles.skeletonLine, { width: '60%', height: 10 }]} />
          </View>
        </View>
        {/* Skeleton Content */}
        <View style={styles.skeletonContent}>
          <View style={[styles.skeletonLine, { width: '50%', height: 12, marginBottom: 12 }]} />
          <View style={[styles.skeletonLine, { width: '100%' }]} />
          <View style={[styles.skeletonLine, { width: '80%' }]} />
          <View style={[styles.skeletonLine, { width: '70%' }]} />
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

    const depositAmt = meetup.promiseDepositAmount || meetup.deposit || 3000;

    try {
      const hasEnoughPoints = await checkUserPoints();

      if (!hasEnoughPoints) {
        Alert.alert(
          '포인트 부족',
          '포인트가 부족합니다.\n필요한 포인트: ' + depositAmt.toLocaleString() + '원\n결제 페이지로 이동하시겠습니까?',
          [
            { text: '취소', onPress: () => setShowPromiseModal(false) },
            {
              text: '결제하기',
              onPress: () => {
                setShowPromiseModal(false);
                navigation.navigate('DepositPayment', {
                  meetupId,
                  depositAmount: depositAmt,
                });
              }
            }
          ]
        );
        return;
      }

      const usePointsResponse = await apiClient.post('/users/use-points', {
        amount: depositAmt,
        description: '약속 참여비: ' + meetup.title
      });

      if (!usePointsResponse.data.success) {
        Alert.alert('오류', '포인트 사용 중 오류가 발생했습니다.');
        setShowPromiseModal(false);
        return;
      }

      await joinMeetup(meetupId, user.id);
      setShowPromiseModal(false);

      Alert.alert('성공', '약속 참여가 완료되었습니다!\n사용된 포인트: ' + depositAmt.toLocaleString() + '원');
    } catch (_error) {
      Alert.alert('오류', '약속 참여 중 오류가 발생했습니다.');
      setShowPromiseModal(false);
    }
  };

  const handleCopyAddress = () => {
    const address = meetup.address || meetup.location || '';
    if (Platform.OS === 'web') {
      try {
        navigator.clipboard.writeText(address);
      } catch (_e) {
        // fallback: silent
      }
    } else {
      Clipboard.setString(address);
    }
    Alert.alert('복사됨', '주소가 클립보드에 복사되었습니다.');
  };

  const statusLabel = meetup.status === 'recruiting' ? '모집중'
    : meetup.status === 'confirmed' ? '모집완료'
    : meetup.status;

  return (
    <View style={styles.container}>
      {/* ──── 1. Header ──── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size={22} color="#121212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{meetup.title || '모임 상세'}</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerShareBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="share-2" size={20} color="#121212" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ──── 2. Hero Image (180px) ──── */}
        {Platform.OS === 'web' ? (
          <div style={{
            position: 'relative',
            width: '100%',
            height: 180,
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
            {/* 상태 뱃지 */}
            {meetup.status && (
              <div style={{
                position: 'absolute',
                top: 12,
                left: 12,
              }}>
                <div style={{
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 4,
                  paddingBottom: 4,
                  borderRadius: 4,
                  backgroundColor: meetup.status === 'recruiting' || meetup.status === '모집중' ? COLORS.functional.success
                    : meetup.status === 'confirmed' || meetup.status === '모집완료' ? COLORS.primary.main
                    : meetup.status === '진행중' ? COLORS.functional.info
                    : COLORS.neutral.grey500,
                }}>
                  <span style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                    {statusLabel}
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
                  <Text style={styles.heroStatusBadgeText}>{statusLabel}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ──── 3. Host Info ──── */}
        <TouchableOpacity
          style={styles.hostSection}
          activeOpacity={0.7}
          onPress={() => meetup.hostId && navigation.navigate('HostProfile', { userId: meetup.hostId })}
        >
          <View style={styles.hostLeft}>
            <ProfileImage
              profileImage={meetup.host?.profileImage}
              name={meetup.host?.name || meetup.hostName}
              size={43}
            />
            <View style={styles.hostTextWrap}>
              <Text style={styles.hostName}>{meetup.hostName || '익명'}</Text>
              <Text style={styles.hostLocation}>{meetup.location || '위치 미정'}</Text>
            </View>
          </View>
          <View style={styles.riceIndicator}>
            <Text style={styles.riceText}>{meetup.hostBabAlScore || userRiceIndex} 밥알</Text>
            <View style={styles.riceIcon} />
          </View>
        </TouchableOpacity>

        {/* ──── 4. Divider ──── */}
        <View style={styles.divider} />

        {/* ──── 5. Tags (pill chips) ──── */}
        <View style={styles.tagsSection}>
          {meetup.category && (
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>{meetup.category}</Text>
            </View>
          )}
          {meetup.ageRange && (
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>{meetup.ageRange}</Text>
            </View>
          )}
          {meetup.genderPreference && (
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>{meetup.genderPreference}</Text>
            </View>
          )}
          {meetup.priceRange && (
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>{meetup.priceRange}</Text>
            </View>
          )}
        </View>

        {/* ──── 6. Info rows ──── */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Icon name="map-pin" size={18} color="#5f5f5f" />
            <Text style={styles.infoText}>{meetup.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="calendar" size={18} color="#5f5f5f" />
            <Text style={styles.infoText}>{formatMeetupDateTime(meetup.date, meetup.time)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="users" size={18} color="#5f5f5f" />
            <Text style={styles.infoText}>
              {meetup.currentParticipants ?? 0}/{meetup.maxParticipants ?? 4}명
            </Text>
          </View>
        </View>

        {/* ──── 7. Divider ──── */}
        <View style={styles.divider} />

        {/* ──── 8. Description ──── */}
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>
            {meetup.description || '설명이 없습니다.'}
          </Text>
          <Text style={styles.metaText}>
            {meetup.createdAt ? getChatTimeDifference(meetup.createdAt) : '방금 전'} · 조회 {meetup.viewCount || 0}
          </Text>
        </View>

        {/* ──── FilterAccordion ──── */}
        <FilterAccordion
          diningPreferences={meetup.diningPreferences}
          promiseDepositRequired={meetup.promiseDepositRequired}
          promiseDepositAmount={meetup.promiseDepositAmount}
        />

        {/* ──── GPS + QR 체크인 섹션 ──── */}
        {(meetup.status === '진행중') && (participants.some(p => p.id === user?.id) || isHost) && (
          <View style={styles.sectionPadded}>
            <CheckInButton
              meetupId={meetupId}
              meetupStatus={meetup.status}
              meetupLocation={meetup.location}
              meetupLatitude={meetup.latitude}
              meetupLongitude={meetup.longitude}
              checkInRadius={meetup.checkInRadius || 300}
              isHost={isHost}
              onCheckInSuccess={() => fetchMeetupById(meetupId)}
            />
          </View>
        )}

        {/* ──── 9. Map ──── */}
        {KakaoMapComponent && (
          <View style={styles.mapSection}>
            <View style={styles.mapContainer}>
              <KakaoMapComponent
                location={meetup.location}
                address={meetup.address || meetup.location}
                latitude={meetup.latitude}
                longitude={meetup.longitude}
              />
            </View>
          </View>
        )}

        {/* ──── 10. Address + copy + transit badges ──── */}
        {(meetup.address || meetup.location) && (
          <View style={styles.addressSection}>
            <View style={styles.addressRow}>
              <Text style={styles.addressText} numberOfLines={2}>{meetup.address || meetup.location}</Text>
              <TouchableOpacity onPress={handleCopyAddress} style={styles.copyBtn}>
                <Icon name="copy" size={18} color="#5f5f5f" />
                <Text style={styles.copyBtnText}>복사</Text>
              </TouchableOpacity>
            </View>
            {/* Transit badges */}
            <View style={styles.transitRow}>
              {meetup.nearbySubway && (
                <View style={styles.transitBadgeBlue}>
                  <Text style={styles.transitBadgeBlueText}>{meetup.nearbySubway}</Text>
                </View>
              )}
              {meetup.nearbyBus && (
                <View style={styles.transitBadgeGreen}>
                  <Text style={styles.transitBadgeGreenText}>{meetup.nearbyBus}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ──── 11. Divider ──── */}
        <View style={styles.divider} />

        {/* ──── 12. Participants ──── */}
        <View style={styles.participantSection}>
          <Text style={styles.participantTitle}>참여 멤버</Text>

          {/* 호스트 */}
          <View style={styles.participantItem}>
            <ProfileImage
              profileImage={meetup.host?.profileImage}
              name={meetup.host?.name || meetup.hostName}
              size={40}
            />
            <View style={styles.participantInfo}>
              <View style={styles.participantNameRow}>
                <Text style={styles.participantName}>{meetup.host?.name || meetup.hostName}</Text>
                <View style={styles.hostLabelBadge}>
                  <Text style={styles.hostLabelText}>호스트</Text>
                </View>
                {meetup.host?.babAlScore != null && (() => {
                  const level = getBabalLevelLabel(meetup.host.babAlScore);
                  return (
                    <View style={[styles.babalLevelBadge, { backgroundColor: level.color + '18' }]}>
                      <Text style={[styles.babalLevelText, { color: level.color }]}>{level.label}</Text>
                    </View>
                  );
                })()}
              </View>
              {meetup.host?.bio && (
                <Text style={styles.participantBio} numberOfLines={1}>{meetup.host.bio}</Text>
              )}
            </View>
          </View>

          {/* 참가자들 */}
          {participants.filter(participant => participant.id !== meetup.hostId).map((participant) => {
            const babalLevel = participant.babAlScore != null
              ? getBabalLevelLabel(participant.babAlScore)
              : null;
            return (
              <View key={participant.id} style={styles.participantItem}>
                <ProfileImage
                  profileImage={participant.profileImage}
                  name={participant.name}
                  size={40}
                />
                <View style={styles.participantInfo}>
                  <View style={styles.participantNameRow}>
                    <Text style={styles.participantName}>{participant.name}</Text>
                    {babalLevel && (
                      <View style={[styles.babalLevelBadge, { backgroundColor: babalLevel.color + '18' }]}>
                        <Text style={[styles.babalLevelText, { color: babalLevel.color }]}>{babalLevel.label}</Text>
                      </View>
                    )}
                  </View>
                  {participant.bio && (
                    <Text style={styles.participantBio} numberOfLines={1}>{participant.bio}</Text>
                  )}
                </View>
              </View>
            );
          })}

          {participants.filter(p => p.id !== meetup.hostId).length === 0 && (
            <Text style={styles.noParticipants}>아직 참여자가 없습니다.</Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* ──── 13. Bottom Bar ──── */}
      <View style={styles.fixedBottom}>
        {meetup.status === '종료' && (participants.some(p => p.id === user?.id) || isHost) ? (
          <View style={styles.bottomBarRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('WriteReview', { meetupId, meetupTitle: meetup.title })}
              style={styles.ctaButton}
            >
              <Icon name="star" size={18} color={COLORS.neutral.white} />
              <Text style={styles.ctaButtonText}>리뷰 작성하기</Text>
            </TouchableOpacity>
          </View>
        ) : isPastMeetup ? (
          <View style={styles.bottomBarRow}>
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
          </View>
        ) : (
          <>
            {(participants.some(p => p.id === user?.id) || isHost) ? (
              <View style={styles.bottomBarRow}>
                {/* 약속금 미결제 참가자: 결제 버튼 표시 */}
                {!isHost && meetup.promiseDepositRequired && depositAmount > 0 && depositStatus !== 'paid' ? (
                  <>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('DepositPayment', {
                        meetupId,
                        depositAmount: meetup.promiseDepositAmount || 3000,
                      })}
                      style={styles.depositButton}
                    >
                      <Text style={styles.depositButtonText}>
                        {'약속금 ' + (meetup.promiseDepositAmount || 3000).toLocaleString() + '원 결제하기'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowLeaveModal(true)}
                      style={styles.leaveButton}
                    >
                      <Text style={styles.leaveButtonText}>참여취소</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* 결제 완료 표시 */}
                    {!isHost && depositStatus === 'paid' && depositAmount > 0 && (
                      <View style={styles.depositPaidBadge}>
                        <Text style={styles.depositPaidText}>약속금 결제완료</Text>
                      </View>
                    )}
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
                  </>
                )}
              </View>
            ) : (
              <View style={styles.bottomBarRow}>
                {/* Heart wishlist + CTA */}
                <TouchableOpacity
                  onPress={toggleWishlist}
                  style={styles.wishlistBtn}
                  disabled={wishlistLoading}
                >
                  {Platform.OS === 'web' && Heart ? (
                    <Heart
                      size={24}
                      color={isWishlisted ? COLORS.functional.error : '#868b94'}
                      fill={isWishlisted ? COLORS.functional.error : 'transparent'}
                    />
                  ) : (
                    <Icon
                      name="heart"
                      size={24}
                      color={isWishlisted ? COLORS.functional.error : '#868b94'}
                      fill={isWishlisted ? COLORS.functional.error : undefined}
                    />
                  )}
                  <Text style={[styles.wishlistCount, isWishlisted && { color: COLORS.functional.error }]}>
                    {meetup.wishlistCount || 0}
                  </Text>
                </TouchableOpacity>

                <View style={styles.ctaWrap}>
                  {joinDisabledReason && (
                    <Text style={styles.joinDisabledHint}>{joinDisabledReason}</Text>
                  )}
                  <TouchableOpacity
                    onPress={() => handleJoinMeetup()}
                    style={[
                      styles.ctaButton,
                      !canJoin && { backgroundColor: COLORS.neutral.grey300, opacity: 0.7 },
                    ]}
                    disabled={!canJoin}
                  >
                    <Text style={styles.ctaButtonText}>{canJoin ? '같이먹기' : joinDisabledReason}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* ──── Modals ──── */}
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
              <Text style={styles.modalAmount}>{'약속금 ' + (meetup.promiseDepositAmount || 3000).toLocaleString() + '원'}</Text>
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
  /* ──── Container ──── */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },

  /* ──── 1. Header ──── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingTop: Platform.OS === 'ios' ? 46 : 0,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'ios' ? { height: 102 } : {}),
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.2,
    marginHorizontal: 8,
  },
  headerShareBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ──── 2. Hero Image ──── */
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroStatusBadgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  heroStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  heroStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  /* ──── 3. Host Info ──── */
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  hostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  hostTextWrap: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 2,
  },
  hostLocation: {
    fontSize: 14,
    fontWeight: '400',
    color: '#868b94',
  },
  riceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riceText: {
    fontSize: 16,
    color: '#121212',
    fontWeight: '600',
  },
  riceIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#d9d9d9',
  },

  /* ──── 4/7/11. Divider ──── */
  divider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
  },

  /* ──── 5. Tags ──── */
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tagChip: {
    backgroundColor: '#f3f5f7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#5f5f5f',
  },

  /* ──── 6. Info rows ──── */
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5f5f5f',
    flex: 1,
  },

  /* ──── 8. Description ──── */
  descriptionSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5f5f5f',
    lineHeight: 24,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#868b94',
  },

  /* ──── 9. Map ──── */
  mapSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  mapContainer: {
    width: '100%',
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },

  /* ──── 10. Address ──── */
  addressSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5f5f5f',
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  copyBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5f5f5f',
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  transitBadgeBlue: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#3e519b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitBadgeBlueText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transitBadgeGreen: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#3e9b4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitBadgeGreenText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transitStationText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#868b94',
    marginLeft: 4,
  },

  /* ──── Helper ──── */
  sectionPadded: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  /* ──── 12. Participants ──── */
  participantSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  participantTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 18,
  },
  participantInfo: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#121212',
  },
  participantBio: {
    fontSize: 14,
    fontWeight: '400',
    color: '#868b94',
  },
  hostLabelBadge: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  babalLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  babalLevelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noParticipants: {
    fontSize: 14,
    color: '#868b94',
    textAlign: 'center',
    paddingVertical: 24,
  },

  /* ──── 13. Bottom Bar ──── */
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 13,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wishlistBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    gap: 2,
  },
  wishlistCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#868b94',
  },
  ctaWrap: {
    flex: 1,
  },
  ctaButton: {
    backgroundColor: '#FFA529',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  joinDisabledHint: {
    fontSize: 12,
    color: COLORS.functional.error,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  chatButton: {
    flex: 2,
    backgroundColor: COLORS.primary.main,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  hostButton: {
    flex: 1,
    backgroundColor: COLORS.functional.success,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: COLORS.functional.error,
  },
  hostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  leaveButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.functional.error,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.functional.error,
  },
  depositButton: {
    flex: 1,
    backgroundColor: COLORS.special.deposit,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  depositPaidBadge: {
    backgroundColor: COLORS.functional.successLight,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  depositPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  pastMeetupContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.light,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  pastMeetupText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },

  /* ──── Loading skeleton ──── */
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skeletonHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  skeletonHero: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.neutral.light,
  },
  skeletonHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  skeletonCircle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: COLORS.neutral.light,
  },
  skeletonContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: COLORS.neutral.light,
  },

  /* ──── Accordion (FilterAccordion) ──── */
  accordionContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface.secondary,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: COLORS.neutral.white,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  filterItem: {
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
  filterDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: '#868B94',
    marginTop: 2,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    backgroundColor: '#f3f5f7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: 12,
    color: '#5f5f5f',
    fontWeight: '400',
  },

  /* ──── Modals ──── */
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
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalAmountContainer: {
    backgroundColor: '#F3F5F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: '#F3F5F7',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  modalPayButton: {
    flex: 1,
    backgroundColor: '#FFA529',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPayText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  modalLeaveButton: {
    flex: 1,
    backgroundColor: COLORS.functional.error,
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLeaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  modalHostCancelButton: {
    backgroundColor: COLORS.functional.error,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.functional.success,
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  bottomPadding: {
    height: 120,
  },
});

export default UniversalMeetupDetailScreen;
