import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';

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
const KakaoMap: React.FC<{ location: string; address: string }> = ({ location, address }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const loadKakaoMap = () => {
      if (window.kakao && window.kakao.maps && mapRef.current) {
        const options = {
          center: new window.kakao.maps.LatLng(37.498095, 127.027610),
          level: 3
        };

        const map = new window.kakao.maps.Map(mapRef.current, options);
        const geocoder = new window.kakao.maps.services.Geocoder();

        geocoder.addressSearch(location, function(result: any, status: any) {
          if (status === window.kakao.maps.services.Status.OK) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            const marker = new window.kakao.maps.Marker({
              map: map,
              position: coords
            });
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="width:150px;text-align:center;padding:6px 0;">${location}</div>`
            });
            infowindow.open(map, marker);
            map.setCenter(coords);
          }
        });
      }
    };

    if (!window.kakao) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=5a202bd90ab8dff01348f24cb1c37f3f&libraries=services&autoload=false`;
      script.onload = () => {
        window.kakao.maps.load(loadKakaoMap);
      };
      document.head.appendChild(script);
    } else {
      loadKakaoMap();
    }
  }, [location]);

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
          marginBottom: '12px'
        }}
      />
      <Text style={styles.mapLocationText}>{location}</Text>
    </View>
  );
};

const MeetupDetailScreen: React.FC<MeetupDetailScreenProps> = ({ user: propsUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: storeUser } = useUserStore();
  const currentMeetup = useMeetupStore(state => state.currentMeetup);
  const loading = useMeetupStore(state => state.loading);
  const joinMeetup = useMeetupStore(state => state.joinMeetup);
  const leaveMeetup = useMeetupStore(state => state.leaveMeetup);
  const [showPromiseModal, setShowPromiseModal] = React.useState(false);
  
  // props로 받은 user가 있으면 사용, 없으면 store의 user 사용
  const user = propsUser || storeUser;

  React.useEffect(() => {
    if (id) {
      const fetchFn = useMeetupStore.getState().fetchMeetupById;
      fetchFn(id);
    }
  }, [id]); // id가 변경될 때만 호출

  if (loading || !currentMeetup) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  const meetup = currentMeetup;
  const participants = meetup.participants || [];

  // 모임 참여하기
  const handleJoinMeetup = async () => {
    if (!user || !id) return;
    
    try {
      if (participants.some(p => p.id === user.id)) {
        // 이미 참여중이면 탈퇴
        await leaveMeetup(id, user.id);
      } else {
        // 참여하기
        setShowPromiseModal(true);
      }
    } catch (error) {
      console.error('모임 참여/탈퇴 실패:', error);
    }
  };

  // 보증금 결제 후 실제 참여
  const handleConfirmJoin = async () => {
    if (!user || !id) return;
    
    try {
      await joinMeetup(id, user.id);
      setShowPromiseModal(false);
    } catch (error) {
      console.error('모임 참여 실패:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigate(-1)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상세보기</Text>
          <View style={styles.babAlContainer}>
            <Text style={styles.babAlScore}>{user?.babAlScore || meetup.hostBabAlScore} 밥알</Text>
          </View>
        </View>

        {/* 메인 카드 */}
        <View style={styles.mainCard}>
          {/* 제목 */}
          <Text style={styles.meetupTitle}>{meetup.title || '제목 없음'}</Text>
          
          {/* 정보 그리드 */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>카테고리</Text>
              <Text style={styles.infoValue}>{meetup.category || '미정'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>날짜</Text>
              <Text style={styles.infoValue}>{meetup.date || '미정'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>시간</Text>
              <Text style={styles.infoValue}>{meetup.time || '미정'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>인원</Text>
              <Text style={styles.infoValue}>{meetup.currentParticipants || 0}/{meetup.maxParticipants || 0}명</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>위치</Text>
              <Text style={styles.infoValue}>{meetup.location || '미정'}</Text>
            </View>
          </View>

          {/* 설명 */}
          <Text style={styles.description}>{meetup.description || '설명 없음'}</Text>
          
          {/* 지도 */}
          <KakaoMap location={meetup.location} address={meetup.location} />
          
          {/* 하단 정보 */}
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomInfoText}>데이팅레볼 (서울 구로구 항동으로길72길 29)</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>상대방이 참여요청 중 · 5분 전</Text>
            </View>
          </View>
        </View>

        {/* 참가 예비 섹션 */}
        <View style={styles.participantCard}>
          <Text style={styles.participantTitle}>참가 예비</Text>
          
          <View style={styles.participantList}>
            {participants.length > 0 ? participants.map((participant, index) => (
              <View key={index} style={styles.participantItem}>
                <View style={styles.avatar} />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name || participant.user_name || '익명'}</Text>
                  <Text style={styles.participantStatus}>
                    {participant.status === 'approved' ? '참여 확정' : '참여 대기 중'}
                  </Text>
                </View>
              </View>
            )) : (
              <View style={styles.participantItem}>
                <View style={styles.avatar} />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>참가자 없음</Text>
                  <Text style={styles.participantStatus}>아직 참가한 사람이 없습니다</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 참여하기 버튼 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => handleJoinMeetup()}
            style={[
              styles.joinButton,
              (!user || participants.some(p => p.id === user.id)) && styles.joinButtonDisabled
            ]}
            disabled={!user || participants.some(p => p.id === user.id)}
          >
            <Text style={[
              styles.joinButtonText,
              (!user || participants.some(p => p.id === user.id)) && styles.joinButtonTextDisabled
            ]}>
              {!user 
                ? '로그인 필요' 
                : participants.some(p => p.id === user.id) 
                  ? '참여중' 
                  : '참여하기'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 약속보증금 모달 */}
      {showPromiseModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>약속보증금</Text>
            <Text style={styles.modalDescription}>
              노쇼 방지를 위해 약속보증금을 결제해주세요.{'\n'}
              모임 참석 시 100% 환불됩니다.
            </Text>
            <View style={styles.modalAmountContainer}>
              <Text style={styles.modalAmount}>5,000원</Text>
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
                <Text style={styles.modalPayText}>결제하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#333',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 80,
  },
  babAlContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  babAlScore: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  mainCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  meetupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 20,
  },
  mapSection: {
    marginBottom: 20,
  },
  mapLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  mapLocationText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  bottomInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  bottomInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4caf50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  participantCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  participantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  participantList: {
    
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  participantStatus: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  joinButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  joinButtonDisabled: {
    backgroundColor: '#d6d6d6',
  },
  joinButtonTextDisabled: {
    color: '#999',
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
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
    color: '#333',
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
});

export default MeetupDetailScreen;