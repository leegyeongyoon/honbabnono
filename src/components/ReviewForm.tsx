import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import reviewApiService from '../services/reviewApiService';

interface ReviewFormProps {
  visible: boolean;
  onClose: () => void;
  meetupId: string;
  meetupTitle: string;
  onReviewSubmitted?: () => void;
}

const REVIEW_TAGS = [
  '맛있었어요', '친근했어요', '시간이 아까웠어요', '다시 참여하고 싶어요',
  '분위기가 좋았어요', '음식이 별로였어요', '호스트가 친절했어요', '추천해요',
  '사진이 예뻤어요', '가격이 적당했어요', '가격이 비쌌어요', '재미있었어요'
];

const ReviewForm: React.FC<ReviewFormProps> = ({
  visible,
  onClose,
  meetupId,
  meetupTitle,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('알림', '평점을 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await reviewApiService.createReview(meetupId, {
        rating,
        comment: comment.trim(),
        tags: selectedTags
      });

      Alert.alert('완료', '리뷰가 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            onReviewSubmitted?.();
            handleClose();
          }
        }
      ]);
    } catch (error: any) {
      console.error('리뷰 작성 실패:', error);
      Alert.alert('오류', error.response?.data?.error || '리뷰 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setSelectedTags([]);
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={styles.ratingLabel}>평점</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Icon
                name="star"
                size={32}
                color={star <= rating ? COLORS.functional.warning : COLORS.neutral.grey300}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>
          {rating === 0 ? '평점을 선택해주세요' : `${rating}점`}
        </Text>
      </View>
    );
  };

  const renderTags = () => {
    return (
      <View style={styles.tagsContainer}>
        <Text style={styles.tagsLabel}>태그 (선택사항)</Text>
        <View style={styles.tagsGrid}>
          {REVIEW_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.selectedTagButton
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.selectedTagText
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>리뷰 작성</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || rating === 0}
            style={[
              styles.submitButton,
              (isSubmitting || rating === 0) && styles.submitButtonDisabled
            ]}
          >
            <Text style={[
              styles.submitButtonText,
              (isSubmitting || rating === 0) && styles.submitButtonTextDisabled
            ]}>
              {isSubmitting ? '등록 중...' : '등록'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 모임 정보 */}
          <View style={styles.meetupInfo}>
            <Text style={styles.meetupTitle}>{meetupTitle}</Text>
            <Text style={styles.meetupSubtitle}>이 모임은 어떠셨나요?</Text>
          </View>

          {/* 평점 */}
          {renderStars()}

          {/* 코멘트 */}
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>후기 (선택사항)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="모임에 대한 솔직한 후기를 남겨주세요"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              placeholderTextColor={COLORS.text.tertiary}
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>

          {/* 태그 */}
          {renderTags()}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  submitButtonTextDisabled: {
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  meetupInfo: {
    marginBottom: 32,
    alignItems: 'center',
  },
  meetupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  meetupSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  starsContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  commentContainer: {
    marginBottom: 32,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 8,
  },
  tagsContainer: {
    marginBottom: 32,
  },
  tagsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    backgroundColor: COLORS.neutral.white,
  },
  selectedTagButton: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  selectedTagText: {
    color: COLORS.primary.main,
    fontWeight: '500',
  },
});

export default ReviewForm;