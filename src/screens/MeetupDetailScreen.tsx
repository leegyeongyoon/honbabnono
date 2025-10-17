import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { Icon } from '../components/Icon';
import { useMeetups } from '../hooks/useMeetups';
import BabAlIndex from '../components/BabAlIndex';
import MealPreferenceSelector from '../components/MealPreferenceSelector';

interface Participant {
  id: number;
  name: string;
  profileImage: string;
  isVerified: boolean;
  rating: number;
  babAlScore: number;
}

const getCategoryEmoji = (category: string): string => {
  const emojiMap: { [key: string]: string } = {
    '한식': '🍚',
    '중식': '🥟',
    '일식': '🍣',
    '양식': '🍝',
    '카페': '☕',
    '술집': '🍻',
  };
  return emojiMap[category] || '🍽️';
};

interface MeetupDetailScreenProps {
  route?: { params: { meetupId: number } };
  navigation?: any;
}

const MeetupDetailScreen: React.FC<MeetupDetailScreenProps> = ({ route, navigation }) => {
  const meetupId = route?.params?.meetupId || 0;
  const { getMeetupById, joinMeetup, leaveMeetup, meetups } = useMeetups();
  
  const handleGoBack = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    } else if (navigation && navigation.navigate) {
      navigation.navigate('Home');
    } else {
      console.log('Navigation not available');
    }
  };
  const [isJoined, setIsJoined] = useState(false);
  
  // meetups가 변경될 때마다 최신 데이터를 가져오도록 함
  const meetupData = getMeetupById(meetupId);
  
  // 참여 상태 초기화
  useEffect(() => {
    // 여기서는 임시로 기본값 false 설정
    // 실제로는 참여자 목록에서 현재 사용자 ID를 확인해야 함
    setIsJoined(false);
  }, [meetupId]);
  
  if (!meetupData) {
    return (
      <View style={styles.container}>
        <Text>모임을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const participants: Participant[] = [
    {
      id: 1,
      name: meetupData.hostName,
      profileImage: `https://via.placeholder.com/50x50/F5CB76/ffffff?text=${meetupData.hostName.charAt(0)}`,
      isVerified: true,
      rating: 4.8,
      babAlScore: 85,
    },
  ];

  const handleJoinMeetup = () => {
    const currentMeetup = getMeetupById(meetupId);
    if (!currentMeetup) return;

    if (isJoined) {
      Alert.alert(
        '모임 탈퇴',
        '정말로 이 모임에서 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '탈퇴', 
            style: 'destructive',
            onPress: () => {
              const success = leaveMeetup(meetupId);
              if (success) {
                setIsJoined(false);
                console.log('모임 탈퇴 성공 - ID:', meetupId);
                Alert.alert('완료', '모임에서 탈퇴했습니다.');
              } else {
                Alert.alert('오류', '탈퇴에 실패했습니다.');
              }
            }
          }
        ]
      );
    } else {
      if (currentMeetup.currentParticipants >= currentMeetup.maxParticipants) {
        Alert.alert('참여 불가', '모임이 가득 찼습니다.');
        return;
      }

      Alert.alert(
        '모임 참여',
        '이 모임에 참여하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '참여', 
            onPress: () => {
              const success = joinMeetup(meetupId);
              if (success) {
                setIsJoined(true);
                console.log('모임 참여 성공 - ID:', meetupId);
                Alert.alert('완료', '모임에 참여했습니다!');
              } else {
                Alert.alert('오류', '모임이 가득 찼습니다.');
              }
            }
          }
        ]
      );
    }
  };

  const handleReportMeetup = () => {
    Alert.alert(
      '신고하기',
      '이 모임을 신고하는 이유를 선택해주세요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '부적절한 내용', onPress: () => console.log('신고: 부적절한 내용') },
        { text: '스팸/광고', onPress: () => console.log('신고: 스팸') },
        { text: '기타', onPress: () => console.log('신고: 기타') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Icon name="chevron-left" size={20} color={COLORS.text.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 헤더 이미지 */}
        <View style={styles.imageContainer}>
        <Image 
          source={{ uri: meetupData.image || 'https://via.placeholder.com/400x200/F5CB76/ffffff?text=모임' }}
          style={styles.headerImage}
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{getCategoryEmoji(meetupData.category)} {meetupData.category}</Text>
        </View>
      </View>

      {/* 모임 정보 */}
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{meetupData.title}</Text>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={handleReportMeetup}
          >
            <Text style={styles.reportText}>🚨</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{meetupData.location}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{meetupData.date}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🕐</Text>
            <Text style={styles.infoText}>{meetupData.time}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>👥</Text>
            <Text style={styles.infoText}>
              {meetupData.currentParticipants}/{meetupData.maxParticipants}명
            </Text>
          </View>
        </View>

        {/* 호스트 정보 */}
        <View style={styles.hostSection}>
          <Text style={styles.sectionTitle}>모임장</Text>
          <View style={styles.hostInfo}>
            <Image 
              source={{ uri: participants[0].profileImage }}
              style={styles.hostImage}
            />
            <View style={styles.hostDetails}>
              <View style={styles.hostNameRow}>
                <Text style={styles.hostName}>{meetupData.hostName}</Text>
                <Text style={styles.verifiedBadge}>✅</Text>
              </View>
              <Text style={styles.hostRating}>⭐ 4.8</Text>
              <View style={styles.hostBabAl}>
                <BabAlIndex 
                  score={participants[0].babAlScore} 
                  size="small"
                  showDetails={false}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 참여자 목록 */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>참여자</Text>
          <View style={styles.participantsList}>
            {participants.map((participant) => (
              <View key={participant.id} style={styles.participantItem}>
                <Image 
                  source={{ uri: participant.profileImage }}
                  style={styles.participantImage}
                />
                <View style={styles.participantInfo}>
                  <View style={styles.participantNameRow}>
                    <Text style={styles.participantName}>{participant.name}</Text>
                    {participant.isVerified && (
                      <Text style={styles.verifiedBadge}>✅</Text>
                    )}
                  </View>
                  <Text style={styles.participantRating}>⭐ {participant.rating}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 모임 설명 */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>모임 소개</Text>
          <Text style={styles.description}>{meetupData.description}</Text>
        </View>

        {/* 식사 성향 정보 */}
        <View style={styles.mealPreferencesSection}>
          <MealPreferenceSelector
            selectedPreferences={meetupData.mealPreferences}
            onPreferencesChange={() => {}} // 읽기 전용
            title="🍽️ 이 모임의 식사 성향"
            compact={true}
          />
        </View>

        {/* 안전 공지 */}
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyTitle}>🛡️ 안전한 모임을 위해</Text>
          <Text style={styles.safetyText}>
            • 첫 만남은 공개된 장소에서 진행됩니다{'\n'}
            • 불편한 상황 시 언제든 신고해주세요{'\n'}
            • 모든 참여자는 상호 존중해주세요
          </Text>
        </View>

        {/* 채팅 버튼 */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation?.navigate('Chat', { 
            meetupId: meetupData.id, 
            meetupTitle: meetupData.title 
          })}
        >
          <Text style={styles.chatButtonText}>💬 모임 채팅</Text>
        </TouchableOpacity>

        {/* 참여 버튼 */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            isJoined && styles.leaveButton
          ]}
          onPress={handleJoinMeetup}
        >
          <Text style={[
            styles.joinButtonText,
            isJoined && styles.leaveButtonText
          ]}>
            {isJoined ? '모임 탈퇴' : '모임 참여하기'}
          </Text>
        </TouchableOpacity>
      </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#ede0c8',
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
    ...SHADOWS.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  scrollView: {
    flex: 1,
    paddingTop: LAYOUT.HEADER_HEIGHT, // 헤더 높이만큼 패딩 (이미지가 마진 역할)
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primary.main,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.medium,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  content: {
    padding: 20,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 10,
  },
  reportButton: {
    padding: 8,
  },
  reportText: {
    fontSize: 20,
  },
  infoGrid: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text.primary,
    flex: 1,
  },
  hostSection: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  hostDetails: {
    flex: 1,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginRight: 8,
  },
  verifiedBadge: {
    fontSize: 14,
  },
  hostRating: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  hostBabAl: {
    marginTop: 8,
  },
  participantsSection: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: 6,
  },
  participantRating: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  descriptionSection: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  description: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  safetyNotice: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  chatButton: {
    backgroundColor: COLORS.secondary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  joinButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  leaveButton: {
    backgroundColor: COLORS.functional.error,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  leaveButtonText: {
    color: COLORS.text.white,
  },
  mealPreferencesSection: {
    marginBottom: 20,
  },
});

export default MeetupDetailScreen;