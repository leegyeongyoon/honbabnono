import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS, LAYOUT, TYPOGRAPHY, SPACING, BORDER_RADIUS, HEADER_STYLE } from '../styles';
import { getAvatarColor, getInitials } from '../utils/avatarColor';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import apiClient from '../services/apiClient';
import { DepositSelector } from '../components/DepositSelector';
import { getChatTimeDifference } from '../utils/timeUtils';
import { useRouterNavigation } from '../components/RouterNavigation';
import { processImageUrl } from '../utils/imageUtils';
import { Icon } from '../components/Icon';
import { ProfileImage } from '../components/ProfileImage';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { FOOD_CATEGORIES } from '../constants/categories';
import { Heart } from 'lucide-react';
import { FadeIn } from '../components/animated';
import { MeetupCardSkeleton } from '../components/skeleton';


// 카테고리 관련 유틸 함수들
const getCategoryIcon = (categoryName: string) => {
  const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.icon : 'utensils';
};

const getCategoryColor = (categoryName: string) => {
  const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.color : COLORS.primary.main;
};

// 필터 정보 아코디언 컴포넌트
const FilterAccordion: React.FC<{
  diningPreferences?: any;
  promiseDepositRequired?: boolean;
  promiseDepositAmount?: number;
}> = ({ diningPreferences, promiseDepositRequired, promiseDepositAmount }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 필터 정보가 있는지 확인
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
          size={20}
          color={COLORS.text.secondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.accordionContent}>
          {/* 약속금 정보 */}
          {hasDepositInfo && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="dollar-sign" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>약속금</Text>
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>
                  {promiseDepositAmount?.toLocaleString()}원
                </Text>
                <Text style={styles.filterDescription}>노쇼 방지를 위한 약속금입니다</Text>
              </View>
            </View>
          )}

          {/* 식사 스타일 */}
          {diningPreferences?.eatingSpeed && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="utensils" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>식사 속도</Text>
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.eatingSpeed}</Text>
              </View>
            </View>
          )}

          {/* 대화 선호도 */}
          {diningPreferences?.conversationDuringMeal && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="message-circle" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>식사 중 대화</Text>
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.conversationDuringMeal}</Text>
              </View>
            </View>
          )}

          {/* 수다 정도 */}
          {diningPreferences?.talkativeness && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="megaphone" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>수다 정도</Text>
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.talkativeness}</Text>
              </View>
            </View>
          )}

          {/* 식사 목적 */}
          {diningPreferences?.mealPurpose && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="navigation" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>식사 목적</Text>
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.mealPurpose}</Text>
              </View>
            </View>
          )}

          {/* 특정 음식점 */}
          {diningPreferences?.specificRestaurant && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="building" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>선호 음식점</Text>
              </View>
              <View style={styles.filterItem}>
                <Text style={styles.filterValue}>{diningPreferences.specificRestaurant}</Text>
              </View>
            </View>
          )}

          {/* 관심사 */}
          {diningPreferences?.interests && diningPreferences.interests.length > 0 && (
            <View style={styles.filterSection}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Icon name="smile" size={16} color={COLORS.text.secondary} />
                <Text style={styles.filterSectionTitle}>관심사</Text>
              </View>
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

// Window 타입 확장
declare global {
  interface Window {
    kakao: any;
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface MeetupDetailScreenProps {
  user?: User | null;
}

// 카카오맵 컴포넌트
const KakaoMap: React.FC<{
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
}> = ({ location, address, latitude, longitude }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadKakaoMap = () => {
      try {
        if (window.kakao && window.kakao.maps && mapRef.current) {
          // 좌표 우선 사용, 없으면 서울 시청 기본 좌표
          const lat = latitude || 37.5665;
          const lng = longitude || 126.9780;

          const coords = new window.kakao.maps.LatLng(lat, lng);
          const options = {
            center: coords,
            level: 3
          };

          const map = new window.kakao.maps.Map(mapRef.current, options);

          // 마커 생성 및 표시
          const marker = new window.kakao.maps.Marker({
            map: map,
            position: coords
          });

          // 인포윈도우 생성 및 표시
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="width:150px;text-align:center;padding:6px 0; font-size: 12px;">${location}</div>`
          });
          infowindow.open(map, marker);

          setMapLoaded(true);
          setMapError(null);
        }
      } catch (error) {
        setMapError('지도를 불러올 수 없습니다.');
      }
    };

    if (!window.kakao) {
      const script = document.createElement('script');
      script.async = true;
      const kakaoAppKey = process.env.REACT_APP_KAKAO_JS_KEY || process.env.REACT_APP_KAKAO_CLIENT_ID || '';
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&libraries=services&autoload=false`;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(loadKakaoMap);
        }
      };
      script.onerror = () => {
        setMapError('지도 스크립트를 불러올 수 없습니다.');
      };
      document.head.appendChild(script);
    } else {
      loadKakaoMap();
    }
  }, [location, latitude, longitude]);

  return (
    <View style={styles.mapSection}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '168px',
          backgroundColor: '#F5F5F5',
          borderRadius: 16,
          marginBottom: 12,
          display: mapError ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.text.secondary,
          fontSize: '14px',
          overflow: 'hidden',
        }}
      >
        {!mapLoaded && !mapError && '지도를 불러오는 중...'}
        {mapError && mapError}
      </div>
    </View>
  );
};

