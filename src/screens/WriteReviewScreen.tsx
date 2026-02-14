import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import { ProfileImage } from '../components/ProfileImage';
import apiClient from '../services/apiClient';

interface Participant {
  id: string;
  name: string;
  profileImage: string | null;
  rating: number;
  isHost: boolean;
  attended: boolean;
  alreadyReviewed: boolean;
}

const REVIEW_TAGS = [
  '시간약속잘지킴',
  '대화가재미있음',
  '친절해요',
  '다시만나고싶어요',
  '맛집추천잘해요',
  '배려심있어요',
  '유쾌해요',
  '매너좋아요',
];

const WriteReviewScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { meetupId, meetupTitle } = route.params || {};

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviewableParticipants();
  }, [meetupId]);

  const fetchReviewableParticipants = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/meetups/${meetupId}/reviewable-participants`);
      if (response.data?.participants) {
        setParticipants(response.data.participants);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '참가자 목록을 불러오지 못했습니다.';
      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectParticipant = (participant: Participant) => {
    if (participant.alreadyReviewed) {
      Alert.alert('알림', '이미 이 참가자에게 리뷰를 작성했습니다.');
      return;
    }
    setSelectedParticipant(participant);
    setRating(0);
    setContent('');
    setSelectedTags([]);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async () => {
    if (!selectedParticipant) {
      Alert.alert('알림', '리뷰를 작성할 참가자를 선택해주세요.');
      return;
    }

    if (rating === 0) {
      Alert.alert('알림', '평점을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.post(`/meetups/${meetupId}/reviews`, {
        revieweeId: selectedParticipant.id,
        rating,
        content: content.trim() || null,
        tags: selectedTags,
        isAnonymous,
      });

      if (response.data?.review) {
        Alert.alert('완료', '리뷰가 작성되었습니다.', [
          {
            text: '확인',
            onPress: () => {
              // 목록 새로고침
              fetchReviewableParticipants();
              // 폼 초기화
              setSelectedParticipant(null);
              setRating(0);
              setContent('');
              setSelectedTags([]);
            },
          },
        ]);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '리뷰 작성에 실패했습니다.';
      Alert.alert('오류', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton} activeOpacity={0.6}>
            <Icon
              name="star"
              size={32}
              color={star <= rating ? '#D4A574' : COLORS.neutral.grey200}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderParticipantList = () => {
    if (loading) {
      return <Text style={styles.loadingText}>로딩 중...</Text>;
    }

    if (participants.length === 0) {
      return <Text style={styles.emptyText}>리뷰를 작성할 수 있는 참가자가 없습니다.</Text>;
    }

    return participants.map((participant) => (
      <TouchableOpacity
        key={participant.id}
        style={[
          styles.participantItem,
          selectedParticipant?.id === participant.id && styles.participantItemSelected,
          participant.alreadyReviewed && styles.participantItemReviewed,
        ]}
        onPress={() => handleSelectParticipant(participant)}
        disabled={participant.alreadyReviewed}
      >
        <ProfileImage
          profileImage={participant.profileImage}
          name={participant.name}
          size={48}
        />
        <View style={styles.participantInfo}>
          <View style={styles.participantNameRow}>
            <Text style={styles.participantName}>{participant.name}</Text>
            {participant.isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>호스트</Text>
              </View>
            )}
          </View>
          <Text style={styles.participantRating}>
            {participant.rating ? `${participant.rating.toFixed(1)}` : '신규'}
          </Text>
        </View>
        {participant.alreadyReviewed ? (
          <View style={styles.reviewedBadge}>
            <Icon name="check" size={16} color={COLORS.functional.success} />
            <Text style={styles.reviewedText}>작성완료</Text>
          </View>
        ) : (
          <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
        )}
      </TouchableOpacity>
    ));
  };

  const renderReviewForm = () => {
    if (!selectedParticipant) {return null;}

    return (
      <View style={styles.reviewForm}>
        <View style={styles.selectedHeader}>
          <ProfileImage
            profileImage={selectedParticipant.profileImage}
            name={selectedParticipant.name}
            size={56}
          />
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>{selectedParticipant.name}</Text>
            <Text style={styles.selectedSubtext}>님에게 리뷰 작성</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedParticipant(null)}
          >
            <Icon name="x" size={24} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>평점</Text>
          {renderStars()}
          <Text style={styles.ratingText}>
            {rating === 0
              ? '별점을 선택해주세요'
              : rating <= 2
              ? '아쉬웠어요'
              : rating === 3
              ? '보통이에요'
              : rating === 4
              ? '좋았어요'
              : '최고예요!'}
          </Text>
        </View>

        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>태그 (선택)</Text>
          <View style={styles.tagsContainer}>
            {REVIEW_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}
                onPress={() => handleToggleTag(tag)}
              >
                <Text
                  style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>후기 (선택)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="함께한 시간에 대한 후기를 작성해주세요"
            placeholderTextColor={COLORS.text.tertiary}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text
            style={[
              styles.charCounter,
              content.length >= 500 && styles.charCounterError,
              content.length >= 400 && content.length < 500 && styles.charCounterWarning,
            ]}
          >
            {content.length}/500
          </Text>
        </View>

        <TouchableOpacity
          style={styles.anonymousRow}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
            {isAnonymous && <Icon name="check" size={14} color={COLORS.neutral.white} />}
          </View>
          <Text style={styles.anonymousText}>익명으로 작성</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.neutral.white} />
          ) : (
            <Text style={styles.submitButtonText}>리뷰 등록하기</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰 작성</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.meetupInfo}>
          <Text style={styles.meetupTitle}>{meetupTitle || '모임'}</Text>
          <Text style={styles.meetupSubtitle}>함께한 참가자에게 리뷰를 남겨주세요</Text>
        </View>

        {!selectedParticipant ? (
          <View style={styles.participantList}>
            <Text style={styles.listTitle}>참가자 목록</Text>
            {renderParticipantList()}
          </View>
        ) : (
          renderReviewForm()
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  meetupInfo: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    marginBottom: 12,
  },
  meetupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  meetupSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  participantList: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    padding: 20,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.neutral.grey100,
  },
  participantItemSelected: {
    backgroundColor: COLORS.primary.light,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  participantItemReviewed: {
    opacity: 0.6,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  hostBadge: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hostBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  participantRating: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewedText: {
    fontSize: 12,
    color: COLORS.functional.success,
    fontWeight: '500',
  },
  reviewForm: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  selectedSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  closeButton: {
    padding: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  tagSelected: {
    backgroundColor: COLORS.primary.light,
    borderColor: COLORS.primary.main,
  },
  tagText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  tagTextSelected: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  contentSection: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text.primary,
    minHeight: 100,
    backgroundColor: COLORS.neutral.grey100,
  },
  charCounter: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  charCounterWarning: {
    color: COLORS.functional.warning,
  },
  charCounterError: {
    color: COLORS.functional.error,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  anonymousText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  submitButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  bottomPadding: {
    height: 40,
  },
});

export default WriteReviewScreen;
