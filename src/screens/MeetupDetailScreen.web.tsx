import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useParams } from 'react-router-dom';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { Icon } from '../components/Icon';
import { useRouterNavigation } from '../components/RouterNavigation';
import ReviewList from '../components/ReviewList';
import ReviewForm from '../components/ReviewForm';
import reviewApiService, { Review, ReviewStats } from '../services/reviewApiService';
import { formatKoreanDateTime } from '../utils/dateUtils';

interface MeetupDetailScreenProps {
  navigation?: any;
  route?: any;
  user?: any;
}

interface Meetup {
  id: string;
  title: string;
  description: string;
  location: string;
  address: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  category: string;
  priceRange: string;
  status: string;
  requirements: string;
  host: {
    id: string;
    name: string;
    rating: number;
  };
  participants: Array<{
    id: string;
    name: string;
    profileImage?: string;
  }>;
}

const MeetupDetailScreen: React.FC<MeetupDetailScreenProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigation = useRouterNavigation();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ averageRating: 0, totalReviews: 0 });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const meetupId = id || '1'; // URL 파라미터에서 가져오기

  useEffect(() => {
    loadMeetupDetail();
    loadReviews();
  }, [meetupId]);

  const loadMeetupDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups/${meetupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setMeetup(data.meetup);
      } else {
        Alert.alert('오류', '모임 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('모임 상세 조회 오류:', error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewLoading(true);
      const response = await reviewApiService.getMeetupReviews(meetupId, 1, 10);
      setReviews(response.reviews);
      setReviewStats(response.stats);
    } catch (error) {
      console.error('리뷰 로드 실패:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    loadReviews(); // 리뷰 목록 새로고침
  };

  const handleJoinMeetup = async () => {
    if (!meetup) return;

    setJoinLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetups/${meetupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: joinMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          '참가 신청 완료!', 
          '모임 참가 신청이 완료되었습니다. 모임 채팅방에 자동으로 참가되었어요!',
          [
            {
              text: '홈으로',
              style: 'default',
              onPress: () => {
                setShowJoinModal(false);
                setJoinMessage('');
                if (navigation) {
                  navigation.navigate('Home');
                }
              }
            },
            {
              text: '채팅방 가기',
              style: 'default',
              onPress: () => {
                setShowJoinModal(false);
                setJoinMessage('');
                handleChatRoom();
              }
            }
          ]
        );
      } else {
        Alert.alert('오류', data.error || '참가 신청에 실패했습니다.');
      }
    } catch (error) {
      console.error('모임 참가 신청 오류:', error);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleChatRoom = () => {
    // 채팅방으로 이동
    if (navigation) {
      navigation.navigate('Chat', { 
        selectedMeetupId: meetupId 
      });
    }
  };

  const canJoin = () => {
    if (!meetup || !user) return false;
    
    // 호스트인지 확인
    if (meetup.host.id === user.id) return false;
    
    // 이미 참가했는지 확인
    const isParticipant = meetup.participants.some(p => p.id === user.id);
    if (isParticipant) return false;
    
    // 모집 상태 및 정원 확인
    return meetup.status === '모집중' && meetup.currentParticipants < meetup.maxParticipants;
  };

  const isHost = () => {
    return meetup && user && meetup.host.id === user.id;
  };

  const isParticipant = () => {
    return meetup && user && meetup.participants.some(p => p.id === user.id);
  };

  const canWriteReview = () => {
    if (!meetup || !user) return false;
    
    // 모임이 완료되었고 참가자인 경우만 리뷰 작성 가능
    return meetup.status === '완료' && isParticipant();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>모임 정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!meetup) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>모임을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 상세</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Icon name="share" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 모임 제목 및 상태 */}
        <View style={styles.titleSection}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{meetup.status}</Text>
          </View>
          <Text style={styles.meetupTitle}>{meetup.title}</Text>
          <Text style={styles.category}>{meetup.category}</Text>
        </View>

        {/* 호스트 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>호스트</Text>
          <View style={styles.hostInfo}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostAvatarText}>{meetup.host.name.charAt(0)}</Text>
            </View>
            <View style={styles.hostDetails}>
              <Text style={styles.hostName}>{meetup.host.name}</Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{parseFloat(meetup.host.rating || '5.0').toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 모임 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>모임 정보</Text>
          
          <View style={styles.infoItem}>
            <Icon name="calendar" size={20} color={COLORS.primary.main} />
            <Text style={styles.infoText}>
              {formatKoreanDateTime(meetup.date, 'datetime')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Icon name="map-pin" size={20} color={COLORS.primary.main} />
            <View>
              <Text style={styles.infoText}>{meetup.location}</Text>
              {meetup.address && (
                <Text style={styles.subInfoText}>{meetup.address}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon name="users" size={20} color={COLORS.primary.main} />
            <Text style={styles.infoText}>
              {meetup.currentParticipants} / {meetup.maxParticipants}명
            </Text>
          </View>

          {meetup.priceRange && (
            <View style={styles.infoItem}>
              <Icon name="dollar-sign" size={20} color={COLORS.primary.main} />
              <Text style={styles.infoText}>{meetup.priceRange}</Text>
            </View>
          )}
        </View>

        {/* 모임 설명 */}
        {meetup.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>모임 설명</Text>
            <Text style={styles.description}>{meetup.description}</Text>
          </View>
        )}

        {/* 참가 조건 */}
        {meetup.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>참가 조건</Text>
            <Text style={styles.requirements}>{meetup.requirements}</Text>
          </View>
        )}

        {/* 참가자 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>참가자 ({meetup.participants.length}명)</Text>
          <View style={styles.participantsList}>
            {meetup.participants.map((participant) => (
              <View key={participant.id} style={styles.participantItem}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {participant.name.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.participantName}>{participant.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 리뷰 섹션 */}
        <View style={styles.section}>
          <View style={styles.reviewSectionHeader}>
            <Text style={styles.sectionTitle}>리뷰</Text>
            {canWriteReview() && (
              <TouchableOpacity 
                style={styles.writeReviewButton}
                onPress={() => setShowReviewForm(true)}
              >
                <Icon name="edit" size={16} color={COLORS.primary.main} />
                <Text style={styles.writeReviewText}>리뷰 작성</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <ReviewList
            reviews={reviews}
            stats={reviewStats}
            loading={reviewLoading}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtons}>
        {isHost() ? (
          <TouchableOpacity style={styles.chatButton} onPress={handleChatRoom}>
            <Icon name="message-circle" size={20} color={COLORS.text.white} />
            <Text style={styles.chatButtonText}>모임 채팅방</Text>
          </TouchableOpacity>
        ) : isParticipant() ? (
          <TouchableOpacity style={styles.chatButton} onPress={handleChatRoom}>
            <Icon name="message-circle" size={20} color={COLORS.text.white} />
            <Text style={styles.chatButtonText}>채팅방 입장</Text>
          </TouchableOpacity>
        ) : canJoin() ? (
          <TouchableOpacity 
            style={styles.joinButton} 
            onPress={() => setShowJoinModal(true)}
          >
            <Text style={styles.joinButtonText}>참가 신청</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledButton}>
            <Text style={styles.disabledButtonText}>
              {meetup.status === '모집완료' ? '모집 완료' : '참가 불가'}
            </Text>
          </View>
        )}
      </View>

      {/* 참가 신청 모달 */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>참가 신청</Text>
            <Text style={styles.modalSubtitle}>
              호스트에게 전달할 메시지를 작성해주세요 (선택사항)
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="안녕하세요! 모임에 참가하고 싶습니다."
              value={joinMessage}
              onChangeText={setJoinMessage}
              multiline
              numberOfLines={4}
              maxLength={200}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalJoinButton, joinLoading && styles.modalJoinButtonDisabled]}
                onPress={handleJoinMeetup}
                disabled={joinLoading}
              >
                <Text style={styles.modalJoinText}>
                  {joinLoading ? '신청 중...' : '참가 신청'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 리뷰 작성 모달 */}
      {meetup && (
        <ReviewForm
          visible={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          meetupId={meetupId}
          meetupTitle={meetup.title}
          onReviewSubmitted={handleReviewSubmitted}
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
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    backgroundColor: '#ede0c8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  shareButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  titleSection: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.functional.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    color: COLORS.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
  meetupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  subInfoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 12,
    marginTop: 2,
  },
  description: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  requirements: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  participantItem: {
    alignItems: 'center',
    marginBottom: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary.main,
  },
  participantName: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  bottomButtons: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  joinButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  joinButtonText: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatButton: {
    backgroundColor: COLORS.functional.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  chatButtonText: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: COLORS.text.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButtonText: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.primary,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.text.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalJoinButton: {
    flex: 1,
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalJoinButtonDisabled: {
    backgroundColor: COLORS.text.secondary,
  },
  modalJoinText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  writeReviewText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
});

export default MeetupDetailScreen;