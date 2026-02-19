import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS, SHADOWS, CARD_STYLE, CSS_SHADOWS, LAYOUT, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../styles';
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
      <Text style={styles.mapLabel}>지도</Text>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: COLORS.neutral.background,
          borderRadius: BORDER_RADIUS.lg,
          marginBottom: 12,
          display: mapError ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.text.secondary,
          fontSize: '14px'
        }}
      >
        {!mapLoaded && !mapError && '지도를 불러오는 중...'}
        {mapError && mapError}
      </div>
      <Text style={styles.mapLocationText}>{location}</Text>
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
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const { dialog, confirm, confirmDanger, hideDialog } = useConfirmDialog();

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

  // 모임 참여하기
  const handleJoinMeetup = async () => {
    if (!user || !id) {return;}

    try {
      if (participants.some(p => p.id === user.id)) {
        // 이미 참여중이면 탈퇴 확인 모달 표시
        setShowLeaveModal(true);
      } else {
        // 참여하기 - 약속금 결제 모달 표시
        setShowDepositSelector(true);
      }
    } catch (error) {
      // 모임 참여/탈퇴 실패 - 무시
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
        showInfo('모임이 취소되었습니다. 모든 참가자가 자동으로 나가게 됩니다.');
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
      // 실제 모임 참여 처리
      await joinMeetup(id, user.id);

      showSuccess('약속금 ' + amount.toLocaleString() + '원이 결제되었습니다! 모임에 참여되었습니다.');
    } catch (error) {
      showError('모임 참여에 실패했습니다. 다시 시도해주세요.');
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
        showError('채팅방을 찾을 수 없습니다. 모임에 참여해주세요.');
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

        const message = action === 'confirm' ? '모임이 확정되었습니다!' : '모임이 취소되었습니다.';
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

      if (!hasEnoughPoints) {
        const requiredPoints = meetup.deposit || 3000;
        const confirmed = await confirm(
          '포인트 부족',
          `포인트가 부족합니다.\n필요한 포인트: ${requiredPoints.toLocaleString()}원\n충전 페이지로 이동하시겠습니까?`
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
        amount: meetup.deposit || 3000,
        description: `모임 참여비: ${meetup.title}`
      });

      if (!usePointsResponse.data.success) {
        showError('포인트 사용 중 오류가 발생했습니다.');
        setShowPromiseModal(false);
        return;
      }

      // 모임 참여
      await joinMeetup(id, user.id);
      setShowPromiseModal(false);

      showSuccess('모임 참여가 완료되었습니다! 사용된 포인트: ' + (meetup.deposit || 3000).toLocaleString() + '원');
    } catch (error) {
      showError('모임 참여 중 오류가 발생했습니다.');
      setShowPromiseModal(false);
    }
  };

  const participantRatio = (meetup.maxParticipants ?? 4) > 0
    ? (meetup.currentParticipants ?? 0) / (meetup.maxParticipants ?? 4)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <FadeIn>
        {/* 히어로 이미지 섹션 */}
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
          {/* 그라데이션 오버레이 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 100,
            background: 'linear-gradient(180deg, rgba(17,17,17,0.4) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
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
            <div
              onClick={() => navigation.goBack()}
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
              aria-label="뒤로가기"
            >
              <Icon name="chevron-left" size={20} color={COLORS.text.primary} />
            </div>
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
          {/* 이미지 위 상태 뱃지 */}
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
                backgroundColor: meetup.status === 'recruiting' ? COLORS.functional.success
                  : meetup.status === 'confirmed' ? COLORS.primary.main
                  : COLORS.neutral.grey500,
              }}>
                <span style={{ fontSize: 12, fontWeight: '700', color: COLORS.neutral.white }}>
                  {meetup.status === 'recruiting' ? '모집중' : meetup.status === 'confirmed' ? '모집완료' : meetup.status}
                </span>
              </div>
              {meetup.promiseDepositAmount ? (
                <div style={{
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 5,
                  paddingBottom: 5,
                  borderRadius: BORDER_RADIUS.sm,
                  backgroundColor: 'rgba(61,139,94,0.9)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: '700', color: COLORS.neutral.white }}>
                    보증금 {meetup.promiseDepositAmount.toLocaleString()}원
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 호스트 정보 카드 */}
        <div style={{
          marginLeft: SPACING.xl,
          marginRight: SPACING.xl,
          marginTop: -32,
          position: 'relative',
          zIndex: 2,
          backgroundColor: COLORS.neutral.white,
          borderRadius: BORDER_RADIUS.lg,
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
          <div style={{
            background: COLORS.gradient.subtleGold,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 6,
            paddingBottom: 6,
            borderRadius: BORDER_RADIUS.md,
            border: `1px solid ${CARD_STYLE.borderColor}`,
          }}>
            <Text style={styles.riceText}>{meetup.hostBabAlScore || userRiceIndex} 밥알</Text>
          </div>
        </div>

        {/* 메인 카드 */}
        <View style={styles.mainCard}>
          <Text style={styles.meetupTitle}>{meetup.title || '제목 없음'}</Text>

          {/* 필수 성향 필터 뱃지 */}
          <View style={styles.filterBadgeContainer}>
            <Text style={styles.filterBadgeTitle}>필수 성향</Text>
            <View style={styles.filterBadges}>
              {/* 카테고리 뱃지 */}
              {meetup.category && (
                <View style={[styles.filterBadge, { backgroundColor: getCategoryColor(meetup.category) + '20' }]}>
                  <Icon name={getCategoryIcon(meetup.category)} size={14} color={getCategoryColor(meetup.category)} />
                  <Text style={[styles.filterBadgeText, { color: getCategoryColor(meetup.category) }]}>
                    {meetup.category}
                  </Text>
                </View>
              )}

              {/* 가격대 뱃지 */}
              {meetup.priceRange && (
                <View style={styles.priceBadge}>
                  <Icon name="dollar-sign" size={14} color={COLORS.functional.success} />
                  <Text style={styles.priceBadgeText}>{meetup.priceRange}</Text>
                </View>
              )}

              {/* 연령대 필터 - API 데이터가 있을 때만 표시 */}
              {meetup.ageRange && (
                <View style={styles.ageBadge}>
                  <Icon name="user" size={14} color={COLORS.text.secondary} />
                  <Text style={styles.ageBadgeText}>{meetup.ageRange}</Text>
                </View>
              )}

              {/* 성별 필터 - API 데이터가 있을 때만 표시 */}
              {meetup.genderPreference && (
                <View style={styles.genderBadge}>
                  <Icon name="users" size={14} color={COLORS.primary.accent} />
                  <Text style={styles.genderBadgeText}>{meetup.genderPreference}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 선택 성향 필터 뱃지 */}
          <View style={styles.filterBadgeContainer}>
            <Text style={styles.filterBadgeTitle}>선택 성향</Text>
            <View style={styles.filterBadges}>
              {/* 기분 조건 */}
              <View style={styles.optionalBadge}>
                <Icon name="smile" size={14} color={COLORS.primary.accent} />
                <Text style={styles.optionalBadgeText}>분위기 좋은 곳</Text>
              </View>

              {/* 위치 조건 */}
              <View style={styles.optionalBadge}>
                <Icon name="map" size={14} color={COLORS.functional.warning} />
                <Text style={styles.optionalBadgeText}>역 근처</Text>
              </View>

              {/* 시간 조건 */}
              <View style={styles.optionalBadge}>
                <Icon name="clock" size={14} color={COLORS.text.secondary} />
                <Text style={styles.optionalBadgeText}>1-2시간</Text>
              </View>

              {/* 음료 조건 */}
              <View style={styles.optionalBadge}>
                <Icon name="coffee" size={14} color={COLORS.primary.main} />
                <Text style={styles.optionalBadgeText}>무알코올</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Icon name="map-pin" size={16} color={COLORS.text.secondary} />
              <Text style={styles.infoLabel}>{meetup.location}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="clock" size={16} color={COLORS.text.secondary} />
              <Text style={styles.infoLabel}>{meetup.date || '날짜 미정'} {meetup.time || ''}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="users" size={16} color={COLORS.primary.accent} />
              <Text style={[styles.infoLabel, { color: COLORS.primary.accent, fontWeight: '700' }]}>
                {meetup.currentParticipants ?? 0}/{meetup.maxParticipants ?? 4}명
              </Text>
            </View>
            {/* 참가자 프로그레스 바 */}
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
                background: participantRatio >= 1
                  ? COLORS.functional.error
                  : participantRatio > 0.7
                    ? COLORS.functional.warning
                    : COLORS.gradient.ctaCSS,
                transition: 'width 600ms ease',
              }} />
            </div>
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

        {/* 필터 정보 아코디언 */}
        <FilterAccordion
          diningPreferences={meetup.diningPreferences}
          promiseDepositRequired={meetup.promiseDepositRequired}
          promiseDepositAmount={meetup.promiseDepositAmount}
        />

        {/* 지도 섹션 — 좌표가 있을 때만 지도 표시 */}
        {meetup.latitude && meetup.longitude ? (
          <KakaoMap
            location={meetup.location}
            address={meetup.address || meetup.location}
            latitude={meetup.latitude}
            longitude={meetup.longitude}
          />
        ) : (
          <View style={styles.mapSection}>
            <Text style={styles.mapLabel}>위치</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 16,
              backgroundColor: COLORS.neutral.background,
              borderRadius: BORDER_RADIUS.lg,
            }}>
              <Icon name="map-pin" size={18} color={COLORS.primary.accent} />
              <Text style={{ fontSize: 15, color: COLORS.text.primary, flex: 1 }}>
                {meetup.address || meetup.location || '위치 미정'}
              </Text>
            </View>
          </View>
        )}

        {/* 참여자 섹션 */}
        <View style={styles.participantSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.participantTitle}>참여자</Text>
            <div style={{
              paddingLeft: 10,
              paddingRight: 10,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: BORDER_RADIUS.md,
              backgroundColor: COLORS.primary.light,
              border: `1px solid ${CARD_STYLE.borderColor}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary.main }}>
                {participants.filter(p => p.id !== meetup.hostId).length + 1}/{meetup.maxParticipants ?? 4}명
              </span>
            </div>
          </View>

          {/* 호스트 */}
          <View style={styles.participantItem}>
            <View style={styles.hostAvatar}>
              <ProfileImage
                profileImage={meetup.host?.profileImage}
                name={meetup.host?.name || meetup.hostName}
                size={48}
              />
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{meetup.host?.name || meetup.hostName} (호스트)</Text>
              <Text style={styles.participantRole}>호스트입니다</Text>
            </View>
          </View>

          {/* 참여자들 (호스트 제외) */}
          {participants.filter(participant => participant.id !== meetup.hostId).map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <ProfileImage
                  profileImage={participant.profileImage}
                  name={participant.name}
                  size={48}
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

        {/* 하단 여백 */}
        <View style={styles.bottomPadding} />
        </FadeIn>
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.fixedBottom}>
        {isPastMeetup ? (
          /* 지난 모임인 경우 - 상태만 표시 */
          <View style={styles.pastMeetupContainer}>
            <Text style={styles.pastMeetupText}>
              {meetup.status === '완료' || meetup.status === '종료' ?
                '완료된 모임이에요' :
                meetup.status === '취소' ?
                '취소된 모임이에요' :
                '파토된 모임이에요'
              }
            </Text>
          </View>
        ) : (
          /* 진행중/예정 모임인 경우 - 기존 버튼들 */
          <>
            {(participants.some(p => p.id === user?.id) || isHost) ? (
              <View style={styles.bottomButtonContainer}>
                {/* 채팅방 가기 버튼 */}
                <TouchableOpacity
                  onPress={() => handleGoToChat()}
                  style={styles.chatButton}
                >
                  <Text style={styles.chatButtonText}>채팅방</Text>
                </TouchableOpacity>

                {/* 호스트 전용 버튼들 */}
                {isHost && (
                  <TouchableOpacity
                    onPress={() => setShowHostModal(true)}
                    style={styles.hostButton}
                  >
                    <Text style={styles.hostButtonText}>
                      {meetup.status === 'confirmed' ? '모임취소' : '모임확정'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 참가자 탈퇴 버튼 — outlined style */}
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
              /* 미참여자 - 참여하기 버튼 (테라코타 CTA) */
              <div
                onClick={() => handleJoinMeetup()}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = CSS_SHADOWS.hover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = CSS_SHADOWS.cta;
                }}
                style={{
                  background: COLORS.gradient.ctaCSS,
                  borderRadius: BORDER_RADIUS.md,
                  paddingTop: 16,
                  paddingBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: CSS_SHADOWS.cta,
                  transition: 'all 200ms ease',
                }}
                role="button"
                aria-label="같이먹기"
              >
                <span style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: COLORS.neutral.white,
                  letterSpacing: 0.5,
                }}>같이먹기</span>
              </div>
            )}
          </>
        )}
      </View>

      {/* 약속보증금 모달 */}
      {showPromiseModal && (
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
      )}

      {/* 참여 취소 확인 모달 */}
      {showLeaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {isHost ? '모임을 취소하시겠어요?' : '모임에서 나가시겠어요?'}
            </Text>
            <Text style={styles.modalDescription}>
              {isHost ?
                '모임을 취소하면 모든 참가자가 나가게 되고,\n채팅방도 삭제됩니다. 취소하시겠어요?' :
                '모임을 나가면 채팅방에서도 나가게 되며,\n다시 참여하려면 새로 신청해야 해요.'
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
                  {isHost ? '모임취소' : '나가기'}
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
              {meetup.status === 'confirmed' ? '모임을 취소하시겠어요?' : '모임을 확정하시겠어요?'}
            </Text>
            <Text style={styles.modalDescription}>
              {meetup.status === 'confirmed' ?
                '확정된 모임을 취소하면 취소 시점에 따라\n참가자들에게 부분 환불됩니다.' :
                `현재 ${participants.length}명이 참여중입니다.\n모임을 확정하면 취소 시 패널티가 적용됩니다.`
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
                  {meetup.status === 'confirmed' ? '모임취소' : '모임확정'}
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
    backgroundColor: COLORS.neutral.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
  },
  loadingText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
    ...SHADOWS.sticky,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.stickyHeader,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.text.primary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 18,
  },
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostName: {
    ...TYPOGRAPHY.heading.h3,
    fontWeight: '700',
  },
  hostLocation: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
  },
  riceIndicator: {
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  riceText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  mainCard: {
    backgroundColor: COLORS.surface.primary,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.medium,
  },
  meetupTitle: {
    ...TYPOGRAPHY.heading.h1,
    marginBottom: SPACING.xl,
  },
  infoGrid: {
    marginBottom: SPACING.xl,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoDetails: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.tertiary,
  },
  description: {
    ...TYPOGRAPHY.body.large,
    marginBottom: SPACING.lg,
  },
  timeInfo: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
  },
  timeText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
  },
  mapSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  mapLabel: {
    ...TYPOGRAPHY.sectionHeader.title,
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    marginRight: 12,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.neutral.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationEmoji: {
    fontSize: 24,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '500',
    marginBottom: 8,
  },
  openMapButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.functional.info,
    borderRadius: BORDER_RADIUS.md,
  },
  openMapText: {
    ...TYPOGRAPHY.button.small,
    color: COLORS.neutral.white,
  },
  mapLocationText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  mapTitle: {
    ...TYPOGRAPHY.sectionHeader.title,
    marginBottom: 16,
    textAlign: 'center',
  },
  mapLocationInfo: {

  },
  mapLocationLabel: {
    ...TYPOGRAPHY.body.medium,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subwayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subwayLine1: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.functional.info,
  },
  subwayLine2: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.functional.success,
  },
  subwayText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  participantSection: {
    backgroundColor: COLORS.surface.primary,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.medium,
  },
  participantTitle: {
    ...TYPOGRAPHY.sectionHeader.title,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  hostAvatar: {
    marginRight: 12,
  },
  participantAvatar: {
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  participantRole: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  bottomPadding: {
    height: 100,
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: CARD_STYLE.borderColor,
    ...SHADOWS.sticky,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.bottomSheet,
  },
  joinButton: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  joinButtonText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.neutral.white,
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.large,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.h2,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  modalAmountContainer: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalAmount: {
    ...TYPOGRAPHY.heading.h1,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.text.primary,
  },
  modalPayButton: {
    flex: 1,
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalPayText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.neutral.white,
  },
  noParticipants: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontStyle: 'italic',
  },
  modalLeaveButton: {
    flex: 1,
    backgroundColor: COLORS.functional.error,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalLeaveText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.neutral.white,
  },
  modalHostCancelButton: {
    backgroundColor: COLORS.functional.error,
  },
  // 하단 버튼 관련 스타일
  bottomButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 2,
    backgroundColor: COLORS.primary.main,
    paddingVertical: 16,
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
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  hostButtonText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.neutral.white,
  },
  leaveButton: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
    paddingVertical: 16,
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
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.functional.success,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalConfirmText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.text.white,
  },
  pastMeetupContainer: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  pastMeetupText: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  // 필터 뱃지 스타일
  filterBadgeContainer: {
    marginBottom: SPACING.xl,
  },
  filterBadgeTitle: {
    ...TYPOGRAPHY.sectionHeader.title,
    marginBottom: 12,
  },
  filterBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
  },
  filterBadgeText: {
    ...TYPOGRAPHY.body.small,
    fontWeight: '700',
  },
  categoryEmoji: {
    fontSize: 14,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.functional.success + '20',
    gap: 6,
  },
  priceBadgeText: {
    ...TYPOGRAPHY.body.small,
    fontWeight: '700',
    color: COLORS.functional.success,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.text.secondary + '20',
    gap: 6,
  },
  ageBadgeText: {
    ...TYPOGRAPHY.body.small,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary.accent + '20',
    gap: 6,
  },
  genderBadgeText: {
    ...TYPOGRAPHY.body.small,
    fontWeight: '700',
    color: COLORS.primary.accent,
  },
  optionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.background,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    gap: 6,
  },
  optionalBadgeText: {
    ...TYPOGRAPHY.body.small,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  // 아코디언 스타일
  accordionContainer: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.background,
  },
  accordionTitle: {
    ...TYPOGRAPHY.heading.h3,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: COLORS.surface.primary,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY.body.medium,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  filterItem: {
    marginBottom: SPACING.xs,
  },
  filterValue: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: COLORS.primary.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  interestTagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary.accent,
    fontWeight: '500',
  },
});

export default MeetupDetailScreen;
