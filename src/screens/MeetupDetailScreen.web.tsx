import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import apiClient from '../services/apiClient';
import { DepositSelector } from '../components/DepositSelector';
import { getChatTimeDifference } from '../utils/timeUtils';
import { useRouterNavigation } from '../components/RouterNavigation';
import { Icon } from '../components/Icon';

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
          console.log('🗺️ 카카오 지도 로드 시작:', { location, latitude, longitude });
          
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
          
          console.log('✅ 지도와 마커 표시 완료:', { lat, lng, location });
          setMapLoaded(true);
          setMapError(null);
        }
      } catch (error) {
        console.error('❌ 지도 로딩 에러:', error);
        setMapError('지도를 불러올 수 없습니다.');
      }
    };

    if (!window.kakao) {
      console.log('📥 Loading Kakao Maps script...');
      const script = document.createElement('script');
      script.async = true;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=5a202bd90ab8dff01348f24cb1c37f3f&libraries=services&autoload=false`;
      script.onload = () => {
        console.log('✅ Kakao Maps script loaded');
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(loadKakaoMap);
        }
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Kakao Maps script:', error);
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
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '12px',
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
  const [showPromiseModal, setShowPromiseModal] = React.useState(false);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [showDepositSelector, setShowDepositSelector] = React.useState(false);
  const [showHostModal, setShowHostModal] = React.useState(false);
  const [userRiceIndex, setUserRiceIndex] = React.useState<number>(0);
  
  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  React.useEffect(() => {
    if (id) {
      fetchMeetupById(id);
    }
  }, [id, fetchMeetupById]);

  // 사용자 밥알지수 로드
  React.useEffect(() => {
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
  
  // 모임 상태 확인 (지난 모임인지)
  const isPastMeetup = meetup.status === '완료' || meetup.status === '종료' || 
                      meetup.status === '취소' || meetup.status === '파토';
  
  // 현재 시간이 모임 시간을 지났는지 확인
  const now = new Date();
  const meetupDateTime = new Date(`${meetup.date} ${meetup.time}`);
  const isTimeExpired = now > meetupDateTime;

  // 모임 참여하기
  const handleJoinMeetup = async () => {
    if (!user || !id) return;
    
    try {
      if (participants.some(p => p.id === user.id)) {
        // 이미 참여중이면 탈퇴 확인 모달 표시
        setShowLeaveModal(true);
      } else {
        // 참여하기 - 약속금 결제 모달 표시
        setShowDepositSelector(true);
      }
    } catch (error) {
      console.error('모임 참여/탈퇴 실패:', error);
    }
  };

  // 모임 탈퇴 확인
  const handleConfirmLeave = async () => {
    if (!user || !id) return;
    
    try {
      const result = await leaveMeetup(id, user.id);
      setShowLeaveModal(false);
      
      // 호스트가 모임을 취소한 경우 홈으로 리다이렉트
      if (result?.isHostCancellation) {
        alert('모임이 취소되었습니다. 모든 참가자가 자동으로 나가게 됩니다.');
        navigate('/home');
      }
    } catch (error) {
      console.error('모임 탈퇴 실패:', error);
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
      console.error('포인트 조회 실패:', error);
      return false;
    }
  };

  // 약속금 결제 완료 후 모임 참여
  const handleDepositPaid = async (depositId: string, amount: number) => {
    if (!user || !id) return;
    
    try {
      console.log('약속금 결제 완료:', { depositId, amount, meetupId: id });
      
      // 실제 모임 참여 처리
      await joinMeetup(id, user.id);
      
      alert(`약속금 ${amount.toLocaleString()}원이 결제되었습니다! 모임에 참여되었습니다.`);
    } catch (error) {
      console.error('모임 참여 실패:', error);
      alert('모임 참여에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 채팅방으로 이동
  const handleGoToChat = async () => {
    if (!user || !id) return;

    try {
      console.log('🔍 모임 채팅방 조회 시작:', { meetupId: id });
      
      // 모임 ID로 채팅방 ID 조회
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/chat/rooms/by-meetup/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📡 채팅방 조회 응답:', data);

      if (data.success && data.data.chatRoomId) {
        // 채팅방 ID로 이동
        const chatRoomId = data.data.chatRoomId;
        navigate(`/chat/${chatRoomId}`);
        console.log('✅ 채팅방 이동 성공:', { meetupId: id, chatRoomId });
      } else {
        console.error('❌ 채팅방 조회 실패:', data.error);
        alert('채팅방을 찾을 수 없습니다. 모임에 참여해주세요.');
      }
    } catch (error) {
      console.error('❌ 채팅방 이동 오류:', error);
      alert('채팅방 이동 중 오류가 발생했습니다.');
    }
  };

  // 모임 확정/취소 처리
  const handleMeetupAction = async () => {
    if (!user || !id) return;

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
        alert(message);
      } else {
        alert(response.data.error || '처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('모임 확정/취소 실패:', error);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  // 보증금 결제 후 실제 참여 (기존 함수 유지)
  const handleConfirmJoin = async () => {
    if (!user || !id) return;
    
    try {
      // 포인트 확인
      const hasEnoughPoints = await checkUserPoints();
      
      if (!hasEnoughPoints) {
        const requiredPoints = meetup.deposit || 3000;
        const confirmed = confirm(
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
        alert('포인트 사용 중 오류가 발생했습니다.');
        setShowPromiseModal(false);
        return;
      }

      // 모임 참여
      await joinMeetup(id, user.id);
      setShowPromiseModal(false);
      
      alert(`모임 참여가 완료되었습니다!\n사용된 포인트: ${(meetup.deposit || 3000).toLocaleString()}원`);
    } catch (error) {
      console.error('모임 참여 실패:', error);
      alert('모임 참여 중 오류가 발생했습니다.');
      setShowPromiseModal(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 호스트 정보 */}
        <View style={styles.hostSection}>
          <View style={styles.hostInfo}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.hostName}>{meetup.hostName || '익명'}</Text>
              <Text style={styles.hostLocation}>{meetup.location || '위치 미정'}</Text>
            </View>
          </View>
          <View style={styles.riceIndicator}>
            <Text style={styles.riceText}>{meetup.hostBabAlScore || userRiceIndex} 밥알 🍚</Text>
          </View>
        </View>

        {/* 메인 카드 */}
        <View style={styles.mainCard}>
          <Text style={styles.meetupTitle}>{meetup.title || '급한 때실 시밥'}</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{meetup.location}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{meetup.date} {meetup.time}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoDetails}>{meetup.category}    {meetup.priceRange || '가격미정'}    {meetup.tags?.join(' ') || ''}</Text>
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

        {/* 지도 섹션 */}
        <KakaoMap 
          location={meetup.location} 
          address={meetup.address || meetup.location}
          latitude={meetup.latitude}
          longitude={meetup.longitude}
        />

        {/* 참여자 섹션 */}
        <View style={styles.participantSection}>
          <Text style={styles.participantTitle}>참여자 ({participants.length}명)</Text>
          
          {/* 호스트 */}
          <View style={styles.participantItem}>
            <View style={styles.hostAvatar} />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{meetup.hostName} (호스트)</Text>
              <Text style={styles.participantRole}>호스트입니다</Text>
            </View>
          </View>

          {/* 참여자들 */}
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantAvatar} />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantRole}>
                  {participant.status === 'approved' ? '참가승인' : 
                   participant.status === 'pending' ? '참가신청' : '거절됨'}
                </Text>
              </View>
            </View>
          ))}
          
          {participants.length === 0 && (
            <Text style={styles.noParticipants}>아직 참여자가 없습니다.</Text>
          )}
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.fixedBottom}>
        {isPastMeetup ? (
          /* 지난 모임인 경우 - 상태만 표시 */
          <View style={styles.pastMeetupContainer}>
            <Text style={styles.pastMeetupText}>
              {meetup.status === '완료' || meetup.status === '종료' ? 
                '✅ 완료된 모임이에요' :
                meetup.status === '취소' ? 
                '❌ 취소된 모임이에요' :
                '💥 파토된 모임이에요'
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
                  <Text style={styles.chatButtonText}>💬 채팅방</Text>
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
                
                {/* 참가자 탈퇴 버튼 */}
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
              /* 미참여자 - 참여하기 버튼 */
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
        meetupId={id || ''}
      />
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#000000',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  infoGrid: {
    marginBottom: 20,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  infoRow: {
    marginTop: 8,
  },
  infoDetails: {
    fontSize: 14,
    color: COLORS.text.tertiary,
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
  mapSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  mapLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
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
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 8,
  },
  openMapButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4285F4',
    borderRadius: 6,
  },
  openMapText: {
    fontSize: 14,
    color: COLORS.neutral.white,
    fontWeight: '500',
  },
  mapLocationText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationInfo: {
    
  },
  locationText: {
    fontSize: 14,
    color: '#000000',
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
    backgroundColor: '#1E88E5',
  },
  subwayLine2: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.functional.success,
  },
  subwayText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.text.secondary,
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e9ecef',
    marginRight: 12,
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
  noParticipants: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
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
    backgroundColor: '#dc2626', // 더 진한 빨강
  },
  // 하단 버튼 관련 스타일
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
});

export default MeetupDetailScreen;