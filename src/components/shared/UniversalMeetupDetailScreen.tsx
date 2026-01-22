import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal as RNModal, Platform } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { useUserStore } from '../../store/userStore';
import { useMeetupStore } from '../../store/meetupStore';
import apiClient from '../../services/apiClient';
import { getChatTimeDifference } from '../../utils/timeUtils';
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

const getCategoryEmoji = (categoryName: string) => {
  const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
  return category ? category.emoji : '🍴';
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
          size={20} 
          color={COLORS.text.secondary} 
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
    console.log('🔍 MeetupDetailScreen meetupId:', meetupId);
    if (meetupId) {
      setCurrentMeetup(null);
      fetchMeetupById(meetupId);
      
      const recordRecentView = async () => {
        try {
          await apiClient.post('/meetups/' + meetupId + '/view');
          console.log('✅ 최근 본 글 기록 완료');
        } catch (error) {
          console.error('❌ 최근 본 글 기록 실패:', error);
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
      } catch (error) {
        console.error('밥알지수 로드 실패:', error);
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
        } catch (error) {
          console.error('찜 상태 확인 실패:', error);
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
          console.log('✅ 찜 제거 성공');
        }
      } else {
        const response = await apiClient.post('/meetups/' + currentMeetup.id + '/wishlist');
        if (response.data && response.data.success) {
          setIsWishlisted(true);
          console.log('✅ 찜 추가 성공');
        }
      }
    } catch (error) {
      console.error('찜 토글 실패:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading || !currentMeetup) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
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

  const handleJoinMeetup = async () => {
    if (!user || !meetupId) {return;}
    
    try {
      if (participants.some(p => p.id === user.id)) {
        setShowLeaveModal(true);
      } else {
        if (DepositSelectorComponent) {
          setShowDepositSelector(true);
        } else {
          setShowPromiseModal(true);
        }
      }
    } catch (error) {
      console.error('모임 참여/탈퇴 실패:', error);
    }
  };

  const handleConfirmLeave = async () => {
    if (!user || !meetupId) {return;}
    
    try {
      const result = await leaveMeetup(meetupId, user.id);
      setShowLeaveModal(false);
      
      if (result?.isHostCancellation) {
        Alert.alert('알림', '모임이 취소되었습니다. 모든 참가자가 자동으로 나가게 됩니다.', [
          { text: '확인', onPress: () => navigation.navigate('Home') }
        ]);
      }
    } catch (error) {
      console.error('모임 탈퇴 실패:', error);
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
    } catch (error) {
      console.error('포인트 조회 실패:', error);
      return false;
    }
  };

  const handleDepositPaid = async (depositId: string, amount: number) => {
    console.log('💰 handleDepositPaid 호출됨:', { depositId, amount, meetupId, userId: user?.id });
    if (!user || !meetupId) {
      console.error('❌ handleDepositPaid: user 또는 id가 없음:', { user: !!user, meetupId });
      return;
    }
    
    try {
      console.log('약속금 결제 완료:', { depositId, amount, meetupId });
      await joinMeetup(meetupId, user.id);
      
      Alert.alert('성공', '약속금 ' + amount.toLocaleString() + '원이 결제되었습니다! 모임에 참여되었습니다.');
    } catch (error) {
      console.error('모임 참여 실패:', error);
      Alert.alert('오류', '모임 참여에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleGoToChat = async () => {
    if (!user || !meetupId) {return;}

    try {
      console.log('🔍 모임 채팅방 조회 시작:', { meetupId });
      
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
      console.log('📡 채팅방 조회 응답:', data);

      if (data.success && data.data.chatRoomId) {
        const chatRoomId = data.data.chatRoomId;
        navigation.navigate('Chat', { chatRoomId });
        console.log('✅ 채팅방 이동 성공:', { meetupId, chatRoomId });
      } else {
        console.error('❌ 채팅방 조회 실패:', data.error);
        Alert.alert('오류', '채팅방을 찾을 수 없습니다. 모임에 참여해주세요.');
      }
    } catch (error) {
      console.error('❌ 채팅방 이동 오류:', error);
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

        const message = action === 'confirm' ? '모임이 확정되었습니다!' : '모임이 취소되었습니다.';
        Alert.alert('성공', message);
      } else {
        Alert.alert('오류', response.data.error || '처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('모임 확정/취소 실패:', error);
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
          ? '모임이 시작되었습니다! 참가자들이 GPS 체크인할 수 있어요.'
          : '모임이 종료되었습니다! 참가자들이 리뷰를 작성할 수 있어요.';
        Alert.alert('성공', message);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '상태 변경 중 오류가 발생했습니다.';
      Alert.alert('오류', errorMessage);
    } finally {
      setStatusChangeLoading(false);
    }
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
                navigation.navigate('DepositPayment', { meetupId });
              }
            }
          ]
        );
        return;
      }

      const usePointsResponse = await apiClient.post('/users/use-points', {
        amount: meetup.deposit || 3000,
        description: '모임 참여비: ' + meetup.title
      });

      if (!usePointsResponse.data.success) {
        Alert.alert('오류', '포인트 사용 중 오류가 발생했습니다.');
        setShowPromiseModal(false);
        return;
      }

      await joinMeetup(meetupId, user.id);
      setShowPromiseModal(false);
      
      Alert.alert('성공', '모임 참여가 완료되었습니다!\n사용된 포인트: ' + (meetup.deposit || 3000).toLocaleString() + '원');
    } catch (error) {
      console.error('모임 참여 실패:', error);
      Alert.alert('오류', '모임 참여 중 오류가 발생했습니다.');
      setShowPromiseModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={toggleWishlist}
            disabled={wishlistLoading}
          >
            {Platform.OS === 'web' ? (
              <Heart 
                size={22} 
                color={isWishlisted ? '#E74C3C' : COLORS.text.secondary} 
                fill={isWishlisted ? '#E74C3C' : 'transparent'}
              />
            ) : (
              <Text style={{ fontSize: 20 }}>{isWishlisted ? '❤️' : '🤍'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.hostSection}>
          <View style={styles.hostInfo}>
            <ProfileImage
              profileImage={meetup.host?.profileImage}
              name={meetup.host?.name || meetup.hostName}
              size={60}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.hostName}>{meetup.hostName || '익명'}</Text>
              <Text style={styles.hostLocation}>{meetup.location || '위치 미정'}</Text>
            </View>
          </View>
          <View style={styles.riceIndicator}>
            <Text style={styles.riceText}>{meetup.hostBabAlScore || userRiceIndex} 밥알 🍚</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.meetupTitle}>{meetup.title || '급한 때실 시밥'}</Text>
          
          <View style={styles.filterBadgeContainer}>
            <Text style={styles.filterBadgeTitle}>필수 성향</Text>
            <View style={styles.filterBadges}>
              {meetup.category && (
                <View style={[styles.filterBadge, { backgroundColor: getCategoryColor(meetup.category) + '20' }]}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(meetup.category)}</Text>
                  <Text style={[styles.filterBadgeText, { color: getCategoryColor(meetup.category) }]}>
                    {meetup.category}
                  </Text>
                </View>
              )}
              
              {meetup.priceRange && (
                <View style={styles.priceBadge}>
                  <Icon name="dollar-sign" size={14} color={COLORS.functional.success} />
                  <Text style={styles.priceBadgeText}>{meetup.priceRange}</Text>
                </View>
              )}
              
              {meetup.ageRange && (
                <View style={styles.ageBadge}>
                  <Icon name="user" size={14} color={COLORS.text.secondary} />
                  <Text style={styles.ageBadgeText}>{meetup.ageRange}</Text>
                </View>
              )}
              
              {meetup.genderPreference && (
                <View style={styles.genderBadge}>
                  <Icon name="users" size={14} color={COLORS.primary.main} />
                  <Text style={styles.genderBadgeText}>{meetup.genderPreference}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.filterBadgeContainer}>
            <Text style={styles.filterBadgeTitle}>선택 성향</Text>
            <View style={styles.filterBadges}>
              <View style={styles.optionalBadge}>
                <Icon name="smile" size={14} color={COLORS.primary.main} />
                <Text style={styles.optionalBadgeText}>분위기 좋은 곳</Text>
              </View>
              
              <View style={styles.optionalBadge}>
                <Icon name="map" size={14} color={COLORS.functional.warning} />
                <Text style={styles.optionalBadgeText}>역 근처</Text>
              </View>
              
              <View style={styles.optionalBadge}>
                <Icon name="clock" size={14} color={COLORS.text.secondary} />
                <Text style={styles.optionalBadgeText}>1-2시간</Text>
              </View>
              
              <View style={styles.optionalBadge}>
                <Icon name="coffee" size={14} color="#8B4513" />
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
              <Text style={styles.infoLabel}>{meetup.date} {meetup.time}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Icon name="users" size={16} color={COLORS.text.secondary} />
              <Text style={styles.infoLabel}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
            </View>
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
                size={48}
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

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.fixedBottom}>
        {meetup.status === '종료' && (participants.some(p => p.id === user?.id) || isHost) ? (
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('WriteReview', { meetupId, meetupTitle: meetup.title })}
              style={styles.reviewButton}
            >
              <Icon name="star" size={20} color={COLORS.neutral.white} />
              <Text style={styles.reviewButtonText}>리뷰 작성하기</Text>
            </TouchableOpacity>
          </View>
        ) : isPastMeetup ? (
          <View style={styles.pastMeetupContainer}>
            <Text style={styles.pastMeetupText}>
              {meetup.status === '완료' ?
                '✅ 완료된 모임이에요' :
                meetup.status === '취소' ?
                '❌ 취소된 모임이에요' :
                '💥 파토된 모임이에요'
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
                  <Text style={styles.chatButtonText}>💬 채팅방</Text>
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
                       meetup.status === '모집중' || meetup.status === '모집완료' ? '모임시작' :
                       meetup.status === '진행중' ? '모임종료' : '모임확정'}
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
              <TouchableOpacity
                onPress={() => handleJoinMeetup()}
                style={styles.joinButton}
              >
                <Text style={styles.joinButtonText}>같이먹기</Text>
              </TouchableOpacity>
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
              {meetup.status === 'confirmed' ? '모임을 취소하시겠어요?' : '모임을 확정하시겠어요?'}
            </Text>
            <Text style={styles.modalDescription}>
              {meetup.status === 'confirmed' ? 
                '확정된 모임을 취소하면 취소 시점에 따라\n참가자들에게 부분 환불됩니다.' :
                '현재 ' + participants.length + '명이 참여중입니다.\n모임을 확정하면 취소 시 패널티가 적용됩니다.'
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
    backgroundColor: COLORS.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: COLORS.neutral.white,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  hostSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  hostLocation: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  riceIndicator: {
    backgroundColor: COLORS.neutral.grey200,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riceText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  mainCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  meetupTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  filterBadgeContainer: {
    marginBottom: 20,
  },
  filterBadgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
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
    borderRadius: 16,
    gap: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryEmoji: {
    fontSize: 14,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.functional.success + '20',
    gap: 6,
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.text.secondary + '20',
    gap: 6,
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary.main + '20',
    gap: 6,
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  optionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 6,
  },
  optionalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  infoGrid: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
    marginBottom: 16,
  },
  timeInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  accordionContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
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
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: COLORS.neutral.white,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  filterItem: {
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  filterDescription: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: COLORS.primary.main + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestTagText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  participantSection: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  participantTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD54F',
    marginRight: 12,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.neutral.grey200,
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  participantRole: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  noParticipants: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 2,
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 12,
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
    backgroundColor: '#34C759',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: '#FF6B6B',
  },
  hostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  leaveButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  joinButton: {
    backgroundColor: '#495057',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  pastMeetupContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pastMeetupText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalAmountContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalPayButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalPayText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalLeaveButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalLeaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalHostCancelButton: {
    backgroundColor: '#dc2626',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default UniversalMeetupDetailScreen;