const MeetupDetailScreen: React.FC<MeetupDetailScreenProps> = ({ user: propsUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navigation = useRouterNavigation();
  const { user: storeUser } = useUserStore();
  const currentMeetup = useMeetupStore(state => state.currentMeetup);
  const loading = useMeetupStore(state => state.loading);
  const joinMeetup = useMeetupStore(state => state.joinMeetup);
  const leaveMeetup = useMeetupStore(state => state.leaveMeetup);
  const fetchMeetupById = useMeetupStore(state => state.fetchMeetupById);
  const setCurrentMeetup = useMeetupStore(state => state.setCurrentMeetup);
  const [showPromiseModal, setShowPromiseModal] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [showDepositSelector, setShowDepositSelector] = React.useState(false);
  const [showHostModal, setShowHostModal] = React.useState(false);
  const [userRiceIndex, setUserRiceIndex] = React.useState<number>(0);
  const [isWishlisted, setIsWishlisted] = React.useState<boolean>(false);
  const [wishlistLoading, setWishlistLoading] = React.useState<boolean>(false);
  const [depositStatus, setDepositStatus] = React.useState<string | null>(null);
  const [depositAmountState, setDepositAmountState] = React.useState<number>(0);
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const { dialog, confirm, confirmDanger, hideDialog } = useConfirmDialog();
  const [addressCopied, setAddressCopied] = React.useState(false);

  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  React.useEffect(() => {
    if (id) {
      // 캐시된 데이터를 클리어하고 새로운 데이터를 가져옴
      setCurrentMeetup(null);
      fetchMeetupById(id);

      // 최근 본 글 기록 추가
      const recordRecentView = async () => {
        try {
          await apiClient.post(`/meetups/${id}/view`);
        } catch (error) {
          // 최근 본 글 기록 실패 - 무시
        }
      };

      // 사용자가 로그인되어 있을 때만 기록
      if (user) {
        recordRecentView();
      }
    }
  }, [id, fetchMeetupById, setCurrentMeetup, user]);

  // 사용자 밥알지수 로드
  React.useEffect(() => {
    const loadUserRiceIndex = async () => {
      try {
        const response = await apiClient.get('/user/rice-index');
        if (response.data && response.data.success) {
          setUserRiceIndex(response.data.riceIndex);
        }
      } catch (error) {
        // 밥알지수 로드 실패 - 무시
      }
    };

    if (user) {
      loadUserRiceIndex();
    }
  }, [user]);

  // 찜 상태 확인
  React.useEffect(() => {
    const checkWishlistStatus = async () => {
      if (currentMeetup && user) {
        try {
          const response = await apiClient.get(`/meetups/${currentMeetup.id}/wishlist`);
          if (response.data && response.data.success) {
            setIsWishlisted(response.data.data.isWishlisted);
          }
        } catch (error) {
          // 찜 상태 확인 실패 - 무시
        }
      }
    };

    checkWishlistStatus();
  }, [currentMeetup, user]);

  // 약속금 결제 상태 확인
  React.useEffect(() => {
    const checkDepositStatus = async () => {
      if (!currentMeetup || !user) {return;}
      const required = currentMeetup.promiseDepositRequired;
      const amount = currentMeetup.promiseDepositAmount || 0;
      setDepositAmountState(amount);

      if (!required || amount <= 0) {
        setDepositStatus(null);
        return;
      }

      try {
        const response = await apiClient.get(`/deposits/meetup/${currentMeetup.id}`);
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

  // 찜 토글 함수
  const toggleWishlist = async () => {
    if (!currentMeetup || !user || wishlistLoading) {return;}

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        // 찜 제거
        const response = await apiClient.delete(`/meetups/${currentMeetup.id}/wishlist`);
        if (response.data && response.data.success) {
          setIsWishlisted(false);
        }
      } else {
        // 찜 추가
        const response = await apiClient.post(`/meetups/${currentMeetup.id}/wishlist`);
        if (response.data && response.data.success) {
          setIsWishlisted(true);
        }
      }
    } catch (error) {
      // 찜 토글 실패 - 무시
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading || !currentMeetup) {
    return (
      <View style={styles.loadingContainer}>
        <View style={{ padding: 20, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          <MeetupCardSkeleton />
          <View style={{ height: 16 }} />
          <MeetupCardSkeleton />
        </View>
      </View>
    );
  }

  const meetup = currentMeetup;
  const participants = meetup.participants || [];
  const isHost = meetup.hostId === user?.id;

  // 모임 상태 확인 (지난 모임인지)
  const isPastMeetup = meetup.status === '완료' || meetup.status === '종료' ||
                      meetup.status === '취소' || meetup.status === '파토';

  // 현재 시간이 모임 시간을 지났는지 확인
  const now = new Date();
  const meetupDateTime = new Date(`${meetup.date} ${meetup.time}`);
  const isTimeExpired = now > meetupDateTime;

  // 참가 불가 사유 계산
  const getJoinDisabledReason = (): string | null => {
    if (!user) {return '로그인이 필요합니다';}
    if (!meetup) {return null;}

    // 인원 마감
    if (meetup.currentParticipants >= meetup.maxParticipants) {
      return '인원이 마감되었습니다';
    }

    // 성별 제한
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

  // 모임 참여하기
  const handleJoinMeetup = async () => {
    if (!user || !id || !canJoin) {return;}

    try {
      if (participants.some(p => p.id === user.id)) {
        setShowLeaveModal(true);
        return;
      }

      if (meetup?.promiseDepositRequired && meetup?.promiseDepositAmount > 0) {
        // 약속금이 필요한 모임 - 결제 페이지로 이동
        navigate(`/meetup/${id}/deposit-payment`);
      } else {
        // 무료 모임 - 바로 참가
        await joinMeetup(id, user.id);
        showSuccess('약속에 참여되었습니다!');
      }
    } catch (_error) {
      showError('약속 참여에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 모임 탈퇴 확인
  const handleConfirmLeave = async () => {
    if (!user || !id) {return;}

    try {
      const result = await leaveMeetup(id, user.id);
      setShowLeaveModal(false);

      // 호스트가 모임을 취소한 경우 홈으로 리다이렉트
      if (result?.isHostCancellation) {
        showInfo('약속이 취소되었습니다. 모든 참가자가 자동으로 나가게 됩니다.');
        navigate('/home');
      }
    } catch (error) {
      setShowLeaveModal(false);
    }
  };

  // 포인트 충분 여부 확인
  const checkUserPoints = async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/users/points');
      if (response.data && response.data.success) {
        const userPoints = response.data.data.points || 0;
        const requiredPoints = meetup.deposit || 3000; // 기본값 3000원
        return userPoints >= requiredPoints;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // 약속금 결제 완료 후 모임 참여
  const handleDepositPaid = async (depositId: string, amount: number) => {
    if (!user || !id) {
      return;
    }

    try {
      const result = await joinMeetup(id, user.id);

      if (amount > 0) {
        showSuccess('약속금 ' + amount.toLocaleString() + '원이 결제되었습니다! 약속에 참여되었습니다.');
      } else {
        showSuccess('약속에 참여되었습니다!');
      }
    } catch (error) {
      showError('약속 참여에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 채팅방으로 이동
  const handleGoToChat = async () => {
    if (!user || !id) {return;}

    try {
      // 모임 ID로 채팅방 ID 조회
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/chat/rooms/by-meetup/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data.chatRoomId) {
        // 채팅방 ID로 이동
        const chatRoomId = data.data.chatRoomId;
        navigate(`/chat/${chatRoomId}`);
      } else {
        showError('채팅방을 찾을 수 없습니다. 약속에 참여해주세요.');
      }
    } catch (error) {
      showError('채팅방 이동 중 오류가 발생했습니다.');
    }
  };

  // 모임 확정/취소 처리
  const handleMeetupAction = async () => {
    if (!user || !id) {return;}

    try {
      const action = meetup.status === 'confirmed' ? 'cancel' : 'confirm';
      const response = await apiClient.put(`/meetups/${id}/confirm`, {
        action: action
      });

      if (response.data.success) {
        // 모임 정보 새로고침
        await fetchMeetupById(id);
        setShowHostModal(false);

        const message = action === 'confirm' ? '약속이 확정되었습니다!' : '약속이 취소되었습니다.';
        showSuccess(message);
      } else {
        showError(response.data.error || '처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      showError('처리 중 오류가 발생했습니다.');
    }
  };

  // 보증금 결제 후 실제 참여 (기존 함수 유지)
  const handleConfirmJoin = async () => {
    if (!user || !id) {return;}

    try {
      // 포인트 확인
      const hasEnoughPoints = await checkUserPoints();

      const depositAmt = meetup.promiseDepositAmount || meetup.deposit || 3000;

      if (!hasEnoughPoints) {
        const confirmed = await confirm(
          '포인트 부족',
          `포인트가 부족합니다.\n필요한 포인트: ${depositAmt.toLocaleString()}원\n결제 페이지로 이동하시겠습니까?`
        );

        if (confirmed) {
          // 약속금 결제 화면으로 이동
          navigate(`/meetup/${id}/deposit-payment`);
          return;
        } else {
          setShowPromiseModal(false);
          return;
        }
      }

      // 포인트 사용 API 호출
      const usePointsResponse = await apiClient.post('/users/use-points', {
        amount: depositAmt,
        description: `약속 참여비: ${meetup.title}`
      });

      if (!usePointsResponse.data.success) {
        showError('포인트 사용 중 오류가 발생했습니다.');
        setShowPromiseModal(false);
        return;
      }

      // 모임 참여
      await joinMeetup(id, user.id);
      setShowPromiseModal(false);

      showSuccess('약속 참여가 완료되었습니다! 사용된 포인트: ' + depositAmt.toLocaleString() + '원');
    } catch (error) {
      showError('약속 참여 중 오류가 발생했습니다.');
      setShowPromiseModal(false);
    }
  };

  // 주소 복사
  const handleCopyAddress = () => {
    const addr = meetup.address || meetup.location || '';
    if (addr && navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(() => {
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
      });
    }
  };

  const participantRatio = (meetup.maxParticipants ?? 4) > 0
    ? (meetup.currentParticipants ?? 0) / (meetup.maxParticipants ?? 4)
    : 0;

  // 밥알 점수 계산
  const score = meetup.hostBabAlScore || userRiceIndex || 36.5;
  const scoreNum = typeof score === 'number' ? score : parseFloat(score) || 36.5;

  // 태그 목록 구성
  const tags: string[] = [];
  if (meetup.category) {tags.push(meetup.category);}
  if (meetup.ageRange && !['무관', '상관없음'].includes(meetup.ageRange)) {tags.push(meetup.ageRange);}
  if (meetup.genderPreference && !['무관', '상관없음', '혼성'].includes(meetup.genderPreference)) {tags.push(meetup.genderPreference);}
  if (meetup.priceRange) {tags.push(meetup.priceRange);}

  // 날짜 포매팅
  const formatMeetupDate = () => {
    if (!meetup.date) {return '날짜 미정';}
    try {
      const d = new Date(meetup.date);
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayOfWeek = dayNames[d.getDay()];
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const prefix = isToday ? '오늘' : `${month}/${day}`;
      return `${prefix} (${dayOfWeek})`;
    } catch {
      return meetup.date;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header - White bg, back arrow + centered title */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: 56,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid rgba(17,17,17,0.06)',
      }}>
        <div
          onClick={() => navigation.goBack()}
          style={{
            position: 'absolute',
            left: 16,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          role="button"
          aria-label="뒤로가기"
        >
          <Icon name="chevron-left" size={22} color="#121212" />
        </div>
        <span style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#121212',
          letterSpacing: -0.2,
        }}>
          {meetup.title || '모임 상세'}
        </span>
      </div>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <FadeIn>
        {/* Hero Image - full width, 180px height */}
        <div style={{
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
        </div>

        {/* Host Info Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            cursor: 'pointer',
          }}
          onClick={() => meetup.hostId && navigate(`/host-profile/${meetup.hostId}`)}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ProfileImage
              profileImage={meetup.host?.profileImage}
              name={meetup.host?.name || meetup.hostName}
              size={43}
            />
            <div>
              <span style={{ fontSize: 16, fontWeight: '600', color: '#000000', display: 'block' }}>
                {meetup.hostName || '익명'}
              </span>
              <span style={{ fontSize: 14, fontWeight: '400', color: '#868B94', display: 'block', marginTop: 2 }}>
                {meetup.location || '위치 미정'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: '600', color: '#000000' }}>
              {scoreNum} 밥알
            </span>
            <Icon name="star" size={16} color={COLORS.primary.main} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#F0F0F0', marginLeft: 20, marginRight: 20 }} />

        {/* Tags Row */}
        {tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            padding: '16px 20px',
          }}>
            {tags.map((tag, idx) => (
              <div key={idx} style={{
                backgroundColor: '#F3F5F7',
                borderRadius: 16,
                paddingTop: 3,
                paddingBottom: 3,
                paddingLeft: 8,
                paddingRight: 8,
              }}>
                <span style={{ fontSize: 12, fontWeight: '400', color: '#5F5F5F' }}>
                  {tag}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div style={{ padding: '4px 20px 16px 20px' }}>
          {/* Location row */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Icon name="map-pin" size={18} color="#5F5F5F" />
            <span style={{ fontSize: 16, fontWeight: '500', color: '#5F5F5F' }}>
              {meetup.location || '위치 미정'}
            </span>
          </div>
          {/* Date/time row */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Icon name="calendar" size={18} color="#5F5F5F" />
            <span style={{ fontSize: 16, fontWeight: '500', color: '#5F5F5F' }}>
              {formatMeetupDate()} {meetup.time ? `\u00B7 ${meetup.time}` : ''}
            </span>
          </div>
          {/* Participants row */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="users" size={18} color="#5F5F5F" />
            <span style={{ fontSize: 16, fontWeight: '500', color: '#5F5F5F' }}>
              {meetup.currentParticipants ?? 0}/{meetup.maxParticipants ?? 4}명
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#F0F0F0', marginLeft: 20, marginRight: 20 }} />

        {/* Description */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{
            fontSize: 16,
            fontWeight: '400',
            color: '#5F5F5F',
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {meetup.description || '설명이 없습니다.'}
          </p>
          <span style={{
            fontSize: 12,
            fontWeight: '400',
            color: '#868B94',
            display: 'block',
            marginTop: 12,
          }}>
            {meetup.createdAt ? getChatTimeDifference(meetup.createdAt) : '방금 전'} · 조회 {meetup.viewCount || 0}
          </span>
        </div>

        {/* 선택 성향 필터 뱃지 - DB 데이터 기반 */}
        {(() => {
          const pf = meetup.preferenceFilters;
          const dp = meetup.diningPreferences || {};
          const eatingSpeed = pf?.eatingSpeed || dp?.eatingSpeed;
          const conversation = pf?.conversationDuringMeal || dp?.conversationDuringMeal;
          const talkativeness = pf?.talkativeness || dp?.talkativeness;
          const mealPurpose = pf?.mealPurpose || dp?.mealPurpose;
          const specificRestaurant = pf?.specificRestaurant || dp?.specificRestaurant;
          const interests = pf?.interests || dp?.interests || [];
          const hasAny = eatingSpeed || conversation || talkativeness || mealPurpose || specificRestaurant || interests.length > 0;

          if (!hasAny) return null;

          const LABEL_MAP: Record<string, string> = {
            fast: '빠르게', slow: '천천히', moderate: '보통',
            quiet: '조용히', no_talk: '대화 없이', chatty: '수다스럽게',
            talkative: '수다쟁이', listener: '경청형',
            networking: '네트워킹', info_sharing: '정보 공유', hobby_friendship: '취미/친목', just_meal: '식사만',
          };
          const label = (val: string) => LABEL_MAP[val] || val;

          return (
            <div style={{ padding: '0 20px 16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {eatingSpeed && (
                  <div style={{ backgroundColor: '#F3F5F7', borderRadius: 16, padding: '3px 8px' }}>
                    <span style={{ fontSize: 12, color: '#5F5F5F' }}>{label(eatingSpeed)}</span>
                  </div>
                )}
                {conversation && (
                  <div style={{ backgroundColor: '#F3F5F7', borderRadius: 16, padding: '3px 8px' }}>
                    <span style={{ fontSize: 12, color: '#5F5F5F' }}>{label(conversation)}</span>
                  </div>
                )}
                {talkativeness && (
                  <div style={{ backgroundColor: '#F3F5F7', borderRadius: 16, padding: '3px 8px' }}>
                    <span style={{ fontSize: 12, color: '#5F5F5F' }}>{label(talkativeness)}</span>
                  </div>
                )}
                {mealPurpose && (
                  <div style={{ backgroundColor: '#F3F5F7', borderRadius: 16, padding: '3px 8px' }}>
                    <span style={{ fontSize: 12, color: '#5F5F5F' }}>{label(mealPurpose)}</span>
                  </div>
                )}
                {specificRestaurant && (
                  <div style={{ backgroundColor: '#F3F5F7', borderRadius: 16, padding: '3px 8px' }}>
                    <span style={{ fontSize: 12, color: '#5F5F5F' }}>{specificRestaurant}</span>
                  </div>
                )}
                {interests.map((interest: string, idx: number) => (
                  <div key={idx} style={{ backgroundColor: '#F3F5F7', borderRadius: 16, padding: '3px 8px' }}>
                    <span style={{ fontSize: 12, color: '#5F5F5F' }}>{interest}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 필터 정보 아코디언 */}
        <FilterAccordion
          diningPreferences={meetup.diningPreferences}
          promiseDepositRequired={meetup.promiseDepositRequired}
          promiseDepositAmount={meetup.promiseDepositAmount}
        />

        {/* Map Section */}
        <div style={{ padding: '8px 20px 0 20px' }}>
          {meetup.latitude && meetup.longitude ? (
            <KakaoMap
              location={meetup.location}
              address={meetup.address || meetup.location}
              latitude={meetup.latitude}
              longitude={meetup.longitude}
            />
          ) : (
            <div style={{
              width: '100%',
              height: 168,
              backgroundColor: '#F5F5F5',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 14, color: '#868B94' }}>지도 정보가 없습니다</span>
            </div>
          )}
        </div>

        {/* Address + Copy + Transit info */}
        <div style={{ padding: '12px 20px 16px 20px' }}>
          {/* Address row with copy button */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 16, fontWeight: '500', color: '#5F5F5F', flex: 1 }}>
              {meetup.location}{meetup.address ? ` (${meetup.address})` : ''}
            </span>
            <div
              onClick={handleCopyAddress}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                marginLeft: 12,
                flexShrink: 0,
              }}
              role="button"
              aria-label="주소 복사"
            >
              <Icon name="clipboard" size={14} color="#868B94" />
              <span style={{ fontSize: 14, color: '#868B94' }}>
                {addressCopied ? '복사됨' : '복사'}
              </span>
            </div>
          </div>

          {/* Transit info (if available) */}
          {meetup.nearbyStation && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
            }}>
              {meetup.subwayLines?.map((line: string, idx: number) => (
                <div key={idx} style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: idx === 0 ? '#3E519B' : '#3E9B4B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{line}</span>
                </div>
              ))}
              <span style={{ fontSize: 14, color: '#5F5F5F' }}>
                {meetup.nearbyStation}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#F0F0F0', marginLeft: 20, marginRight: 20 }} />

        {/* Participants Section */}
        <div style={{ padding: '20px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: '600', color: '#000000', display: 'block', marginBottom: 18 }}>
            참여 멤버
          </span>

          {/* Host */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 18,
          }}>
            <div style={{ marginRight: 12 }}>
              <ProfileImage
                profileImage={meetup.host?.profileImage}
                name={meetup.host?.name || meetup.hostName}
                size={40}
              />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: '400', color: '#000000', display: 'block' }}>
                {meetup.host?.name || meetup.hostName} (호스트)
              </span>
              <span style={{ fontSize: 14, fontWeight: '400', color: '#868B94', display: 'block', marginTop: 2 }}>
                호스트입니다
              </span>
            </div>
          </div>

          {/* Participants (excluding host) */}
          {participants.filter(participant => participant.id !== meetup.hostId).map((participant) => (
            <div
              key={participant.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <div style={{ marginRight: 12 }}>
                <ProfileImage
                  profileImage={participant.profileImage}
                  name={participant.name}
                  size={40}
                />
              </div>
              <div>
                <span style={{ fontSize: 16, fontWeight: '400', color: '#000000', display: 'block' }}>
                  {participant.name}
                </span>
                <span style={{ fontSize: 14, fontWeight: '400', color: '#868B94', display: 'block', marginTop: 2 }}>
                  {participant.status === 'approved' ? '참가승인' :
                   participant.status === 'pending' ? '참가신청' :
                   participant.status === 'rejected' ? '참가거절' : '참가취소'}
                </span>
              </div>
            </div>
          ))}

          {participants.filter(p => p.id !== meetup.hostId).length === 0 && (
            <span style={{
              fontSize: 14,
              color: '#868B94',
              display: 'block',
              textAlign: 'center',
              paddingTop: 8,
              paddingBottom: 8,
            }}>
              아직 참여자가 없습니다.
            </span>
          )}
        </div>

        {/* Bottom padding for fixed bottom bar */}
        <View style={{ height: 100 }} />
        </FadeIn>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        padding: '12px 20px',
        paddingBottom: 34,
        borderTop: '1px solid rgba(17,17,17,0.06)',
        boxShadow: CSS_SHADOWS.bottomSheet,
      }}>
        {isPastMeetup ? (
          /* 지난 모임인 경우 - 상태만 표시 */
          <div style={{
            backgroundColor: '#F5F5F5',
            borderRadius: 16,
            padding: '14px 20px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: '600', color: '#5F5F5F' }}>
              {meetup.status === '완료' || meetup.status === '종료' ?
                '완료된 약속이에요' :
                meetup.status === '취소' ?
                '취소된 약속이에요' :
                '파토된 약속이에요'
              }
            </span>
          </div>
        ) : (
          /* 진행중/예정 모임인 경우 */
          <>
            {(participants.some(p => p.id === user?.id) || isHost) ? (
              <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
                {/* 약속금 미결제 참가자: 결제 버튼 표시 */}
                {!isHost && meetup.promiseDepositRequired && depositAmountState > 0 && depositStatus !== 'paid' ? (
                  <>
                    <div
                      onClick={() => navigate(`/meetup/${id}/deposit-payment`)}
                      style={{
                        flex: 1,
                        backgroundColor: COLORS.special.deposit,
                        borderRadius: 16,
                        padding: '14px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      role="button"
                    >
                      <span style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                        {`약속금 ${(meetup.promiseDepositAmount || 3000).toLocaleString()}원 결제하기`}
                      </span>
                    </div>
                    <div
                      onClick={() => setShowLeaveModal(true)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: `1px solid ${COLORS.functional.error}`,
                        borderRadius: 16,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      role="button"
                    >
                      <span style={{ fontSize: 14, fontWeight: '600', color: COLORS.functional.error }}>참여취소</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 결제 완료 표시 */}
                    {!isHost && depositStatus === 'paid' && depositAmountState > 0 && (
                      <div style={{
                        backgroundColor: COLORS.functional.successLight,
                        borderRadius: 8,
                        padding: '4px 10px',
                        alignSelf: 'center',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: '600', color: COLORS.functional.success }}>약속금 결제완료</span>
                      </div>
                    )}
                    {/* 채팅방 가기 버튼 */}
                    <div
                      onClick={() => handleGoToChat()}
                      style={{
                        flex: 2,
                        backgroundColor: COLORS.primary.main,
                        borderRadius: 16,
                        padding: '14px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      role="button"
                    >
                      <span style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>채팅방</span>
                    </div>

                    {/* 호스트 전용 버튼들 */}
                    {isHost && (
                      <div
                        onClick={() => setShowHostModal(true)}
                        style={{
                          flex: 1,
                          backgroundColor: COLORS.functional.success,
                          borderRadius: 16,
                          padding: '14px 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        role="button"
                      >
                        <span style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                          {meetup.status === 'confirmed' ? '약속취소' : '약속확정'}
                        </span>
                      </div>
                    )}

                    {/* 참가자 탈퇴 버튼 */}
                    {!isHost && (
                      <div
                        onClick={() => setShowLeaveModal(true)}
                        style={{
                          flex: 1,
                          backgroundColor: '#FFFFFF',
                          border: `1px solid ${COLORS.functional.error}`,
                          borderRadius: 16,
                          padding: '14px 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        role="button"
                      >
                        <span style={{ fontSize: 14, fontWeight: '600', color: COLORS.functional.error }}>참여취소</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* 미참여자 - Heart + 같이먹기 버튼 */
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* Heart/Wishlist */}
                <div
                  onClick={toggleWishlist}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  role="button"
                  aria-label={isWishlisted ? '찜 해제' : '찜하기'}
                >
                  <Heart
                    size={24}
                    color={isWishlisted ? COLORS.functional.error : '#868B94'}
                    fill={isWishlisted ? COLORS.functional.error : 'transparent'}
                  />
                  <span style={{ fontSize: 11, color: '#868B94', marginTop: 2 }}>
                    {meetup.wishlistCount || 0}
                  </span>
                </div>

                {/* 같이먹기 CTA */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {joinDisabledReason && (
                    <span style={{
                      fontSize: 13,
                      color: COLORS.functional.error,
                      textAlign: 'center',
                      fontWeight: '600',
                    }}>{joinDisabledReason}</span>
                  )}
                  <div
                    onClick={() => canJoin && handleJoinMeetup()}
                    onMouseEnter={(e) => {
                      if (!canJoin) {return;}
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = CSS_SHADOWS.hover;
                    }}
                    onMouseLeave={(e) => {
                      if (!canJoin) {return;}
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = canJoin ? CSS_SHADOWS.cta : 'none';
                    }}
                    style={{
                      backgroundColor: canJoin ? '#FFA529' : COLORS.neutral.grey300,
                      borderRadius: 16,
                      height: 52,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canJoin ? 'pointer' : 'not-allowed',
                      boxShadow: canJoin ? CSS_SHADOWS.cta : 'none',
                      transition: 'all 200ms ease',
                      opacity: canJoin ? 1 : 0.7,
                    }}
                    role="button"
                    aria-label={canJoin ? '같이먹기' : joinDisabledReason || '참가 불가'}
                    aria-disabled={!canJoin}
                  >
                    <span style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#FFFFFF',
                    }}>{canJoin ? '같이먹기' : joinDisabledReason}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 약속보증금 모달 */}
      {showPromiseModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>서로의 신뢰를 위해{'\n'}약속금을 미리 걸어두요</Text>
            <Text style={styles.modalDescription}>
              노쇼 방지 약속금이며, 1일 이내에 다시 입금됩니다.
            </Text>
            <View style={styles.modalAmountContainer}>
              <Text style={styles.modalAmount}>{`약속금 ${(meetup.promiseDepositAmount || 3000).toLocaleString()}원`}</Text>
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
      )}

      {/* 참여 취소 확인 모달 */}
      {showLeaveModal && (
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
      )}

      {/* 호스트 모달 (모임 확정/취소) */}
      {showHostModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {meetup.status === 'confirmed' ? '약속을 취소하시겠어요?' : '약속을 확정하시겠어요?'}
            </Text>
            <Text style={styles.modalDescription}>
              {meetup.status === 'confirmed' ?
                '확정된 약속을 취소하면 취소 시점에 따라\n참가자들에게 부분 환불됩니다.' :
                `현재 ${participants.length}명이 참여중입니다.\n약속을 확정하면 취소 시 패널티가 적용됩니다.`
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
      )}

      {/* 약속금 결제 모달 */}
      <DepositSelector
        visible={showDepositSelector}
        onClose={() => setShowDepositSelector(false)}
        onDepositPaid={handleDepositPaid}
        meetupId={id || currentMeetup?.id || ''}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ConfirmDialog {...dialog} onConfirm={dialog.onConfirm} onCancel={dialog.onCancel} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  // Map section
  mapSection: {
    // No padding here - parent div handles it
  },
  // Modal styles
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.large,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.large,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: '#121212',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#5F5F5F',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalAmountContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAmount: {
    fontSize: 26,
    fontWeight: '700',
    color: '#121212',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  modalPayButton: {
    flex: 1,
    backgroundColor: '#FFA529',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalPayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalLeaveButton: {
    flex: 1,
    backgroundColor: COLORS.functional.error,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalLeaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalHostCancelButton: {
    backgroundColor: COLORS.functional.error,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.functional.success,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Accordion styles
  accordionContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  accordionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121212',
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 8,
  },
  filterItem: {
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5F5F5F',
  },
  filterDescription: {
    fontSize: 11,
    color: '#868B94',
    marginTop: 2,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#FFA52920',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: 12,
    color: '#FFA529',
    fontWeight: '500',
  },
});

export default MeetupDetailScreen;
